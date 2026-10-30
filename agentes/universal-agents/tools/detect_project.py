#!/usr/bin/env python3
"""Read-only, evidence-backed stack hints from project manifests and source paths.

This scanner never executes project code and does not emit manifest values or file contents.
"""
import json
import os
import stat
import sys
from pathlib import Path

SKIP_DIRS = {".git", ".hg", ".svn", "node_modules", "vendor", ".venv", "venv", "target", "build", "dist", "coverage", "bin", "obj"}
MAX_FILES = 20000
MAX_MANIFEST_BYTES = 1_000_000


def scan_files(root):
    files = []
    reparse_point = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)

    def is_link_or_reparse(path):
        try:
            info = path.lstat()
            return path.is_symlink() or bool(getattr(info, "st_file_attributes", 0) & reparse_point)
        except OSError:
            return True

    def ignore_walk_error(_error):
        # Unreadable subtrees are omitted rather than aborting discovery.
        return None

    for current, dirnames, filenames in os.walk(root, topdown=True, followlinks=False, onerror=ignore_walk_error):
        current_path = Path(current)
        dirnames[:] = sorted(
            name for name in dirnames
            if name not in SKIP_DIRS and not is_link_or_reparse(current_path / name)
        )
        for name in sorted(filenames):
            path = current_path / name
            try:
                if is_link_or_reparse(path) or not path.is_file():
                    continue
                files.append(path)
                if len(files) > MAX_FILES:
                    raise ValueError(f"project contains more than {MAX_FILES} files; narrow the scan root")
            except OSError:
                continue
    return files


def read_json(path):
    if path.stat().st_size > MAX_MANIFEST_BYTES:
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
        return value if isinstance(value, dict) else {}
    except (OSError, UnicodeError, json.JSONDecodeError):
        return {}


def detect(root):
    root = Path(root).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("project root is not a directory")
    files = scan_files(root)
    rels = [path.relative_to(root).as_posix() for path in files]
    lower = {path.lower(): path for path in rels}
    evidence = {}

    def add(stack, paths):
        values = evidence.setdefault(stack, [])
        for path in paths:
            key = path.lower()
            if key in lower and lower[key] not in values:
                values.append(lower[key])

    php = [p for p in rels if p.lower().endswith(".php")]
    composer = [p for p in rels if p.lower().endswith("composer.json")]
    if php or composer:
        add("php", php[:3] + composer[:2])
    mysql_indicators = [p for p in rels if p.lower().endswith((".sql", "my.cnf"))]
    if mysql_indicators:
        add("database", mysql_indicators[:5])
    if php and any("jquery" in p.lower() for p in rels):
        add("jquery", [p for p in rels if "jquery" in p.lower()][:3])

    package_files = [p for p in rels if Path(p).name.lower() == "package.json"]
    package_data = [(p, read_json(root / Path(p))) for p in package_files[:100]]
    js_exts = (".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx")
    js_files = [p for p in rels if p.lower().endswith(js_exts)]
    if package_files or js_files:
        add("node", package_files[:5] + js_files[:3])
    if any(Path(p).suffix.lower() in {".ts", ".tsx"} for p in js_files):
        add("typescript", [p for p in js_files if Path(p).suffix.lower() in {".ts", ".tsx"}][:4])
    deps = {}
    for _, data in package_data:
        for group in ("dependencies", "devDependencies", "peerDependencies"):
            if isinstance(data.get(group), dict):
                deps.update({str(name).lower() for name in data[group]})
    for name in ("react", "vue", "@angular/core", "jquery", "vite", "next", "nuxt", "@sveltejs/kit"):
        if name in deps:
            add({"@angular/core": "angular", "@sveltejs/kit": "svelte"}.get(name, name), package_files[:5])
    workspaces = any(isinstance(data.get("workspaces"), (list, dict)) for _, data in package_data)
    manifest_names = {"package.json", "pyproject.toml", "composer.json", "pom.xml", "build.gradle", "build.gradle.kts", "pubspec.yaml"}
    manifest_paths = [p for p in rels if Path(p).name.lower() in manifest_names or p.lower().endswith((".csproj", ".fsproj"))]
    package_roots = {str(Path(p).parent).lower() for p in manifest_paths}
    monorepo_dirs = [p for p in rels if "/apps/" in f"/{p.lower()}" or "/packages/" in f"/{p.lower()}" or "/services/" in f"/{p.lower()}"]
    if workspaces or len(package_roots) > 1 or monorepo_dirs:
        add("monorepo", package_files[:5] + manifest_paths[:5] + monorepo_dirs[:5])

    python_files = [p for p in rels if p.lower().endswith(".py")]
    py_manifests = [p for p in rels if Path(p).name.lower() in {"pyproject.toml", "requirements.txt", "setup.py", "pipfile"}]
    if python_files or py_manifests:
        add("python", python_files[:3] + py_manifests[:3])
    py_text = "\n".join((root / p).read_text(encoding="utf-8", errors="ignore")[:MAX_MANIFEST_BYTES] for p in py_manifests[:8] if (root / p).is_file())
    for package, stack in (("django", "django"), ("fastapi", "fastapi"), ("flask", "flask")):
        if package in py_text.lower():
            add(stack, py_manifests[:3])

    java_files = [p for p in rels if p.lower().endswith(".java")]
    java_manifests = [p for p in rels if Path(p).name.lower() in {"pom.xml", "build.gradle", "build.gradle.kts"}]
    if java_files or java_manifests:
        add("java", java_files[:3] + java_manifests[:3])
    xml_text = "\n".join((root / p).read_text(encoding="utf-8", errors="ignore")[:MAX_MANIFEST_BYTES] for p in java_manifests[:8] if (root / p).is_file())
    if "spring-boot" in xml_text.lower() or "springframework.boot" in xml_text.lower():
        add("spring", java_manifests[:3])

    dotnet = [p for p in rels if p.lower().endswith((".csproj", ".fsproj", ".sln"))]
    if dotnet:
        add("dotnet", dotnet[:5])
    if any(p.lower().endswith((".cs", ".fs")) for p in rels):
        add("dotnet", [p for p in rels if p.lower().endswith((".cs", ".fs"))][:3])

    flutter = [p for p in rels if Path(p).name.lower() == "pubspec.yaml"]
    dart = [p for p in rels if p.lower().endswith(".dart")]
    if flutter or dart:
        add("flutter", flutter[:3] + dart[:4])
    android = [p for p in rels if p.lower().endswith(".gradle") or p.lower().endswith(".gradle.kts") or p.endswith("AndroidManifest.xml")]
    if android and (any("android/" in p.lower() for p in android) or any(p.lower().endswith(".kt") for p in rels)):
        add("android-native", android[:4] + [p for p in rels if p.lower().endswith((".kt", ".java"))][:3])
    ios = [p for p in rels if ".xcodeproj/" in p.lower() or p.lower().endswith((".swift", "podfile"))]
    if ios:
        add("ios-native", ios[:5])
    if "react-native" in deps or "expo" in deps:
        add("react-native", package_files[:4])
    if "tauri.conf.json" in lower or "electron" in deps:
        add("desktop", [p for p in rels if "tauri.conf.json" in p.lower() or Path(p).name.lower() == "package.json"][:5])
    if any(p.lower().endswith(".wpf") for p in rels) or any(".desktop" in p.lower() for p in rels):
        add("desktop", [p for p in rels if p.lower().endswith((".wpf", ".desktop"))][:4])
    pwa = [p for p in rels if Path(p).name.lower() in {"manifest.webmanifest", "service-worker.js", "service-worker.ts", "sw.js"}]
    if pwa:
        add("pwa", pwa[:4])

    api_files = [p for p in rels if any(term in p.lower() for term in ("openapi", "swagger", "/routes/api", "/api/", "controllers/"))]
    if api_files:
        add("api", api_files[:5])
    db_files = [p for p in rels if p.lower().endswith((".sql", "prisma/schema.prisma")) or "/migrations/" in p.lower()]
    sqlite_sources = []
    for p in rels:
        if p.lower().endswith((".py", ".js", ".ts", ".php", ".java", ".cs")):
            try:
                source = (root / p).read_text(encoding="utf-8", errors="ignore")[:MAX_MANIFEST_BYTES].lower()
            except OSError:
                continue
            if any(token in source for token in ("sqlite3", "sqlite_open", "sqliteconnection", "create table")):
                sqlite_sources.append(p)
    db_files.extend(sqlite_sources[:3])
    if db_files:
        add("database", db_files[:5])
    if php or python_files or java_files or dotnet or api_files:
        backend_paths = php[:2] + python_files[:2] + java_files[:2] + dotnet[:2] + api_files[:2]
        add("backend", backend_paths[:5])
    if js_files or any(p.lower().endswith((".html", ".vue", ".svelte")) for p in rels):
        frontend_paths = js_files[:3] + [p for p in rels if p.lower().endswith((".html", ".vue", ".svelte"))][:2]
        add("frontend", frontend_paths[:5])
    if evidence.get("frontend") and evidence.get("backend"):
        add("full_stack", evidence["frontend"][:2] + evidence["backend"][:2])
    if any(Path(p).name.lower() in {"makefile", "justfile", "cargo.toml", "go.mod"} for p in rels):
        cli_paths = [p for p in rels if Path(p).name.lower() in {"makefile", "justfile", "cargo.toml", "go.mod"}]
        add("cli", cli_paths[:5])

    return {
        "project_root": str(root),
        "execution": "read_only_no_project_code_executed",
        "detected_hints": [{"id": key, "evidence_paths": sorted(value)} for key, value in sorted(evidence.items())],
        "limits": ["Manifest/path hints do not prove installed dependencies, active runtime, or production architecture.", "No project files were executed; secret-like file contents and values are not emitted.", "Host permissions and user authorization are not inferred."],
    }


def main(argv):
    if len(argv) != 2:
        print("usage: detect_project.py PROJECT_ROOT", file=sys.stderr)
        return 2
    try:
        print(json.dumps(detect(argv[1]), ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError) as exc:
        print(json.dumps({"status": "INVALID", "error": str(exc)}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

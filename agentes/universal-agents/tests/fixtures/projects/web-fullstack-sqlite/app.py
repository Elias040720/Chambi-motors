"""Tiny local-only HTTP + SQLite fixture for integration-contract evaluation."""
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = Path(os.environ.get("UA_FIXTURE_DB", str(ROOT / "inventory.sqlite"))).resolve()
PORT = int(os.environ.get("UA_FIXTURE_PORT", "8765"))


def connect():
    DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB, timeout=3)
    db.execute("CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 100), quantity INTEGER NOT NULL CHECK(quantity >= 0))")
    return db


class Handler(BaseHTTPRequestHandler):
    server_version = "UniversalAgentsFixture/1"

    def send_json(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        if self.path == "/":
            raw = (ROOT / "index.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        elif self.path == "/api/items":
            with connect() as db:
                rows = db.execute("SELECT id, name, quantity FROM items ORDER BY id").fetchall()
            self.send_json(200, {"items": [{"id": r[0], "name": r[1], "quantity": r[2]} for r in rows]})
        else:
            self.send_json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/api/items":
            return self.send_json(404, {"error": "not_found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 4096:
                return self.send_json(413, {"error": "invalid_body_size"})
            data = json.loads(self.rfile.read(size))
        except (ValueError, json.JSONDecodeError):
            return self.send_json(400, {"error": "invalid_json"})
        if not isinstance(data, dict) or set(data) != {"name", "quantity"}:
            return self.send_json(400, {"error": "invalid_shape"})
        name, quantity = data["name"], data["quantity"]
        if not isinstance(name, str) or not name.strip() or len(name.strip()) > 100 or type(quantity) is not int or quantity < 0 or quantity > 100000:
            return self.send_json(422, {"error": "invalid_item"})
        try:
            with connect() as db:
                cur = db.execute("INSERT INTO items(name, quantity) VALUES (?, ?)", (name.strip(), quantity))
                row = db.execute("SELECT id, name, quantity FROM items WHERE id = ?", (cur.lastrowid,)).fetchone()
            return self.send_json(201, {"item": {"id": row[0], "name": row[1], "quantity": row[2]}})
        except sqlite3.Error:
            return self.send_json(500, {"error": "storage_error"})

    def do_PATCH(self):
        parts = self.path.split("/")
        if len(parts) != 4 or parts[1:3] != ["api", "items"] or not parts[3].isdigit():
            return self.send_json(404, {"error": "not_found"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 4096:
                return self.send_json(413, {"error": "invalid_body_size"})
            data = json.loads(self.rfile.read(size))
        except (ValueError, json.JSONDecodeError):
            return self.send_json(400, {"error": "invalid_json"})
        quantity = data.get("quantity") if isinstance(data, dict) else None
        if not isinstance(data, dict) or set(data) != {"quantity"} or type(quantity) is not int or quantity < 0 or quantity > 100000:
            return self.send_json(422, {"error": "invalid_quantity"})
        with connect() as db:
            cur = db.execute("UPDATE items SET quantity = ? WHERE id = ?", (quantity, int(parts[3])))
            if cur.rowcount != 1:
                return self.send_json(404, {"error": "not_found"})
            row = db.execute("SELECT id, name, quantity FROM items WHERE id = ?", (int(parts[3]),)).fetchone()
        return self.send_json(200, {"item": {"id": row[0], "name": row[1], "quantity": row[2]}})

    def log_message(self, fmt, *args):
        # Avoid request bodies, host names and arbitrary user values in console logs.
        print("fixture-http", args[0] if args else "request")


if __name__ == "__main__":
    with connect():
        pass
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()

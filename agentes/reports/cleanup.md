# Limpieza y recuperación

Fecha: 2026-10-24. Antes de mover los árboles originales se compararon todos sus archivos, tamaño y SHA-256 con `baseline-manifest.json`; las tres comparaciones pasaron. El manifiesto usa SHA-256 por archivo y huella de árbol ordenada documentada allí. Los 124 archivos de `archive/received/baseline-20261024-010047/` se verificaron de nuevo tras mover y están marcados read-only.

## Fuentes recibidas movidas a `archive/legacy/`

| Origen | Destino | Archivos | Huella SHA-256 agregada |
|---|---|---:|---|
| `agentes/` | `archive/legacy/template-agentes/` | 46 | `e402054818480092bb53e3a72e6bbd53434e6fcb1e1e71cef9170cc4ca584b04` |
| `release_v2/` (incluye `release_v2/release_v2/`) | `archive/legacy/release_v2/` | 49 | `434a14d1cd37f2e6f588712a4adb5945fb9cc7e086625b7f5e8e5b006212130d` |
| `release_v3_1/` | `archive/legacy/release_v3_1/` | 29 | `1a80c7a8e1d77c8896e34cea23e76e79c0dff224dfe8ebe20ab82e7d3d9aee5b` |

Las 46 entradas de `agentes/` eran byte-identical a las 46 correspondientes del template `release_v2/release_v2/`; se comprobó antes del movimiento. Las tres rutas origen ya no existen en la raíz. No había repositorio Git y no se hallaron symlinks/junctions en las fuentes al inventariar.

## Cachés V4 retiradas

Se eliminaron 18 `.pyc` generados por imports/tests solo del árbol canónico activo y se retiraron sus directorios `__pycache__` al quedar vacíos. Las copias recibidas en `archive/` mantienen los bytes originales. SHA-256 previos:

| Ruta relativa activa | SHA-256 |
|---|---|
| `universal-agents/tests/__pycache__/__init__.cpython-314.pyc` | `1207e57b83fa6b3d6d3b6f9075b57d1efcbad918f3ba41d2be47a8ab01b3f757` |
| `universal-agents/tests/__pycache__/__init__.cpython-39.pyc` | `b9161e25708c902459f6ba0f99262f0f7eaf1589ac789f961cd66ad68ba97cef` |
| `universal-agents/tests/__pycache__/test_core.cpython-39.pyc` | `34617a18f5a23497c2f0bdabb9702a6dbe990c328a8a1e298a8e5eecebd3b480` |
| `universal-agents/tests/unit/__pycache__/__init__.cpython-314.pyc` | `5449c70e08654b80567292fd683c3de3e1bc46b751ad3d47b5fd02a7618da40d` |
| `universal-agents/tests/unit/__pycache__/__init__.cpython-39.pyc` | `c049e84c71571b83c4574bcd4b023d1919104e54cb7954abdabc23b7690faf72` |
| `universal-agents/tests/unit/__pycache__/test_eval.cpython-39.pyc` | `ac18dcd1d335ddb05e4f77db943b221839c4177715acd791b0e1db59c1dfacd0` |
| `universal-agents/tests/unit/__pycache__/test_installer.cpython-39.pyc` | `2e6f1fa51a84b066dd7f5d171a3480e81a35168ede4e7d7acb53880af98409b5` |
| `universal-agents/tests/unit/__pycache__/test_profiles.cpython-314.pyc` | `f6a2fcf04d7a8ef026b28dacc79fb2c4f06ffbee55d500b64695bd1d7b9257ed` |
| `universal-agents/tests/unit/__pycache__/test_profiles.cpython-39.pyc` | `bba546f70560ea441b0fa2e122816a2e09d98ac66fd8f8d235a516de6b2c308c` |
| `universal-agents/tests/unit/__pycache__/test_roles.cpython-39.pyc` | `9f49122ae2b3e6dbd595ca7614b4e493e44b87c754c1b0b0259604d7112122f0` |
| `universal-agents/tooling/build/__pycache__/generate_dist.cpython-39.pyc` | `f2bd9a707ad9a97bd2a13681026ed06dee216408523de4c1a954febb9ba9ff04` |
| `universal-agents/tooling/eval/__pycache__/evaluate_records.cpython-39.pyc` | `91f725c22265ae7ad498ba3ca5e06f2c049f1f4b6acb140c60630a6a4af5f302` |
| `universal-agents/tooling/install/__pycache__/installer.cpython-314.pyc` | `76f7d063e2ac4c2909066df3b9f459f6051d2f7e240d8c5d4cca6d81dea388c1` |
| `universal-agents/tooling/install/__pycache__/installer.cpython-39.pyc` | `33cf67abfbb388287f65e30100da08ffde7894ca1200c1a61a8936bdfff3cf8a` |
| `universal-agents/tooling/validate/__pycache__/validate_dist.cpython-39.pyc` | `51a643be7c5deff46ce26c56e5607ebe220486bea35048515d42f3e46b1dc85f` |
| `universal-agents/tools/__pycache__/route_request.cpython-39.pyc` | `73b63219fd9363138f9acff0d4f309a8382690cb982130d54f9883395423f9e9` |
| `universal-agents/tools/__pycache__/validate_package.cpython-39.pyc` | `af9f9f92a9a5e7b4591313552c69468d4e8e2d840d17ceb658b41c60b914a49f` |
| `universal-agents/tools/__pycache__/verify_evidence.cpython-39.pyc` | `290da306352173272efbd19e3da053ec5e077b085604673c71dcb3a4f73e2544` |

## Builds intermedios retirados

Los diez paquetes generados durante iteraciones se validaron contra sus manifiestos individuales (paths, sizes y SHA-256) antes de retirar los directorios. No eran fuentes de usuario; `dist/` conserva el build final y cada versión puede reproducirse desde la fuente canónica.

| Árbol temporal | Host | Archivos incluyendo manifest | Huella de árbol |
|---|---|---:|---|
| `archive/builds/initial-dist/` | antigravity-cli | 41 | `d371cb5857846411b68c2e1af57db12a337bd4ac82c957bb8e815ba5b25f637f` |
| `archive/builds/initial-dist/` | antigravity-ide | 41 | `09317f0e3ef1ce4e905cf6ff916b4666fd075ebace996a13bf862f3deee7ff7d` |
| `archive/builds/initial-dist/` | claude-code | 40 | `37783e209dd9a2a2e8fcb2a41ad2f3541f7406df219095638b9bb2d69dd93474` |
| `archive/builds/initial-dist/` | codex | 40 | `affefde19ae25d1a5127b02314944fcab41d291e8459352c410a1cd70bb93019` |
| `archive/builds/initial-dist/` | opencode | 40 | `2ece5ee8601d7e5d165bc9e6ef8a55b668a42789dd595f55e44025ef397964e4` |
| `archive/builds/previous/` | antigravity-cli | 41 | `d628cc25fe4df6f78cb79eea80ab0155839125731dee81bbfec7539650538d17` |
| `archive/builds/previous/` | antigravity-ide | 41 | `c217d4291bc9664d26a7476ee865e2a8795d8e88be0d57baa86e5a4325bc4738` |
| `archive/builds/previous/` | claude-code | 40 | `8b9235a1f89580fb890ee5c5c6969df1dafe29af58060f9857a92e91469e3c3d` |
| `archive/builds/previous/` | codex | 40 | `8cbe1566be825f53d020c3ebf18754114176b4cf55087f7fae98c4b728d967d1` |
| `archive/builds/previous/` | opencode | 40 | `581be0185f07fcd68ee13092c3f8b4fe5b045bb45eb5f5ce1e1fc937dca90a4a` |

No se escribieron perfiles globales, no se descargó ni instaló código de terceros, y no se habilitaron hooks/MCP.

## Smoke temporal de Claude Code

Se copiaron los 40 archivos físicos del paquete validado `dist/claude-code/` a un directorio temporal cuyo nombre tenía prefijo `ua-claude-smoke-`. Tras una configuración MCP vacía inválida (rechazada por CLI antes de arrancar), se repitió con `{ "mcpServers": {} }`, `--bare`, permisos `plan`, solo herramientas de lectura y sin persistencia de sesión. La CLI contestó que no estaba autenticada; no hizo llamada de modelo. Ambos directorios temporales se retiraron tras la prueba; los hashes del paquete fuente copiado están en `reports/build-manifest.json`.

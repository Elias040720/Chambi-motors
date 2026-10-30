# Fixture full-stack web: Inventory Lite

Fixture Python stdlib + SQLite efímero + HTML/JavaScript nativo. No third-party packages or external service. Para una integración manual:

1. En una carpeta temporal, define `UA_FIXTURE_DB=<ruta-temporal>/inventory.sqlite` y ejecuta `python app.py`.
2. Abre `http://127.0.0.1:8765`; verifica estado vacío, crea un producto, actualiza cantidad y recarga.
3. Con DevTools revisa request/response, consola y los viewports 390×844, 768×1024 y 1440×900.
4. Navega con teclado: foco visible, labels, envío por botón, mensajes de error y recuperación. Los pasos automatizados en `tests/unit/test_product_contract.py` prueban HTTP/API/SQLite con datos sintéticos, no visualidad.
5. Cierra el proceso y borra solo el DB/carpeta temporal creada para la prueba.

Credenciales/auth, multiusuario, CSRF y deploy están fuera del scope del fixture; no usar en red no confiable ni con datos reales. Un test HTTP verde no cuenta como revisión visual o accesibilidad humana.

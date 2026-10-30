# Aceptación web y móvil V4.2

## Fixture web full-stack

`tests/fixtures/projects/web-fullstack-sqlite/` es un fixture propio y aislado que usa Python stdlib/HTTP, SQLite temporal y HTML nativo. Escenarios: estado vacío, lista, alta, rechazo de datos inválidos, update, ID/ruta desconocidos y persistencia; corre solo en loopback con DB temporal, no toca bases del usuario.

`tests.unit.test_product_contract`: 3 pruebas pasaron en ambos Python 3.9 y 3.14. Un smoke visual real usó una pestaña temporal del navegador embebido a `127.0.0.1`; se observó formulario vacío, alta `Reusable bottle: 0`, estado de una fila; al ajustar viewport a 390×844 la página no mostró overflow horizontal y el control de nombre mantuvo foco azul al presionar Tab. Se descubrió y reparó un bug: `event.currentTarget` se accedía tras `await`, por lo que el POST persistía pero la UI capturaba un error de TypeError; se guardó el formulario antes del await y se repitió con base temporal limpia. Las pestañas se cerraron y el viewport se restauró.

Cobertura y límite: UI visual y teclado básico observados manualmente; no es auditoría de lector de pantalla, WCAG completa, browser matrix ni Core Web Vitals. El test de contraste verifica tokens estáticos, no UI renderizada. No se afirma visualmente revisado ningún producto de usuario.

Los procesos de fixture se detuvieron. La política de ejecución rechazó las órdenes de borrado de dos directorios temporales de prueba; queda `C:\Users\ABEL\AppData\Local\Temp\ua-v42-visual-_pj2pcja` y `...\ua-v42-visual-retest-rutt1s5j` con solamente owner.json y SQLite sintéticas. No contiene secretos ni datos del proyecto. La app está cerrada; se pueden borrar luego desde Explorer. No quedaron servidores fixture ejecutándose.

También permanecen los proyectos smoke `C:\Users\ABEL\AppData\Local\Temp\ua-v42-codex-smoke-20261025` y `C:\Users\ABEL\AppData\Local\Temp\ua-v42-claude-smoke-20261025`; contienen README sintéticos y una skill/definición de agente copiada para el test, sin secretos. No hay procesos CLI activos sobre ellas.

## Móvil/Flutter

`tests/fixtures/projects/mobile-flutter-offline/` agrega un ejemplo Flutter de lista offline, drafts y retry/error con escenarios de widget `loading`, `empty`, alta, fallo de conexión, reintento y borrador preservado. Se preserva autodetección y no se impone a otros stacks. Dart/Flutter/ADB/emuladores no están instalados; `flutter test` y dispositivos Android/iOS son NOT RUN, no PASS. Protocolo: `cd tests/fixtures/projects/mobile-flutter-offline; flutter pub get; flutter test`; después probar en dispositivo/emulador con interrupción de red y revisar accesibilidad nativa. No se descargó SDK.

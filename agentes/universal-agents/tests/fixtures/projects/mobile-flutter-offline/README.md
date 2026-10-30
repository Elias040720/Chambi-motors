# Fixture móvil Flutter: offline y recuperación

Este fixture usa Flutter SDK y `flutter_test` del SDK; no añade paquetes de terceros. Test automatizado diseñado: estado vacío, creación, error offline, retry y conservación del texto al fallar un guardado.

## Ejecución cuando Flutter ya esté disponible

```powershell
cd tests/fixtures/projects/mobile-flutter-offline
flutter test
flutter run -d <emulador-o-dispositivo-local>
```

En el emulador/dispositivo recorre carga, lista vacía, crear una tarea, corta/red intermitente, reintenta y vuelve con navegación de sistema; rota la pantalla y valida texto escalado/lector de pantalla si están disponibles. Registra versión Flutter, OS/device, pasos, output y capturas reales. Un Android Emulator prueba Android; no prueba iOS. Para iOS se requiere macOS y simulator/XCTest; `flutter test` de widgets tampoco sustituye recorrido nativo/humano.

En este workspace Flutter, Dart, ADB, emulator y Xcode no están instalados; no se ejecutó `flutter pub get`, test ni app, ni se descargó SDK. La app depende de los componentes del Flutter SDK cuando se ejecute luego.

# CHAMBI MOTORS

Plataforma de un taller: administrador en React Native/Expo Android e iOS, panel web de apoyo y portal privado del cliente. Presupuestos en PEN; sin pagos, facturación ni registro público. La landing original permanece identificada como demo visual y separada de los expedientes reales.

## Arranque local en Windows

Requisitos: Node 22.13 o superior compatible (probado 22.23.2), pnpm 11 y Docker Desktop activo. Desde la raíz:

```powershell
pnpm install --frozen-lockfile
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
# Edita ADMIN_PASSWORD en .env.local: al menos 12 caracteres, solo para desarrollo.
docker compose up -d database
pnpm db:migrate
pnpm dev
```

El panel está en `http://localhost:3000/admin`. La base local escucha solo en `127.0.0.1:54329`; los valores de conexión de ejemplo corresponden exclusivamente a ese contenedor. Web y scripts leen `.env.local` de la raíz; las variables del proceso tienen prioridad. No agregues archivos de entorno a Git ni los copies a imágenes Docker.

`LOCAL_AUTH_STUB=true` crea los roles de Auth simulados en PostgreSQL local. Es una dependencia de pruebas, no un servidor Supabase real. El migrador rechaza ese modo con `NODE_ENV=production`. La contraseña local no permite iniciar sesión en producción.

## Android e iPhone

```powershell
if (!(Test-Path apps/mobile/.env)) { Copy-Item apps/mobile/.env.example apps/mobile/.env }
# Edita EXPO_PUBLIC_API_URL con la IP LAN del servidor, por ejemplo http://192.168.1.10:3000
pnpm mobile
```

El teléfono y la computadora deben poder comunicarse. Abre el proyecto con una versión compatible de Expo Go o un development build. `localhost` en un teléfono apunta al propio teléfono; un emulador Android puede usar el host del emulador o un mapeo de puerto. Solo las compilaciones de desarrollo admiten HTTP; una compilación de distribución exige HTTPS.

Para probar el enlace en dos dispositivos, configura también `NEXT_PUBLIC_APP_URL` en `.env.local` con esa misma URL LAN accesible y abre el panel usando esa URL. Ese valor determina el destino de los enlaces y el origen web autorizado. Reinicia el servidor después de cambiarlo. El firewall de la computadora debe permitir el puerto únicamente en la red privada de prueba.

Para compilar localmente Android se necesita Android SDK/emulador o dispositivo: `pnpm --filter @chambi/mobile android`. iOS Simulator exige macOS/Xcode. Los perfiles de EAS están en `apps/mobile/eas.json`; el propietario debe vincular su proyecto Expo, configurar `projectId`, credenciales y firma antes de usar EAS Build/Update. No se crearon cuentas ni binarios firmados. Ver [guía móvil](apps/mobile/README.md) para uso y aceptación en dispositivo.

## Recorrido del taller

1. Inicia sesión y registra cliente, vehículo y recepción. El ingreso nativo conserva borrador, checklist y foto local hasta confirmar envío. Una placa puede tener varias órdenes.
2. En diagnóstico, crea tareas y una versión del presupuesto. La aprobación presencial requiere constancia; cambiar alcance/importes crea otra versión y exige nueva decisión.
3. Registra bloqueos y ETA con motivo. Solicitar/prometir una pieza mantiene el bloqueo; solo recepción física conforme lo resuelve. Completar tareas cambia el avance por su peso verificado.
4. Completa tareas y entra a QA. Una falla genera tareas de retrabajo y regresa a reparación. Solo QA aprobado permite marcar listo; la entrega registra resumen y garantía y cierra la OT.
5. Genera/copia/comparte el enlace mediante la intención nativa. Regenerarlo revoca los anteriores. El cliente recibe solo la proyección autorizada de esa orden, fotos habilitadas y sus presupuestos. Los enlaces y fotos se invalidan al revocarlos.

La lectura nativa conserva una caché fechada; los borradores y operaciones pendientes viven en SQLite dentro del almacenamiento privado de la app. Las solicitudes de resultado incierto conservan cuerpo, versión y UUID y se reintentan explícitamente; nunca se anuncian sincronizadas antes de respuesta. SQLite no se presenta como cifrado propio. Cerrar sesión intenta revocar la sesión del servidor y elimina caché/borradores/fotos; un fallo parcial se comunica.

## Pruebas

```powershell
pnpm exec playwright install chromium
pnpm lint
pnpm typecheck
pnpm test
pnpm test:rls
pnpm test:e2e
pnpm build
pnpm --filter @chambi/mobile exec expo install --check
pnpm --filter @chambi/mobile exec expo export --platform android
pnpm --filter @chambi/mobile exec expo export --platform ios
```

RLS usa fixtures transaccionales que se revierten. E2E necesita el PostgreSQL local y permiso para crear bases: crea una base desechable con nombre aleatorio, aplica todas las migraciones, inicia su servidor en el puerto 3100 y elimina únicamente esa base y su carpeta temporal de fotos al terminar. No reutiliza el servidor de desarrollo ni modifica la base del taller. El modo OTP de prueba se habilita solo en ese servidor; no envía SMS. Las capturas están en `test-results/` y se excluyen de Git. Exportar Expo demuestra empaquetado JavaScript, no ejecución nativa ni APK/IPA.

## Conectar servicios en pruebas dedicadas

Estas tareas requieren cuentas y secretos del propietario. El código de integración está preparado; no se contactaron proveedores desde pruebas.

- Supabase: proyecto PostgreSQL con migraciones aplicadas sin stub; URL, anon key y conexión DB del servidor. Desactiva el registro abierto, crea una única cuenta en Auth y provisiona su UUID en `admin_profiles`. El índice de la tabla admite un solo administrador. Configura `ADMIN_EMAIL` y `NEXT_PUBLIC_APP_URL` HTTPS; agrega `/admin/recover` a las URL de recuperación permitidas. El login verifica el usuario con Auth y su perfil antes de emitir una sesión opaca del servidor de una hora.
- Storage: crea un bucket privado, configura `SUPABASE_MEDIA_BUCKET`, la service role solo en servidor y `MEDIA_SIGNING_SECRET` aleatorio de al menos 32 caracteres. Nunca pongas service role en Expo ni en variables públicas. Las imágenes se recomprimen y se retiran metadatos; el servidor entrega las fotos permitidas mediante URLs firmadas por cinco minutos y una cookie de orden vigente.
- OTP opcional: `OTP_PROVIDER=twilio`, cuenta/token y Verify Service SID. Solo entonces aparece la aprobación remota en producción. El envío exige acción del cliente y usa el celular ya registrado; no se toman números arbitrarios del navegador. Sin proveedor, funciona la constancia presencial y el portal informa ese canal. `ENABLE_TEST_OTP` se ignora en producción.
- Contacto real, horario, textos de privacidad, plazos de retención y plantillas se configuran desde Ajustes. La retención configurable expresa la política operativa; no hay borrado automático de historiales append-only. La exportación/eliminación de datos debe definirse y ejecutarse conforme al procedimiento del taller antes de operar con información real.
- El proxy de producción debe redactar `/t/*`, cookies y autorizaciones en sus registros, limitar cuerpos y terminar TLS. Solo activa `TRUST_PROXY=true` cuando el proxy sustituya de forma confiable `x-forwarded-for`.

No se hicieron push, merge, despliegues, publicaciones móviles ni envíos reales. Estado y verificaciones: [registro de ejecución](docs/EXECUTION_STATUS.md). Diseño/contratos: [arquitectura](docs/ARCHITECTURE.md). Controles y límites: [seguridad](docs/SECURITY.md).

## Piloto controlado, solo sintético

La validación local no habilita datos de clientes. Crea un proyecto Supabase y un servidor HTTPS exclusivos de pruebas, sin copiar bases del taller. Copia `.env.pilot.example` a `.env.pilot.local` y completa sus valores fuera de Git. La comprobación offline valida configuración, no conectividad ni permisos remotos.

```powershell
pnpm pilot:check .env.pilot.local
pnpm pilot:migrate .env.pilot.local
pnpm pilot:rls .env.pilot.local
pnpm pilot:build .env.pilot.local
pnpm pilot:start .env.pilot.local
```

Los comandos de piloto cargan explícitamente ese archivo y verifican sus controles, preservando `.env.local`. Compila con la URL HTTPS de piloto: Next incorpora las variables públicas al build. PostgreSQL exige certificado y hostname verificados; usa la URL sin opciones SSL o con `sslmode=verify-full`. Se rechazan opciones que sustituyan esa verificación. Estos comandos no publican un servidor.

Desactiva signup público en Supabase, provisiona una sola cuenta Auth y configura recuperación hacia `https://TU-HOST/admin/recover`. Tras las migraciones, en la misma sesión del SQL Editor del proyecto **dedicado**, ejecuta estos ajustes con tus valores y luego el contenido de `supabase/pilot-setup.sql`:

```sql
select set_config('app.pilot_admin_email', 'CORREO_AUTH_PROVISIONADO', false);
select set_config('app.pilot_bucket', 'pilot-work-order-media', false);
select set_config('app.pilot_confirm_synthetic', 'true', false);
```

El script manual provisiona perfil y bucket privado WebP de 8 MB; aborta sin confirmación o con otro administrador. No se ejecutó remotamente. Verifica login/recuperación, denegación anónima del bucket, carga/lectura autorizada, revocación y otra sesión sin permisos. Service role y DATABASE_URL pertenecen solo al servidor. Mantén OTP apagado y constancia presencial. Twilio requiere autorización explícita y `PILOT_ALLOW_COMMERCIAL_MESSAGES=true`; las pruebas no envían SMS.

Configura únicamente `EXPO_PUBLIC_API_URL` HTTPS y `EAS_PROJECT_ID` real en el entorno EAS correspondiente. Nunca subas el archivo del servidor a Expo. `.easignore` en la raíz excluye secretos, logs, copias de agentes y artefactos locales. Tras vincular cuenta/proyecto y revisar el archivo que EAS subirá, desde `apps/mobile`:

```powershell
pnpm dlx eas-cli@26.0.0 login
pnpm dlx eas-cli@26.0.0 init
pnpm dlx eas-cli@26.0.0 build --profile development --platform android
pnpm dlx eas-cli@26.0.0 build --profile development-simulator --platform ios
pnpm dlx eas-cli@26.0.0 build --profile preview --platform all
```

Son pasos pendientes del propietario; no se inició ningún trabajo EAS. Los builds pueden consumir recursos de la cuenta. `development` usa identificador `.dev` y `preview`, `.pilot`, ambos internos. iOS físico requiere firma de Apple y dispositivos registrados; el simulador necesita macOS. El piloto bloquea HTTP/ATS permisivo, no solicita micrófono y Android desactiva backups. Los manifests/configuración están comprobados, pero esos controles todavía requieren APK/IPA instalado.

Antes de admitir clientes: instalar builds en Android/iPhone, comprobar cámara/galería y permiso denegado, SQLite/foto tras cierre y reinicio, SecureStore/logout, compartir/navegar en otro dispositivo, modo avión/reconexión, reintento y conflicto de versión. Repetir el flujo del taller en dos sesiones con datos inventados. Resolver los avisos pendientes del tooling y registrar Auth/Storage, TLS/proxy, backups/recuperación y política de retención. Solo entonces revisar los controles y autorizar datos reales. No hay autorización de producción.

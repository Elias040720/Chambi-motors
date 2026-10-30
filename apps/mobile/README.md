# App nativa CHAMBI MOTORS

Ejecuta `pnpm mobile` desde la raíz. Copia `.env.example` a `.env` y cambia `EXPO_PUBLIC_API_URL` por la dirección LAN real del servidor. El teléfono y la computadora deben poder comunicarse. El backend requiere PostgreSQL migrado y las variables de autenticación descritas en el README raíz. Solo las compilaciones de desarrollo admiten HTTP; los binarios de distribución requieren HTTPS.

La aplicación usa React Native y controles nativos, Expo Router, TanStack Query, SQLite y SecureStore. El servidor decide permisos, conflictos, aprobaciones y transiciones. El cliente no confirma cambios por anticipado.

## Uso

1. Inicia sesión y registra un ingreso: cliente, vehículo, motivo/checklist y foto opcional. Puedes salir de esa pantalla y recuperar el borrador local. La foto se copia a almacenamiento de la app antes de subirla.
   Al elegir un cliente registrado puedes reutilizar uno de sus vehículos, con placa, marca, modelo, año y kilometraje precargados; la recepción crea una nueva OT en ese historial. El VIN es opcional y se incluye en el resumen antes de enviar.
2. Confirma el ingreso con conexión. Si la foto falla después de guardar la orden, reintenta desde el mismo borrador: se conserva el identificador de orden y la clave de idempotencia para evitar crear otra OT.
3. Abre la orden para agregar tareas, presupuestos y repuestos, registrar constancias presenciales, ETA, bloqueos y QA. Los botones de etapa solicitan confirmación; el servidor valida precondiciones. Una promesa de repuesto no equivale a recepción.
   Las tareas admiten prioridad alta/media/baja y un requisito previo dentro de la misma OT. Se ordenan por prioridad respetando primero las dependencias. No se permite completar una tarea con su requisito pendiente ni reabrir un requisito con tareas dependientes completadas.
4. Genera el enlace privado y copia/compártelo por el sistema o WhatsApp. Se abre una intención del teléfono: la app no envía mensajes sola.
5. En QA, las verificaciones no marcadas son fallas explícitas. Después de aprobar QA, marca listo y registra la entrega con resumen y garantía.

La caché de lectura muestra su fecha cuando falla la consulta. Los cambios pendientes conservan cuerpo, versión y UUID en SQLite para reintentar exactamente la misma operación al recuperar conexión; requieren confirmación del administrador. Las notas y fotos pendientes son locales hasta que el servidor responde. Un conflicto obliga a actualizar y revisar el estado, sin sobrescribir otra edición.

El panel diferencia órdenes con ETA superada y órdenes cuya ETA vence en las próximas 24 horas, además de bloqueadas, pendientes de aprobación y listas para entrega. Los conteos se calculan únicamente sobre órdenes consultadas y fechas guardadas; una orden sin ETA no se cuenta como atrasada ni por vencer. El avance depende de tareas verificadas y no aumenta con el reloj.

Los tokens se guardan en SecureStore; no se guardan en SQLite. Los borradores, fotos y caché usan el almacenamiento privado de la app, con copia de seguridad Android desactivada. SQLite no se anuncia como cifrado de aplicación. Protege el teléfono con bloqueo del sistema, evita equipos compartidos y cierra sesión para borrar esos datos. Los borradores no se sincronizan con terceros ni se envían automáticamente.

## Verificación

`pnpm --filter @chambi/mobile typecheck`, ESLint y exportación JavaScript de Expo se ejecutan desde el workspace. La exportación valida empaquetado; no produce APK/IPA ni demuestra funcionamiento de cámara, teclado, permisos, SQLite o Share en hardware.

Prueba de aceptación nativa pendiente de dispositivo/emulador:

1. Abrir la app Android/iOS, denegar cámara y comprobar mensaje; permitir cámara y guardar una foto de prueba.
2. Cortar conectividad, completar un borrador y reiniciar la app. Confirmar que el borrador y su foto siguen disponibles y que ninguna orden se presentó como sincronizada.
3. Restablecer red, confirmar una sola OT, simular respuesta perdida y reintentar sin duplicarla. Ver la misma OT en otro navegador mediante el enlace privado.
4. Completar tareas, presupuesto/decisión presencial, repuesto prometido/recibido, QA fallido/retrabajo/aprobado y entrega. Confirmar que el portal refleja los eventos reales y no muestra notas privadas.
5. Revocar el enlace y comprobar que el navegador no abre orden/fotos. Cerrar sesión y comprobar que caché, borradores y fotos locales se eliminan.

No se ejecutó esta aceptación en hardware ni simulador. Android requiere SDK/emulador o teléfono y development build; iOS Simulator requiere macOS/Xcode. Los perfiles EAS están preparados, pero vincular proyecto EAS, credenciales, firma y distribución requiere la cuenta del propietario. EAS Update necesita vincular `projectId` y URL del proyecto antes de habilitarse.

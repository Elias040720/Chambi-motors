# CM-009 + CM-006 — Especificación para integrar en CHAMBI MOTORS

**Estado:** diseño aprobado para piloto sintético; implementación en repositorio **pendiente**.  
**Producto:** un taller, una cuenta interna de administrador, app Android/iPhone y web privada sin cuenta para el cliente.  
**Decisiones de Abel:** (1) recuperación del enlace por teléfono verificado en recepción; (2) aprobación del presupuesto por cliente o representante previamente registrado y verificado.  
**Exclusiones:** no pagos, SUNAT, facturación, uso de clientes reales, despliegue, push/merge ni integraciones de mensajería comercial en este corte.

## 1. Contratos de negocio cerrados

### 1.1 Contactos y personas autorizadas

- Una persona/contacto puede tener permiso `view_progress` (consultar estado) y, si el administrador lo delega, `approve_quote` (aprobar presupuesto). **No son lo mismo.**
- La relación es con **una orden de trabajo**, no con la placa de forma indefinida. Una persona que usó un vehículo antes no obtiene acceso a nuevas órdenes automáticamente.
- En recepción, el administrador verifica que el teléfono corresponde al contacto por un procedimiento documentado (preferentemente OTP a ese número; si se usa prueba presencial controlada, registrar evidencia y alcance). Escribir un número no equivale a verificarlo.
- Registrar fecha, método, operador y evidencia mínima de verificación; separar el vínculo cliente/autorizante de la titularidad registral del vehículo.
- Un representante puede ser autorizante **solo** si fue registrado por el administrador, se verificó su identidad y su teléfono, y se documentó la delegación para esa OT. Cambios de contacto se auditan, revocan accesos anteriores y no se realizan desde un enlace perdido.
- El acceso por enlace de seguimiento es de **lectura** y no autoriza gastos por sí solo.

### 1.2 Recuperación con placa

La web pide la placa. Si existe **exactamente una OT activa y elegible** vinculada a un contacto principal `view_progress` con teléfono verificado, el backend manda un código a ese contacto. Si no existe o hay ambigüedad, ofrece derivación asistida al taller **sin revelar si existe el expediente**. Jamás presenta propietario, número completo, modelo, estado ni recuento de OTs antes de verificar.

**Ciclo:**

1. `POST /portal/recover/request` con placa y contexto antifraude.
2. Responder mensaje constante: `"Si existe una orden elegible, enviaremos instrucciones al contacto registrado."` y un identificador aleatorio de solicitud **independiente de la existencia de la OT**.
3. Aplicar cuotas por origen/dispositivo, placa y teléfono objetivo; no causar bloqueo permanente del cliente ante ataques.
4. OTP de seis dígitos generados criptográficamente, duración inicial de 5 minutos, máximo 5 intentos por desafío, un solo uso, almacenamiento de hash/HMAC, nunca en log; ajustes sujetos a análisis de amenazas y proveedor.
5. `POST /portal/recover/verify`: validar desafío, propósito, código, expiración, intentos y autorización de contacto; consumir atómicamente, crear sesión de lectura vinculada **solo a esa OT**.
6. Al reintentar o repetir el código, negar el acceso. Enlaces revocados permanecen revocados; la recuperación emite una sesión nueva controlada, no resucita el token anterior.
7. Si el contacto perdió su teléfono, Chambi verifica identidad fuera de banda y actualiza la ficha con auditoría.

**Límites funcionales:** no mostrar si la placa existe, no enviar SMS a contactos sin verificación, no seleccionar una OT al azar entre varias vigentes, no usar propietario de SUNARP como sustituto de la autorización contractual de la OT.

**Mensajería en piloto:** proveedor simulado inyectado, sin envío real. En producción seleccionar proveedor autorizado, política anti-abuso, presupuesto y protección de datos. SMS es un autenticador con riesgos de SIM swap; no se tratará como prueba universal de identidad.

### 1.3 Aprobación de presupuestos

- Mantener el flujo presencial existente, que ya está probado según la Fase 0.
- Futura aprobación remota: requerir persona con `approve_quote` en la OT, teléfono verificado, identidad/delegación documentada, consentimiento claro y desafío **distinto** al de recuperación.
- El desafío remoto se ata a `work_order_id + quote_id + quote_version + total + currency + contact_id + purpose` y vence. Un OTP de recuperación no puede autorizar presupuesto.
- La decisión registra la versión y total **inmutables**, fecha del servidor, actor verificado, método y prueba de aceptación. Si se publica versión nueva o se revoca la delegación, el desafío anterior queda inválido.
- Un enlace de lectura no concede permisos de aprobación aunque el cliente lo abra.

### 1.4 Diagnóstico preliminar vs confirmado (CM-006)

Guardar **entradas append-only** con `diagnosis_id`, `revision`, `type`, `author_id`, `created_at`, `supersedes`, `public_summary`, `internal_notes`, `published_at`, `evidence_ids` y un identificador único de OT. La vista vigente se obtiene por la última revisión válida; las anteriores permanecen en la auditoría.

- `preliminary`: síntomas y evaluación inicial, con rótulo **“Evaluación inicial, pendiente de confirmar”**. No marcar diagnóstico definitivo ni permitir que una simple nota interna aparezca en el portal.
- `confirmed`: hallazgos/pruebas con sustento y responsable, rotulado **“Diagnóstico confirmado”**. No convertir automáticamente notas preliminares en confirmación.
- `correction`: nueva revisión que sustituye otra explícitamente y explica motivo; no `UPDATE` silencioso ni borrado físico de la historia.
- `public_summary`: texto revisado para cliente, distinto de `internal_notes`. Solo `published_at` y permiso de la OT permiten lectura en portal.
- Si una versión fue corregida, el portal muestra la vigente y una marca de actualización comprensible; la auditoría interna conserva todas las versiones.
- El presupuesto puede referenciar una revisión de diagnóstico, pero cambiar diagnóstico **no** modifica automáticamente una cotización ya aceptada.

## 2. API propuesta (adaptar rutas al repositorio existente)

| Método y ruta ilustrativa | Actor | Respuesta/efecto | Regla de seguridad |
|---|---|---|---|
| `POST /api/v1/admin/work-orders/:id/contacts` | Admin | Alta de contacto y alcances | Autenticación, OT, verificación real, auditoría |
| `POST /api/v1/admin/work-orders/:id/contacts/:contactId/revoke` | Admin | Revoca acceso/delegación | Revocar sesiones/desafíos relacionados |
| `POST /api/v1/portal/recover/request` | Público | Mensaje genérico + request_id | Rate limit, respuesta uniforme, sin enumeración |
| `POST /api/v1/portal/recover/verify` | Público | Cookie sesión limitada | OTP solo una vez, TTL, máximo intentos, OT vinculada |
| `GET /api/v1/portal/current-work-order` | Cliente verificado | Proyección pública de **su** OT | Sin `orderId` arbitrario desde el cliente |
| `POST /api/v1/admin/work-orders/:id/diagnoses` | Admin | Nueva revisión de diagnóstico | Versionado y publicación explícita |
| `GET /api/v1/portal/diagnosis` | Cliente verificado | Última revisión pública autorizada | Sin notas internas ni datos de otra OT |
| `POST /api/v1/portal/quotes/:version/step-up` | Autorizante verificado | Desafío ligado a cotización | Propósito/OT/version/importe únicos |
| `POST /api/v1/portal/quotes/:version/decision` | Autorizante verificado | Aprobación/rechazo auditable | Paso adicional y versión inmutable |

**Respuestas:** 400 validación, 401 falta sesión, 403 permiso insuficiente, 404 recurso inaccesible, 409 revisión/conflicto, 422 regla de negocio; las rutas públicas de recuperación devuelven una respuesta homogénea no enumerativa, con cuota y procesamiento suficientemente uniforme.

## 3. Datos y persistencia

Proponer **migración aditiva**, sin eliminar columnas ni reescribir información histórica antes de contrastar el esquema real:

- `work_order_contacts`: `work_order_id`, `contact_id`, `relation_type`, `verified_phone_e164`, `verified_at`, `verified_method`, `verified_by`, `can_view_progress`, `can_approve_quote`, `delegation_proof_ref`, `revoked_at`.
- `recovery_challenges`: `id`, `purpose`, `otp_digest`, `work_order_id` (nullable para reto ficticio), `contact_id`, `expires_at`, `attempts`, `consumed_at`, `created_at`, `created_ip_hash`, `request_bucket`.
- `portal_sessions`: `id`, `secret_hash`, `work_order_id`, `contact_id`, `scope`, `expires_at`, `revoked_at`, `created_at`, `last_used_at`.
- `diagnosis_revisions`: `id`, `work_order_id`, `revision`, `kind`, `supersedes_id`, `internal_notes`, `public_summary`, `author_id`, `evidence`, `published_at`, `created_at`.
- `quote_authorization_challenges`: versión, total, divisa, contacto, propósito, vencimiento, resultado e identificador transaccional.
- `work_order_events`: eventos de verificación, cambio de contacto, recuperación, revisiones, publicación, aprobación, fallos, sin guardar OTP ni secretos.

**Consistencia:** transacción SQL/operación atómica para consumir OTP e insertar sesión; índice único de `challenge_id + consumed_at` según diseño final; versiones esperadas en cambios; autorización por objeto en API y políticas RLS probadas con roles adversarios; Media Storage privado con firmas breves.

**Retención:** los datos sintéticos del piloto pueden borrarse controladamente al finalizar; plazos reales de OTs, fotografías y autorizaciones se aprobarán después con política jurídica/garantías. No borrar evidencias de un servicio real con una regla inventada.

## 4. Autorización y vistas

| Sujeto | Diagnóstico público | Notas internas | Aprobar cotización |
|---|---|---|---|
| Admin autenticado | Sí | Sí | Según flujo interno existente |
| Contacto verificado con `view_progress` de OT A | Solo OT A | No | No, salvo permiso extra y paso adicional |
| Representante verificado con `approve_quote` de OT A | Solo si además tiene `view_progress` | No | Solo versión autorizada de OT A, con verificación extra |
| Enlace de lectura filtrado | Solo OT vinculada | No | No |
| Visita pública que solo conoce placa | No | No | No |
| Contacto revocado | No | No | No |

## 5. Matriz de pruebas que deben migrarse al repo

| ID | Escenario sintético | Resultado esperado |
|---|---|---|
| R01 | Solicitar con placa inexistente | Igual mensaje y forma de respuesta que la existente |
| R02 | Placa sin contacto verificado | Ningún envío, ningún acceso |
| R03 | Una OT activa y teléfono verificado | OTP solo al teléfono registrado |
| R04 | OTP válido antes de expiración | Una sesión de lectura limitada |
| R05 | Reutilizar OTP | Rechazado |
| R06 | OTP vencido | Rechazado |
| R07 | 5 códigos inválidos | No más intentos en ese desafío |
| R08 | Exceso de solicitudes por placa/origen | No más envíos, respuesta genérica |
| R09 | Dos OTs activas con misma placa | No se revela ni elige orden arbitraria |
| R10 | Contacto revocado tras OTP | No se abre sesión |
| R11 | Sesión OT A consulta OT B | Denegado, también en Storage/RLS |
| R12 | OTP recuperación usado en aprobación | Rechazado por propósito |
| R13 | Representante registrado sin permiso económico | No aprueba |
| R14 | Representante con permiso + desafío versión correcta | Aprueba una vez, con registro |
| R15 | Presupuesto cambia de versión | Desafío previo no autoriza nueva versión |
| D01 | Diagnóstico preliminar publicado | Se etiqueta preliminar, nunca confirmado |
| D02 | Nota interna sin publicación | No aparece en portal |
| D03 | Diagnóstico confirmado con evidencia | Se publica la versión correcta |
| D04 | Corrección de diagnóstico | Historial conserva original y muestra última revisión |
| D05 | Sesión de otra OT intenta diagnóstico | Acceso denegado |
| D06 | Cambio de diagnóstico tras cotización aceptada | No modifica aceptación ni total anterior |

### 5.1 Pruebas no cubiertas por el modelo aislado

RLS PostgreSQL con usuario real, Storage con URL temporal, middleware/cookies, fuga por logs, temporización real/no enumeración temporal, concurrente en varias instancias, OTP real, SIM swap, revocación de sesión ya emitida, fallos de red, reintentos offline y E2E móvil/web. Son **gates obligatorios** para integrar/usar datos reales.

## 6. Criterio de terminado de este corte

1. Compatibilidad y reversibilidad de migración comprobadas; no pérdida de diagnósticos viejos.
2. Contacto y alcance verificables con auditoría.
3. Recuperación genérica y segura, con OTP ficticio en prueba, sin exponer existencia ni datos sensibles.
4. Sesión limitada a OT, sin acceso cruzado por API/BD/medios.
5. Diagnóstico preliminar/confirmado y correcciones con historial real, no estado en memoria solamente.
6. Presupuesto presencial existente intacto; autorización remota no habilitada hasta superar seguridad y consentimiento.
7. Pruebas Vitest, pgTAP, E2E y lint/build que ya tenga el proyecto continúan verdes; reporte exacto.
8. Sin despliegue, push, merge, SMS, datos de clientes o modificación de otras ramas.

## 7. Fundamentos técnicos

- OWASP recomienda respuestas no enumerativas, tokens de un solo uso y límites contra automatización: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- OWASP documenta autorización por objeto BOLA: https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/
- NIST SP 800-63B trata SMS por PSTN como autenticador restringido: https://pages.nist.gov/800-63-4/sp800-63b.html
- Reglamento peruano de protección de datos personales: https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus

Este documento especifica controles de referencia. El equipo debe revisar los requisitos legales, threat model y compatibilidad de infraestructura antes de usarlos con personas reales.

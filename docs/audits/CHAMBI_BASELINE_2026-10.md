# Chambi Motors · auditoría base 2026-10

Fecha de verificación: 29-10-2026 (America/Lima). Fuente de requisitos: Plan maestro 2.0, sección 20.1 y backlog CM-001..030. Alcance: snapshot local de la rama de producto; no es un pentest, certificación ni aprobación de piloto real.

## Preservación y procedencia

- Rama: `feat/chambi-motors-platform-v1`; HEAD `fa077de874cbcb2697d7e39dc33fbde458e25910` (`docs: record first pilot APK and device verification`).
- Base común observada: `a6b7e29701bef6d75d16e3d608f59b6e41196a4c` (`main`/`origin/main`).
- Hitos locales conservados: `40dd37a` (V1), `0e185904b261e5ab56cad384972af01d136bef0c` (hardening y APK) y `fa077de` (registro de entrega y perfil iOS simulator).
- `git status --short --branch` antes y después de los checks: rama indicada; sin cambios versionados; permanecen sin seguimiento `agentes/` y `.universal-agents/operations/`. No fueron movidos, borrados ni añadidos al commit.
- Remoto `origin` apunta a `https://github.com/Elias040720/Chambi-motors.git`; no se consultó ni modificó su contenido. No hubo push, merge, PR ni despliegue.
- No se hizo una copia adicional ni se generaron hashes recursivos: no se realizó operación destructiva o de reemplazo. Git conserva los commits indicados; los directorios locales no versionados se dejaron intactos.

## Mapa técnico observado

- Monorepo pnpm: Next.js/API en `apps/web`, React Native/Expo en `apps/mobile`, contratos y validación en `packages/domain`, PostgreSQL/Supabase en `supabase/migrations`, scripts operativos en `scripts/`.
- Las siete migraciones versionadas son `202610260001_initial.sql` a `202610270007_backend_writes_only.sql`. La inicial define clientes, vehículos y OT; las siguientes añaden integridad, operaciones, medios, contratos, dependencias y revocación de DML directo de roles cliente.
- Rutas API admin/public y portal de seguimiento viven bajo `apps/web/src/app/api/v1/` y `apps/web/src/app/seguimiento/`. Persistencia, autorización, transacciones, proyección pública y medios están principalmente en `apps/web/src/lib/{auth,orders,public-order,media,verification}.ts`.
- La app móvil consume la API Next; incluye recepción, clientes, detalle de OT, cámara/galería, borradores/cola SQLite, SecureStore, compartir y diagnóstico offline. El APK piloto entregado es `pe.chambimotors.app.pilot`, modo diagnóstico sin servidor; la prueba manual reportada por Abel fue SQLite y SecureStore PASS. No prueba el recorrido conectado.
- EAS está enlazado al proyecto `@movaeduca/chambi-motors`. La integración Supabase remota y un host HTTPS de API no están configurados.

## Verificación ejecutada en esta auditoría

Los comandos se ejecutaron el 29-10-2026. pnpm verificó el lockfile contra 817 entradas y reconstituyó enlaces de dependencias en `node_modules`; no reportó cambios del lockfile ni del código.

| Comando                       | Resultado observado                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm test`                   | PASS, 114/114 pruebas, 11 archivos, exit 0.                                                                                                            |
| `pnpm test:rls`               | PASS, exit 0; privilegios/lecturas/denegaciones y guardas de integridad con fixtures y transacción revertida.                                          |
| `pnpm test:e2e`               | PASS, 10/10 escenarios Chromium, exit 0; base aislada, 7 migraciones y flujos admin/cliente, concurrencia, cotización, repuestos, QA, medios y portal. |
| `git status --short --branch` | Sin archivos versionados modificados; `agentes/` y `.universal-agents/` permanecen sin seguimiento.                                                    |

Los tests no acreditan servicios Supabase reales, SMS, despliegue, ni una app nativa conectada. El estado de compilación y del APK se conserva en `docs/EXECUTION_STATUS.md`.

## Inventario CM-001..030

Las categorías describen el alcance verificable en este repositorio. **IMPLEMENTADA** significa código local y evidencia de pruebas; no implica servicio remoto. **PARCIAL** indica una parte útil integrada con una condición o subflujo ausente. **SIMULADA** se reserva para un comportamiento que solo aparece como demo. **BLOQUEADA** indica una dependencia externa o de dispositivo. **AUSENTE** significa que no se encontró evidencia del entregable en este snapshot, no que sea imposible.

| ID     | Estado       | Evidencia local y límite principal                                                                                                                                   |
| ------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CM-001 | IMPLEMENTADA | Rama, commits y contenido local preservados; `agentes/`, journal y `dev.log` no se tocaron. No hay backup externo verificado.                                        |
| CM-002 | PARCIAL      | Arquitectura, `SECURITY.md`, tests y esta auditoría cubren dominios clave. No es auditoría formal exhaustiva/pentest ni verificación remota.                         |
| CM-003 | IMPLEMENTADA | Clientes, vehículos, múltiples OTs, constraints y migraciones iniciales; evidencia `supabase/migrations/202610260001_initial.sql`, E2E de alta.                      |
| CM-004 | PARCIAL      | Auth de administrador, sesión opaca y RLS comprobados localmente; Supabase/Auth remoto no conectado.                                                                 |
| CM-005 | IMPLEMENTADA | Ingreso manual y reutilización de clientes/vehículos; app `apps/mobile/app/intake.tsx`. No hay proveedor de placa autorizado.                                        |
| CM-006 | PARCIAL      | Motivo, notas, eventos y visibilidad existen; no hay un modelo completo separado de motivo, evaluación preliminar, diagnóstico confirmado y revisiones.              |
| CM-007 | PARCIAL      | Mutaciones versionadas, bloqueos, tareas, ETA y eventos; no todas las dimensiones stage/activity/priority/visibility del plan son un modelo independiente.           |
| CM-008 | IMPLEMENTADA | Grant aleatorio, hash, canje, expiración, revocación, cookie y proyección por OT; E2E de seguimiento privado.                                                        |
| CM-009 | AUSENTE      | Recuperación de contraseña/admin no es recuperación de acceso de cliente por placa + OTP a contacto registrado; no revelar existencia es requisito para implementar. |
| CM-010 | PARCIAL      | Medios privados, firma temporal y visibilidad probados localmente; bucket/ACL reales de Supabase pendientes.                                                         |
| CM-011 | IMPLEMENTADA | Cotizaciones selladas/versionadas, decisión ligada a versión e idempotencia; E2E de aprobaciones y nueva versión. OTP real no configurado.                           |
| CM-012 | IMPLEMENTADA | Solicitud, bloqueo, recepción/conformidad de repuesto; E2E confirma que pedir no equivale a recibir.                                                                 |
| CM-013 | IMPLEMENTADA | QA, retrabajo, liberación y entrega/garantía; E2E cubre QA fallido y éxito.                                                                                          |
| CM-014 | PARCIAL      | RLS, denegaciones cruzadas, expiración, idempotencia y conflictos en tests locales; faltan los mismos controles en un proyecto Supabase dedicado y medios reales.    |
| CM-015 | PARCIAL      | APK standalone y diagnóstico Android informado por el propietario; falta recorrido de negocio conectado, cámara/galería en hardware e iPhone instalado.              |
| CM-016 | PARCIAL      | Panel móvil con listas/búsqueda/estados; no se encontró un Kanban con columnas y acciones completas.                                                                 |
| CM-017 | PARCIAL      | Compartir mediante intención del sistema; QR/plantillas y verificación de que la app destinataria recibe el enlace no están cubiertos como flujo completo.           |
| CM-018 | PARCIAL      | Outbox transaccional e idempotencia de eventos existen; no hay worker, proveedor ni reintentos de entrega de avisos.                                                 |
| CM-019 | PARCIAL      | La UI puede presentar OT/ETA vencidas; falta un proceso/alerta interna programada y observada.                                                                       |
| CM-020 | AUSENTE      | No hay agenda de taller/capacidad y reservas de turnos implementadas como dominio.                                                                                   |
| CM-021 | AUSENTE      | No hay panel de KPI ni instrumentación agregada de línea base/ahorro; las metas del plan son hipótesis, no resultados.                                               |
| CM-022 | PARCIAL      | Checklist, tareas y fotografías existen; no hay catálogo amplio de plantillas/diagnósticos ni herramienta de anotación de fotos demostrada.                          |
| CM-023 | PARCIAL      | Contacto y preferencia se almacenan; consentimiento verificable, política operativa de retención, exportación y cumplimiento no están completos.                     |
| CM-024 | PARCIAL      | Compose/CI y setup de piloto existen; backup restaurado, alertas/observabilidad y rollback de un entorno remoto no se han probado.                                   |
| CM-025 | BLOQUEADA    | Piloto con OTs reales depende de superar gates; aún no hay backend de pruebas conectado ni autorización para usar datos reales.                                      |
| CM-026 | AUSENTE      | No hay catálogo/visor GLB. El plan lo pospone correctamente hasta estabilidad, licencia y presupuesto.                                                               |
| CM-027 | AUSENTE      | No hay integración de placa. Automatización queda condicionada a fuente, permiso, contrato, calidad y costo; siempre existe entrada manual.                          |
| CM-028 | AUSENTE      | No se encontró modelo predictivo de ETA; debe esperar datos históricos confiables.                                                                                   |
| CM-029 | AUSENTE      | No hay recordatorios posventa con preferencias/consentimiento y worker de notificaciones.                                                                            |
| CM-030 | AUSENTE      | No hay roles multiusuario/sucursales; V1 es de administrador único por decisión del plan.                                                                            |

## Amenazas y controles a mantener

1. **BOLA/IDOR entre OT, fotos y decisiones:** grant limitado a una orden; validar que cada lectura, medio y mutación verifica la sesión/grant actual y la OT objetivo. Mantener E2E de token A contra OT B y Storage cruzado.
2. **Enumeración por placa y recuperación:** respuesta indistinguible exista/no exista, límites por IP/placa/contacto, OTP al contacto prevalidado, vencimiento/replay bloqueados. CM-009 no se implementa de forma segura hasta definir el contacto verificado y probarlo con datos sintéticos.
3. **Filtración de secretos o notas internas:** URL de enlace fuera de logs/analytics/referers; proyección explícita; fotos privadas solo firmadas y temporales; service role solo servidor.
4. **Aprobaciones y concurrencia:** presupuesto/versiones inmutables, OTP/grant ligado a importe y versión, idempotencia más `expectedVersion`, expiración revalidada después de locks.
5. **Privacidad y operación:** definir consentimiento, retención, exportación, backups restaurables y respuesta ante incidente antes de datos reales. No se validaron obligaciones legales para una implementación concreta.

## Siguiente corte recomendado

El Corte A ya existe en modo local: admin crea OT con ficha manual, registra trabajo y comparte un enlace privado; pruebas locales demuestran persistencia y proyección. **El paso técnico más pequeño para volverlo piloto sintético conectado** es habilitar infraestructura aislada (Supabase Free confirmado y API Next por HTTPS), aplicar migraciones y luego correr inspector/RLS/E2E negativos con usuarios y datos ficticios. No simular ni sustituir el backend por Supabase REST.

Después de conectar, cerrar primero los gaps P0 del backlog: CM-006 (diagnóstico con revisiones), CM-009 (recuperación de enlace segura), CM-014 (pruebas remotas), CM-015 (recorrido conectado en Android/iOS) y CM-023/024 (privacidad/backup/restore). No abrir piloto real mientras alguno de esos controles o la autorización del dueño siga pendiente.

## Decisiones pendientes del dueño

- Contacto verificado para recuperar enlaces y quién puede aprobar presupuesto en nombre del cliente.
- Política de consentimiento, retención, exportación y garantía; datos del taller y textos legales revisados.
- Frecuencia/canales de avisos; comenzar con compartir enlace manual, sin SMS comercial.
- Confirmar acceso sin costo a Supabase Free y disponibilidad de un host API HTTPS de pruebas.
- Dispositivo iPhone y Android para la prueba del flujo conectado; permiso de cámara/fotos y reinicio de la app.
- Antes de activar piloto con vehículos reales: autorización expresa tras evidencia sintética y seguridad.

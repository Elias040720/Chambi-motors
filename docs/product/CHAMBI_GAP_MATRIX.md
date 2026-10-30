# Chambi Motors · matriz de brechas del Plan maestro 2.0

Estado observado al 29-10-2026. La columna “estado” se refiere a código y evidencia disponible en este repo, no a disponibilidad comercial o producción. La matriz compacta enlaza al detalle y evidencia del baseline: [auditoría base](../audits/CHAMBI_BASELINE_2026-10.md).

| ID     | Prioridad | Estado       | Próximo entregable verificable                                                                                   |
| ------ | --------- | ------------ | ---------------------------------------------------------------------------------------------------------------- |
| CM-001 | P0        | IMPLEMENTADA | Mantener rama/commits y directorios fuente intactos; backup externo queda pendiente.                             |
| CM-002 | P0        | PARCIAL      | Auditoría incremental completada localmente; la validación remota/hardware permanece pendiente.                  |
| CM-003 | P0        | IMPLEMENTADA | Continuar con migraciones aditivas y OT como entidad primaria.                                                   |
| CM-004 | P0        | PARCIAL      | Conectar Auth de un proyecto dedicado, signup cerrado y una cuenta sintética.                                    |
| CM-005 | P0        | IMPLEMENTADA | Mantener flujo manual; validar contacto y consentimiento antes de compartir.                                     |
| CM-006 | P0        | PARCIAL      | Modelar motivo, evaluación preliminar, diagnóstico confirmado y revisiones auditables.                           |
| CM-007 | P0        | PARCIAL      | Expresar actividad/bloqueos/prioridad/visibilidad independientemente sin romper eventos existentes.              |
| CM-008 | P0        | IMPLEMENTADA | Probar enlaces revocados/vencidos y aislamiento en el entorno remoto.                                            |
| CM-009 | P0        | AUSENTE      | Añadir recuperación de acceso por placa + OTP, genérica, con rate limits, contacto verificado y replay denegado. |
| CM-010 | P0        | PARCIAL      | Provisionar y verificar bucket privado real; demostrar URL/objeto inaccesible cruzado.                           |
| CM-011 | P0        | IMPLEMENTADA | Probar aprobación ligada a versión con segundo factor en entorno dedicado antes de uso real.                     |
| CM-012 | P0        | IMPLEMENTADA | Retener flujo y probar recepción/rechazo de pieza en dos sesiones reales de prueba.                              |
| CM-013 | P0        | IMPLEMENTADA | Retener gates QA/retrabajo y verificar evidencia en móvil conectado.                                             |
| CM-014 | P0        | PARCIAL      | Ejecutar BOLA/IDOR, permisos de Storage, OTP y concurrencia contra servicios dedicados.                          |
| CM-015 | P0        | PARCIAL      | Android e iOS conectados: cámara, galería, offline, reconexión, enlaces y proceso reiniciado.                    |
| CM-016 | P1        | PARCIAL      | Evaluar tablero Kanban y filtros de bloqueos/entrega con Chambi.                                                 |
| CM-017 | P1        | PARCIAL      | Añadir QR/plantillas solo si simplifican compartir y no filtran tokens.                                          |
| CM-018 | P1        | PARCIAL      | Diseñar worker outbox con leases, backoff, dedupe y proveedor autorizado; mantener apagado hasta aprobación.     |
| CM-019 | P1        | PARCIAL      | Alertas internas observables para ETA/actualización vencidas, sin promesas al cliente.                           |
| CM-020 | P1        | AUSENTE      | Validar primero necesidad de agenda/capacidad con el taller.                                                     |
| CM-021 | P1        | AUSENTE      | Definir eventos mínimos y línea base de 2 semanas antes de comparar metas.                                       |
| CM-022 | P1        | PARCIAL      | Añadir plantillas y anotación de fotos solo tras validar uso operativo.                                          |
| CM-023 | P1        | PARCIAL      | Acordar consentimiento, retención y exportación; automatizar después con política aprobada.                      |
| CM-024 | P1        | PARCIAL      | Ensayar respaldo/restauración y rollback en infraestructura de prueba.                                           |
| CM-025 | P1        | BLOQUEADA    | Piloto supervisado requiere P0 completo, infraestructura y aprobación para datos reales.                         |
| CM-026 | P2        | AUSENTE      | Experimento aislado con GLB licenciado, fallback 2D y etiqueta de precisión.                                     |
| CM-027 | P2        | AUSENTE      | Investigación de proveedor/fuente autorizada; scraping/CAPTCHA no permitido.                                     |
| CM-028 | P2        | AUSENTE      | No iniciar predicción hasta tener historial consistente y volumen suficiente.                                    |
| CM-029 | P2        | AUSENTE      | Recordatorios requieren consentimiento, canal y preferencias, además del worker.                                 |
| CM-030 | P2        | AUSENTE      | Mantener un solo admin hasta que la necesidad operativa justifique roles.                                        |

## Decisiones de secuencia

1. La conectividad sintética es el bloqueo operativo de los flujos ya construidos; el APK actual está deliberadamente offline. Supabase debe ser dedicado y Free/costo verificado; Next necesita su propia URL HTTPS.
2. CM-006 y CM-009 son brechas de producto P0 y requieren diseño de dominio/seguridad antes de código porque afectan historial diagnóstico y acceso a expedientes.
3. No iniciar CM-018/019/021 antes de definir eventos, retención, canal, consentimiento y métricas base.
4. CM-026/027/028/030 no pertenecen a la ruta crítica inicial. La entrada manual, fotos reales y registro operacional son suficientes para validar el valor central.

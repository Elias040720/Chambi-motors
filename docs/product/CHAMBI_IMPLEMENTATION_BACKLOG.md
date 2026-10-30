# Chambi Motors · backlog de implementación basado en evidencia

Este backlog continúa el Plan maestro 2.0 sin recrear el producto. Los IDs CM son los del plan. Estado y evidencias detalladas están en [la matriz](CHAMBI_GAP_MATRIX.md) y [el baseline](../audits/CHAMBI_BASELINE_2026-10.md).

## Secuencia

### A. Habilitar un entorno sintético conectado

- **Alcance:** proyecto Supabase dedicado con plan/costo Free confirmado, Auth sin signup, PostgreSQL, bucket privado, migraciones, usuario/órdenes ficticias; desplegar la API Next a un host HTTPS de pruebas separado; poblar solo `.env.pilot.local` ignorado.
- **Evidencia de salida:** `pilot:check`, `pilot:migrate`, `pilot:inspect`, `pilot:rls`; pruebas HTTP de Auth/Storage y recorrido de dos sesiones con fixtures sintéticos; ninguna clave en salida ni bundle móvil.
- **Condición:** la sesión de Supabase existente no mostró información suficiente para verificar costo/cuota. No crear recursos cobrables ni inferir que Free está disponible. La API HTTPS tampoco existe aún.
- **Reversión:** desactivar el entorno/credenciales y conservar evidencia redactada; no tocar proyectos existentes.

### B. Cerrar diagnóstico y recuperación segura (CM-006 y CM-009)

- **Diagnóstico:** ADR breve del modelo de `reported_concern`, evaluación preliminar, hallazgo confirmado, responsable, timestamp del servidor, historial de revisiones y visibilidad. Migración aditiva; portal traduce solo el último hecho aprobado para cliente.
- **Recuperación:** endpoint genérico por placa; no revelar si existe expediente; buscar solo contacto ya verificado; código aleatorio, hash, TTL, intentos y consumo único; límites por IP/placa/contacto; sesión de lectura limitada a OT elegible; no compartir OTP de aprobación por error de contrato.
- **Pruebas negativas:** placa ajena/no registrada misma respuesta; OTP expirado, replay y brute force denegados; token no abre otra OT; logs/redactados; segundo intento concurrente consume una sola vez.
- **Bloqueo de producto:** el dueño debe definir qué canal/contacto se valida en recepción y si un tercero puede aprobar. Hasta entonces puede implementarse el contrato técnico sintético, sin enviar correo/SMS real.

### C. Validación P0 de medios, Android e iOS (CM-010/014/015)

- Aplicar políticas y permisos en un proyecto dedicado; test de objeto privado cruzado y URL vencida/revocada.
- Android: instalar build conectado solo cuando API de pruebas esté estable; probar permisos permitidos/denegados, cámara, galería, cola offline, reinicio forzado, dos sesiones y reconexión.
- iOS: exigir build/device Apple autorizado; no crear certificados ni servicios pagos. Simulador requiere macOS.
- Guardar capturas/logs solo sintéticos y redactados; distinguir diagnóstico de recorrido conectado.

### D. Privacidad, resiliencia y operación (CM-023/024)

- Definir finalidad, consentimiento, contacto, retención, exportación/eliminación, garantía y procedimiento de incidentes; obtener revisión apropiada antes de datos reales.
- Ensayar respaldo y restauración de Postgres/Storage en proyecto de prueba; verificar rollback de API/config sin downgrade destructivo de migraciones.
- Definir alertas, responsables y límites de recursos. No habilitar producción como parte de este backlog.

### E. Productividad medida (CM-016/017/018/019/020/021/022/029)

- Hacer observación con Chambi y medir dos semanas de línea base antes de KPIs.
- Priorizar Kanban/filtros solo si reducen el tiempo por actualización; QR/plantillas solo como acceso al enlace privado existente.
- Antes de worker de notificaciones: outbox con dedupe estable, lease recuperable, backoff, límites, idempotencia de proveedor y preferencias/consentimiento. Empezar con envío apagado y canal manual.
- Agenda, checklist ampliado, anotación de fotos y recordatorios se deciden por evidencia, no por tenerlos en el plan.

### F. Diferenciación futura (CM-026/027/028/030)

- 3D: activo GLB con licencia comercial, coincidencia determinista, etiqueta “referencial”, fallback a foto y prueba en teléfono modesto.
- Placa: proveedor autorizado/contrato/permiso/costo y calidad demostrados; formulario manual siempre funcional. No sortear CAPTCHA ni hacer scraping no autorizado.
- ETA predictiva: posponer hasta historia operacional de calidad; devolver “por confirmar” si evidencia insuficiente.
- Roles: añadir cuando haya personal real y contrato de permisos aprobado.

## Primer conjunto de cambios seguro

No hay un cambio pequeño de negocio que desbloquee servicios remotos ausentes. El siguiente trabajo local seguro es preparar una ADR y pruebas contractuales para CM-006/009 después de definir las decisiones de datos; en paralelo puede ejecutarse infraestructura sintética solo cuando el costo Free y el endpoint HTTPS estén comprobados. No se propone parchear lógica a ciegas ni duplicar funciones ya implementadas.

## Gate de piloto real

No usar clientes/vehículos reales hasta que estén verdes: Supabase Auth/RLS/Storage remoto; Next HTTPS; recuperación y enlaces probados; backup restaurado; política de privacidad/retención; Android e iOS conectados; operación en dos sesiones; revisión de riesgos residuales; aprobación explícita del dueño. No hay SMS comercial ni despliegue de producción autorizado por este backlog.

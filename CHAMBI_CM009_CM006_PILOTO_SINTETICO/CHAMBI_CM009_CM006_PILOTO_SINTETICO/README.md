# CHAMBI MOTORS — Diseño y pruebas sintéticas de CM-009 / CM-006

**Alcance:** recuperación segura del seguimiento web mediante placa + teléfono previamente verificado; autorizante de presupuesto limitado a cliente o representante registrado y verificado; historial separado de diagnóstico preliminar y confirmado.

**Importante:** este paquete es un **modelo de referencia independiente**. No está integrado al repositorio real ni reemplaza los tests del proyecto. No utiliza Supabase, SMS, WhatsApp, internet, datos de clientes ni credenciales reales.

## Archivos

- `DESIGN.md`: decisiones cerradas, contrato de API, datos, amenazas y pruebas de aceptación para trasladar a la rama existente.
- `src/reference-model.mjs`: implementación simulada en memoria con inyección de reloj y proveedor ficticio de mensajes.
- `tests/reference-model.test.mjs`: casos reproducibles en Node.js (sin dependencias externas).
- `package.json`: comando de pruebas.

## Ejecutar la simulación

```bash
node --version
npm test
```

Requiere Node.js moderno con `node:test`. No ejecutar `npm install` es necesario para este paquete.

## Integración segura en el proyecto real

1. Abrir el **repositorio local original**, verificar `git status`, rama `feat/chambi-motors-platform-v1`, commit y respaldos antes de editar.
2. Leer `docs/audits/CHAMBI_BASELINE_2026-10.md`, `docs/product/CHAMBI_GAP_MATRIX.md` y `docs/product/CHAMBI_IMPLEMENTATION_BACKLOG.md` del commit local `a10ad12`.
3. Comparar entidades, rutas y tests existentes con `DESIGN.md`. No copiar el modelo en memoria como backend real.
4. Implementar en los módulos y convenciones **existentes**, con PostgreSQL, transacciones, RLS, sesiones HttpOnly, OTP con hash y colas. Primero migración no destructiva y compatibilidad con diagnósticos anteriores.
5. Convertir estos casos a Vitest/E2E/pgTAP del repo, incluyendo pruebas **negativas de autorización por OT/medios**.
6. Ejecutar tests del repo y el flujo sintético completo. No introducir datos reales ni publicar sin aprobación expresa.

## Límites

- No es un proveedor de OTP ni prueba de entrega de SMS.
- No prueba resistencia a timing attacks, condiciones de carrera interproceso, privacidad de proveedores, SQL/RLS ni sesiones reales.
- No sustituye validación legal peruana de datos personales ni revisión de la identidad del autorizante en el taller.
- No implica que la auditoría o el código reportado en `a10ad12` sean accesibles desde esta sesión.

## Comando recomendado para Codex

> Analiza este paquete junto con la auditoría local de CHAMBI MOTORS en `a10ad12`. Aplica solo los cambios CM-006 (diagnóstico preliminar/confirmado con historial) y CM-009 (recuperación de enlace por placa con OTP a teléfono verificado), respetando el diseño, el esquema y los módulos actuales. Mantén la aprobación presencial existente; diseña el autorizante alterno verificado y pruebas de su alcance antes de habilitar aprobación remota. Ejecuta pruebas con fixtures sintéticos y transacciones revertidas; no publiques, no hagas push/merge/reset ni uses clientes reales. Preserva `agentes/`, `.universal-agents/operations/` y demás cambios ajenos. Reporta archivos cambiados, tests, riesgos, migración, comportamiento offline, seguridad y estado exacto del worktree.

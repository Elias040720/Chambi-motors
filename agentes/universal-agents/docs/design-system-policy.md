# Política de diseño y sistema visual

Orden de decisión: intención y accesibilidad → sistema visual existente → producto/público/entorno → propuesta visual si hace falta → implementación → motion selectivo → crítica y pulido. No se impone framework, librería, tema, estilo, ni efecto.

## Flujo condicionado

Para una interfaz nueva o una dirección visual todavía no decidida, la ruta es `design-director → ui-engineer → ux-reviewer`; añade `motion-reviewer` solo si hay movimiento presente o solicitado. Para ajustes de UI en un sistema ya definido, `ui-engineer` puede trabajar directo y pedir solo la revisión que resuelva un riesgo explícito. No se invocan todos los roles como checklist automático.

`design-director` observa marca/producto/stack/dispositivo y propone tokens y estados mínimos; `ui-engineer` implementa el stack real; revisores reportan evidencia por pantalla/archivo. “Visual” requiere browser/captura o entorno de interfaz efectivamente observado; lectura del código solo permite review estática. Si browser, emulador o tecnología asistiva falta, se documenta el check NOT RUN y el escenario reproducible.

Aceptación UI por flujo: layout a ancho móvil/desktop y zoom; navegación por teclado y foco visible; estados loading/empty/error/success y recuperación; contraste/labels/semántica según lo que se pueda medir; `prefers-reduced-motion`; errores con entrada inválida; respuesta al cambio de orientación y contenido largo. Un pipeline no impone React, CSS utility framework, dark mode ni animación.

Antes de cambiar UI, identifica stack, rutas, componentes, tokens, marca, dispositivo y objetivo de usuario. Reutiliza tokens semánticos; agrega el token faltante antes de crear un sistema paralelo. Si no hay sistema, ofrece una dirección coherente y explica decisiones en términos del producto.

En el flujo afectado considera loading, vacío, error/recuperación, éxito, contenido largo/edge cases, teclado, foco visible, semántica/labels, contraste, zoom/reflow y viewport móvil. Motion necesita propósito, salida/interrupción accesible y `prefers-reduced-motion`; no animar para decorar. Revisa rendimiento si existe métrica/herramienta. Distingue inspección de código, screenshot, browser walkthrough y test con tecnología asistiva.

Fixtures de referencia para evaluar propuestas están en `tests/fixtures/ui/`: dashboard, formulario complejo y landing responsive. Son briefs, no snapshots de píxeles ni prueba visual. La implementación respeta PHP/jQuery, Java, Flutter u otro stack detectado.

# Megaprompt Maestro para Antigravity — Documentación Normativa ISO/IEC 27001:2022 y Mejora de Procesos para Chambi Motors

**Repositorio objetivo:** [Elias040720/Chambi-motors](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2FElias040720%2FChambi-motors)  
**Estándares integrados:** [ISO/IEC 27001:2022](https://www.google.com/search?q=https%3A%2F%2Fwww.iso.org%2Fstandard%2F27001), [ISO/IEC 27002:2022](https://www.google.com/search?q=https%3A%2F%2Fwww.iso.org%2Fstandard%2F75652.html), [ISO 9001:2015](https://www.google.com/search?q=https%3A%2F%2Fwww.iso.org%2Fstandard%2F62085.html), [ISO/IEC 12207:2017](https://www.google.com/search?q=https%3A%2F%2Fwww.iso.org%2Fstandard%2F63712.html), [ISO/IEC 25010:2023](https://www.google.com/search?q=https%3A%2F%2Fwww.iso.org%2Fstandard%2F78176.html) e [ISO/IEC/IEEE 29148:2018](https://www.google.com/search?q=https%3A%2F%2Fwww.iso.org%2Fstandard%2F72089.html)

## Mejoras Aplicadas a tus Indicaciones Originales

| Aspecto de tu Indicación Original | Cómo fue Optimizado para Antigravity |
| :--- | :--- |
| **"Analiza mi proyecto a profundidad"** | Se instruye a Antigravity a inspeccionar primero los 34 archivos clave del repositorio (`src/store/workshop.tsx`, `src/lib/types.ts`, `src/lib/status.ts`, `src/lib/data.ts`, los 23 componentes en `src/components/*`, `Dockerfile`, `docker-compose.yml` y `nginx.conf`) prohibiendo contenido genérico. |
| **"Documentar siguiendo normas ISO, en especial la 27001"** | Se estructura un Sistema de Gestión de Seguridad de la Información (SGSI Cláusulas 4 a 10), Matriz de Riesgos (ISO 27005) y Declaración de Aplicabilidad (SoA) mapeada a controles reales del Anexo A (`A.5.15`, `A.8.2`, `A.8.3`, `A.8.11`, `A.8.15`, `A.8.20`, `A.8.21`, `A.8.24`, `A.8.25`, `A.8.28`), complementado con ISO 9001 (procesos de taller), ISO 12207 (arquitectura), ISO 25010 (calidad) e ISO 29148 (requisitos). |
| **"Mejores los flujos de trabajo y haya diagramas de flujo y de todos los procesos"** | Se evoluciona el flujo actual de 4 estados (`diagnostico`, `esperando_repuesto`, `reparacion`, `listo`) a un **Flujo de Trabajo Industrial de 8 Etapas** (añadiendo `recepcion_checkin`, `cotizacion_emitida`, `validacion_repuesto` para piezas traídas por el cliente, `control_calidad` QA y `entregado` con garantía) más **8 diagramas Mermaid obligatorios** (Swimlanes, Estados, Repuestos, Secuencia WebSocket, Seguridad en Búsqueda por Placa, Arquitectura C4, Entidad-Relación y DevSecOps). |
| **"Quiero todo en .md y html toda la documentación"** | Se ordena a Antigravity construir un generador determinista (`scripts/generate-iso-docs.mjs`) que produce con paridad 1:1 los 10 manuales en `docs/md/*.md`, sus equivalentes interactivos en `docs/html/*.html` (con `mermaid.js` v11 renderizado en vivo) y un portal unificado en `docs/index.html`, evitando que el agente trunque archivos extensos. |

## Prompt Listo para Copiar y Pegar en Antigravity

```markdown
# ROL Y MISIÓN PRINCIPAL DE ANTIGRAVITY

Actúa como un Arquitecto Principal de Software, Auditor Líder ISO/IEC 27001:2022 e Ingeniero de Procesos ISO 9001:2015. Estás operando directamente sobre el repositorio `Chambi-motors` (Next.js 15 App Router con `output: "standalone"`, React 19, TypeScript, Tailwind CSS v4, GSAP 3.15, Framer Motion, Lenis, Docker y Nginx).

Tu misión es auditar el código fuente real del proyecto, rediseñar y optimizar sus flujos de trabajo operativos y de seguridad, y generar una Suite Documental Completa de Nivel Empresarial alineada con las normas ISO/IEC 27001:2022 (foco principal), ISO/IEC 27002:2022, ISO/IEC 12207:2017, ISO/IEC 25010:2023, ISO/IEC/IEEE 29148:2018 e ISO 9001:2015.

Toda la documentación DEBE generarse con paridad exacta 1:1 en dos formatos:
1. Formato Markdown (`.md`) dentro del directorio `docs/md/` (con tablas nativas y todos los diagramas en bloques ```mermaid).
2. Formato HTML5 Interactivo (`.html`) dentro del directorio `docs/html/` más un Portal Maestro de Documentación en `docs/index.html` (con estética industrial oscura de Chambi Motors, barra lateral de navegación, buscador instantáneo, selector de tema oscuro/claro imprimible en A4 y renderizado visual en vivo de todos los diagramas mediante `mermaid.js` v11 desde CDN).

---

# FASE 1: INSPECCIÓN OBLIGATORIA DEL CÓDIGO FUENTE (GROUNDING ESTRICTO)

Antes de redactar cualquier documento, lee e inspecciona los siguientes archivos del repositorio para que cada tabla, requisito y diagrama refleje las interfaces, componentes y configuraciones reales (cero placeholders `TODO` o `...`):
- Configuración y Contenedores: `package.json`, `next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`, `Dockerfile`, `docker-compose.yml` y `nginx.conf`.
- Tipos, Datos y Estado:
  - `src/lib/types.ts`: Interfaces `Vehicle`, `VehicleStatus` (`"diagnostico" | "esperando_repuesto" | "reparacion" | "listo"`), `VehicleKind`, `Urgency`, `PartResolutionMode` (`"client" | "chambi"`), `EventTone`, `Mechanic`, `QuoteLine`, `PartRequest`, `LiveEvent`, `ProgressPhoto` y `TimelineStage`.
  - `src/lib/status.ts` (`STATUS_META`, `StatusMeta`), `src/lib/data.ts` (`DEMO_PLATE = "ABC-123"`, vehículos semilla), `src/lib/site.ts`, `src/lib/gsap.ts`, `src/lib/utils.ts`.
  - `src/store/workshop.tsx`: Reducer `useReducer` con las acciones `select`, `startReview`, `requestPart`, `startRepair`, `finish`, `resolvePart`, `tick`, `reset`, y hook `useWorkshop`.
- Componentes en `src/components/`:
  - `dual/`: `DualViewSection.tsx`, `MechanicConsole.tsx`, `ClientDashboard.tsx`, `SyncBridge.tsx`
  - `hero/`: `Hero.tsx`, `LogoStage.tsx`, `PlateSearch.tsx`, `SparkField.tsx`, `VehicleResult.tsx`
  - `parts/`: `PartsSection.tsx`, `PartRequestCard.tsx`, `StatusMorphOverlay.tsx`, `VoiceNote.tsx`
  - `timeline/`: `TimelineSection.tsx`, `PhoneFrame.tsx`, `StageScreens.tsx`, `MobileStageCard.tsx`
  - `trust/`: `StatsSection.tsx`, `layout/`: `Header.tsx`, `Footer.tsx`, `shared/`: `VehicleSwitcher.tsx`, `providers/`: `SmoothScrollProvider.tsx`, `ui/`: `FitBox.tsx`, `Logo.tsx`, `ProgressBar.tsx`, `SectionHeading.tsx`, `StatusBadge.tsx`, y `src/hooks/useFitScale.ts`.

---

# FASE 2: ESTRUCTURA DE DIRECTORIOS Y ARCHIVOS A CREAR

Genera la siguiente estructura de archivos completa:

docs/
├── index.html                                      # Portal Maestro Interactivo SPA con visor de los 10 manuales y galería de diagramas
├── md/
│   ├── 00-indice-general-gob-iso.md                # Índice Maestro, Control Documental y Mapa de Normas ISO
│   ├── 01-arquitectura-software-iso12207.md        # Arquitectura As-Is y To-Be, C4, Árbol de Componentes y Estado
│   ├── 02-requisitos-srs-iso29148.md               # Especificación de Requisitos Funcionales (RF), No Funcionales (RNF) y Trazabilidad
│   ├── 03-sgsi-seguridad-iso27001.md               # SGSI Cláusulas 4-10, Inventario de Activos, Matriz de Riesgos y Tratamiento
│   ├── 04-declaracion-aplicabilidad-soa-27002.md   # Declaración de Aplicabilidad (SoA) Anexo A ISO/IEC 27001:2022 aplicada al código
│   ├── 05-procesos-flujos-mejorados-iso9001.md     # Rediseño de Flujos de Trabajo (As-Is 4 etapas -> To-Be 8 etapas), SLAs y SOPs
│   ├── 06-catalogo-diagramas-procesos.md           # Catálogo Central de los 8 Diagramas de Flujo, Estado, Secuencia, Seguridad y Datos
│   ├── 07-calidad-software-iso25010.md             # Modelo de Calidad ISO/IEC 25010 (8 características) y Métricas de Desempeño
│   ├── 08-devsecops-despliegue-contenedores.md     # Auditoría y Endurecimiento de Dockerfile, docker-compose.yml y nginx.conf
│   └── 09-plan-continuidad-auditoria-bcp.md        # Plan de Continuidad (A.5.29/A.5.30), Respaldos (A.8.13) y Respuesta a Incidentes
└── html/
    ├── 00-indice-general-gob-iso.html
    ├── 01-arquitectura-software-iso12207.html
    ├── 02-requisitos-srs-iso29148.html
    ├── 03-sgsi-seguridad-iso27001.html
    ├── 04-declaracion-aplicabilidad-soa-27002.html
    ├── 05-procesos-flujos-mejorados-iso9001.html
    ├── 06-catalogo-diagramas-procesos.html
    ├── 07-calidad-software-iso25010.html
    ├── 08-devsecops-despliegue-contenedores.html
    └── 09-plan-continuidad-auditoria-bcp.html

Actualiza también el `README.md` en la raíz del proyecto con el resumen arquitectónico, comandos Docker y enlaces directos a `docs/index.html` y `docs/md/00-indice-general-gob-iso.md`.

---

# FASE 3: CONTENIDO OBLIGATORIO Y REDISEÑO DE FLUJOS DE TRABAJO

## 1. Mejora Integral de los Flujos de Trabajo (Documento 05)
Contrasta el flujo actual (`As-Is` de 4 estados en `workshop.tsx`) frente al nuevo **Flujo de Trabajo Mejorado (`To-Be`) de 8 Etapas** bajo ISO 9001:2015 e ISO/IEC 27001:2022:
1. `recepcion_checkin` (0%-15%): Check-in físico del vehículo, inventario, kilometraje, fotografías perimetrales con hash SHA-256 y entrega de `orderCode` (`OT-XXXX`) + PIN seguro al propietario.
2. `diagnostico` (15%-35%): Inspección por mecánico autenticado (`Mechanic`), subida de `ProgressPhoto` con foco/zoom y grabación de `VoiceNote` firmada.
3. `cotizacion_emitida` (35%-45%): Emisión formal de `PartRequest` con nivel de urgencia (`alta`, `media`, `baja`), desglose `QuoteLine[]` y SLAs comparativos (`clientDeadline` vs `chambiEta`).
4. `esperando_repuesto` (45%-52%): Decisión bilateral del cliente (`PartResolutionMode`: `"chambi"` o `"client"`) con firma digital de no-repudio.
5. `validacion_repuesto` (52%-62%) [NUEVA ETAPA CRÍTICA ISO 9001 8.5.3]: Inspección física y validación técnica de compatibilidad del repuesto antes de entrar a bahía (obligatoria tanto cuando el cliente suministra la pieza en modo `"client"` como al recibir de proveedor en modo `"chambi"`), incluyendo el flujo de rechazo por "Pieza No Conforme".
6. `reparacion` (62%-85%): Ejecución mecánica con registro de hitos en `LiveEvent[]` y fotografía obligatoria del repuesto nuevo instalado.
7. `control_calidad` (85%-95%) [NUEVA ETAPA CRÍTICA ISO 9001 8.6]: Checklist de torque, fluidos, escaneo electrónico OBD-II y prueba de ruta aprobada por un supervisor distinto al mecánico ejecutor (Segregación de funciones ISO 27001 `A.5.3`).
8. `listo` y `entregado` (95%-100%): Notificación al cliente, liquidación final, acta de conformidad digital y activación del certificado de garantía.
- Documenta además los flujos de excepción: `ot_pausada` (por rechazo de cotización o vencimiento de SLA), hallazgo de daño oculto en reparación y reingreso por garantía.

## 2. Seguridad ISO/IEC 27001:2022 y Remediación de Hallazgos Reales (Documentos 03, 04 y 08)
Documenta el SGSI completo, la Matriz de Riesgos y la Declaración de Aplicabilidad (SoA) abordando los hallazgos reales del repositorio:
- **Control `A.5.15`, `A.8.3` y `A.8.11` (Control de acceso y Enmascaramiento de PII)**: En `PlateSearch.tsx` y `findByPlate`, la búsqueda pública solo por placa debe enmascarar el nombre del propietario (`owner`) y ocultar fotos/montos (`QuoteLine[]`), exigiendo el código `orderCode` (`OT-2481`) + PIN/Token para abrir el expediente completo.
- **Control `A.8.2` y `A.5.3` (Accesos privilegiados y Segregación de roles)**: Separación autenticada por RBAC (JWT Rol `MECHANIC` para `MechanicConsole` vs. Token de Orden para `ClientDashboard`).
- **Control `A.8.15`, `A.8.17` y `A.8.24` (Auditoría inmutable, NTP y Criptografía)**: Evolución de `LiveEvent[]` hacia una bitácora append-only firmada con HMAC-SHA256, sellos de tiempo NTP y hash SHA-256 para cada `ProgressPhoto` y `VoiceNote`.
- **Control `A.8.20`, `A.8.21` y `A.8.26` (Seguridad en Contenedores y Redes)**: Solución al conflicto del `Dockerfile` donde `USER nextjs` (UID 1001) intenta abrir el puerto privilegiado `PORT=80` (migrar a `PORT=3000` interno) e integración activa del archivo `nginx.conf` dentro de `docker-compose.yml` como Reverse Proxy WAF con TLS 1.3, HSTS, CSP y Rate Limiting (`limit_req_zone`).

## 3. Catálogo Obligatorio de 8 Diagramas Mermaid (Documento 06 y embebidos en cada manual)
Incluye los siguientes 8 diagramas completos y sintácticamente válidos en Mermaid v11:
1. **Diagrama de Flujo Maestro End-to-End con Carriles (Swimlanes)**: Cliente/Flota, Consola Mecánico, Core Chambi Motors (`SyncBridge` / SGSI) y Control de Calidad (QA).
2. **Diagrama de Máquina de Estados (`stateDiagram-v2`)**: Transiciones completas de las 8 etapas operativas y estados de excepción (`ot_pausada`, `entregado_sin_reparar`).
3. **Diagrama de Flujo del Subproceso de Repuestos (`PartRequest` y `PartResolutionMode`)**: Bifurcación `"chambi"` vs `"client"` e inspección técnica de conformidad.
4. **Diagrama de Secuencia UML (`sequenceDiagram`)**: Sincronización en tiempo real entre `MechanicConsole`, API/WebSocket Seguro, Bitácora ISO 27001 y `ClientDashboard`.
5. **Diagrama de Flujo de Seguridad en Búsqueda por Placa (`PlateSearch.tsx`)**: Rate Limiting en Nginx, vista pública enmascarada (A.8.11) y validación de token OT.
6. **Diagrama de Arquitectura C4 (Contexto y Contenedores)**: Clientes, Nginx Reverse Proxy WAF, Contenedor Next.js Standalone (`chambi-motors-web:3000`), PostgreSQL 16 y Object Storage S3/MinIO.
7. **Diagrama Entidad-Relación (`erDiagram`)**: Modelo de datos relacional persistente (`vehicles`, `work_orders`, `mechanics`, `part_requests`, `quote_lines`, `progress_photos`, `live_events`, `audit_logs_iso27001`, `qa_checklists`).
8. **Diagrama de Flujo del Pipeline DevSecOps y Contenerización Segura**: Linter, TypeScript Strict, SAST, generación documental, build multi-stage Docker, escaneo Trivy y despliegue.

---

# FASE 4: ESTRATEGIA DE GENERACIÓN DETERMINISTA (ANTI-TRUNCAMIENTO)

1. Crea un script generador en Node.js (`scripts/generate-iso-docs.mjs`) que escriba de forma programática y completa los 10 archivos en `docs/md/*.md`, los envuelva en una plantilla HTML5 interactiva con soporte de `mermaid.js` v11 hacia `docs/html/*.html`, y construya el portal `docs/index.html`.
2. Ejecuta `node scripts/generate-iso-docs.mjs` desde la terminal y comprueba que los 21 archivos de `docs/` más el `README.md` se hayan generado sin errores ni contenido truncado.
```

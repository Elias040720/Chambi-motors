import type { PartRequest, TimelineStage, Vehicle } from "./types";

type PartTemplate = Omit<PartRequest, "resolution">;

const CLUTCH: PartTemplate = {
  id: "part-clutch",
  name: "Kit de Embrague (disco, plato y collarín)",
  spec: "Compatible Toyota Hiace 2.5 D‑4D · Calidad original",
  image: "/images/parts/clutch.jpg",
  mechanicNote:
    "El disco está al ras y el plato tiene fisuras. Sin kit nuevo no puedo cerrar la caja. Recomiendo marca original.",
  voiceNoteSeconds: 14,
  urgency: "alta",
  quote: [
    { label: "Kit de embrague 3 piezas", amount: 465 },
    { label: "Rectificado de volante motor", amount: 55 },
    { label: "Gestión y flete Chambi", amount: 20 },
  ],
  clientDeadline: "Hoy antes de las 4:00 p. m.",
  chambiEta: "Llega hoy a las 3:30 p. m.",
};

const BRAKES: PartTemplate = {
  id: "part-brakes",
  name: "Pastillas de Freno Cerámicas + Discos",
  spec: "Juego delantero · Kia Rio 1.4 · Baja generación de polvo",
  image: "/images/parts/brakes.jpg",
  mechanicNote:
    "Las pastillas están en 2 mm y los discos ya tienen surco. Por seguridad conviene cambiar el juego completo.",
  voiceNoteSeconds: 11,
  urgency: "media",
  quote: [
    { label: "Pastillas cerámicas delanteras", amount: 185 },
    { label: "Líquido de frenos DOT 4", amount: 35 },
    { label: "Gestión y flete Chambi", amount: 15 },
  ],
  clientDeadline: "Hoy antes de las 2:00 p. m.",
  chambiEta: "Llega hoy a las 12:45 p. m.",
};

const SHOCKS: PartTemplate = {
  id: "part-shocks",
  name: "Amortiguadores Traseros Reforzados (par)",
  spec: "Hyundai H100 · Carga pesada · Con bases y bocinas",
  image: "/images/parts/shocks.jpg",
  mechanicNote:
    "Fugan aceite y el eje trasero rebota con carga. Para el reparto diario hay que cambiarlos ya.",
  voiceNoteSeconds: 9,
  urgency: "alta",
  quote: [
    { label: "Amortiguadores traseros (par)", amount: 390 },
    { label: "Bocinas y bases de montaje", amount: 70 },
    { label: "Gestión y flete Chambi", amount: 20 },
  ],
  clientDeadline: "Mañana antes de las 9:00 a. m.",
  chambiEta: "Llega mañana a las 8:30 a. m.",
};

const part = (t: PartTemplate): PartRequest => ({ ...t, resolution: null });

export const SEED_VEHICLES: Vehicle[] = [
  {
    plate: "ABC-123",
    orderCode: "OT-2481",
    make: "Toyota",
    model: "Hiace Combi",
    year: 2016,
    kind: "combi",
    color: "Blanco",
    owner: "Transportes Los Andes",
    photo: "/images/vehicles/hiace.jpg",
    service: "Cambio de embrague + revisión de caja",
    status: "esperando_repuesto",
    progress: 38,
    mechanic: { name: "Henry Chambi", role: "Motor y transmisión", initials: "HC" },
    eta: "Hoy, 6:00 p. m.",
    intakeAt: "Hoy, 8:15 a. m.",
    photos: [
      { id: "p1", src: "/images/vehicles/hiace.jpg", caption: "Ingreso · frente", time: "08:20", focus: "70% 55%", zoom: 1.0 },
      { id: "p2", src: "/images/vehicles/hiace.jpg", caption: "Llanta delantera", time: "08:24", focus: "42% 80%", zoom: 2.2 },
      { id: "p3", src: "/images/parts/clutch.jpg", caption: "Embrague desgastado", time: "10:05", focus: "50% 50%", zoom: 1.0 },
      { id: "p4", src: "/images/vehicles/hiace.jpg", caption: "Tablero · km 214 880", time: "08:31", focus: "58% 36%", zoom: 2.4 },
    ],
    events: [
      { id: "e3", time: "10:07", tone: "alert", title: "Falta un repuesto", detail: "Kit de embrague: elige cómo conseguirlo.", source: "mecanico" },
      { id: "e2", time: "10:05", tone: "info", title: "Diagnóstico completo", detail: "Embrague patina en 3.ª y 4.ª. Se recomienda cambio.", source: "mecanico" },
      { id: "e1", time: "08:20", tone: "success", title: "Vehículo recibido", detail: "Registro fotográfico de 12 puntos listo.", source: "sistema" },
    ],
    part: part(CLUTCH),
    partTemplate: CLUTCH,
    syncTick: 0,
  },
  {
    plate: "V3R-482",
    orderCode: "OT-2479",
    make: "Kia",
    model: "Rio Hatchback",
    year: 2019,
    kind: "auto",
    color: "Gris plata",
    owner: "Lucía M.",
    photo: "/images/vehicles/rio.jpg",
    service: "Frenos delanteros + alineamiento y balanceo",
    status: "reparacion",
    progress: 64,
    mechanic: { name: "Marco Huamán", role: "Frenos y suspensión", initials: "MH" },
    eta: "Hoy, 4:30 p. m.",
    intakeAt: "Hoy, 9:00 a. m.",
    photos: [
      { id: "p1", src: "/images/vehicles/rio.jpg", caption: "Ingreso · frente", time: "09:04", focus: "30% 55%", zoom: 1.0 },
      { id: "p2", src: "/images/vehicles/rio.jpg", caption: "Rueda en el elevador", time: "09:40", focus: "55% 75%", zoom: 2.0 },
      { id: "p3", src: "/images/parts/brakes.jpg", caption: "Pastillas retiradas", time: "10:25", focus: "30% 60%", zoom: 1.4 },
      { id: "p4", src: "/images/vehicles/rio.jpg", caption: "Luz de frenos", time: "09:12", focus: "20% 60%", zoom: 2.3 },
    ],
    events: [
      { id: "e3", time: "11:10", tone: "progress", title: "Reparación en curso", detail: "Marco instala las pastillas nuevas.", source: "mecanico" },
      { id: "e2", time: "10:30", tone: "success", title: "Repuesto aprobado", detail: "Pastillas cerámicas: compra autorizada.", source: "cliente" },
      { id: "e1", time: "09:04", tone: "success", title: "Vehículo recibido", detail: "Registro fotográfico listo.", source: "sistema" },
    ],
    part: null,
    partTemplate: BRAKES,
    syncTick: 0,
  },
  {
    plate: "F7H-905",
    orderCode: "OT-2483",
    make: "Hyundai",
    model: "H100 Porter",
    year: 2014,
    kind: "camioneta",
    color: "Blanco",
    owner: "Distribuidora Quispe",
    photo: "/images/vehicles/h100.jpg",
    service: "Suspensión trasera + mantenimiento 80 000 km",
    status: "diagnostico",
    progress: 12,
    mechanic: { name: "Jhon Condori", role: "Suspensión y carga", initials: "JC" },
    eta: "Mañana, 11:00 a. m.",
    intakeAt: "Hoy, 11:40 a. m.",
    photos: [
      { id: "p1", src: "/images/vehicles/h100.jpg", caption: "Ingreso · frente", time: "11:44", focus: "25% 55%", zoom: 1.0 },
      { id: "p2", src: "/images/vehicles/h100.jpg", caption: "Eje trasero", time: "11:52", focus: "85% 80%", zoom: 2.2 },
      { id: "p3", src: "/images/parts/shocks.jpg", caption: "Amortiguador con fuga", time: "12:05", focus: "50% 55%", zoom: 1.0 },
      { id: "p4", src: "/images/vehicles/h100.jpg", caption: "Tolva y carga", time: "11:49", focus: "88% 55%", zoom: 1.8 },
    ],
    events: [
      { id: "e2", time: "11:52", tone: "info", title: "Revisión iniciada", detail: "Jhon inspecciona suspensión y frenos.", source: "mecanico" },
      { id: "e1", time: "11:44", tone: "success", title: "Vehículo recibido", detail: "Registro fotográfico listo.", source: "sistema" },
    ],
    part: null,
    partTemplate: SHOCKS,
    syncTick: 0,
  },
];

export const DEMO_PLATE = "ABC-123";

export const TIMELINE_STAGES: TimelineStage[] = [
  {
    id: "recepcion",
    index: 0,
    title: "Recepción e Inspección Inicial",
    short: "Recepción",
    description:
      "Tu vehículo entra al taller y el mecánico documenta cada punto con fotos y un diagnóstico inicial. Tú lo ves al instante.",
    status: "diagnostico",
    notification: {
      title: "Vehículo recibido",
      body: "Registro de 12 fotos listo. Henry inicia la inspección.",
      time: "08:20",
    },
    metric: { label: "Fotos de ingreso", value: "12" },
  },
  {
    id: "diagnostico",
    index: 1,
    title: "Diagnóstico y Lista de Repuestos",
    short: "Diagnóstico",
    description:
      "Si falta una pieza, tu celular suena en ese momento: ves el repuesto, la nota del mecánico y decides en un toque.",
    status: "esperando_repuesto",
    notification: {
      title: "Falta un repuesto",
      body: "Kit de embrague · Urgencia alta. Elige cómo conseguirlo.",
      time: "10:07",
    },
    metric: { label: "Tiempo de aviso", value: "< 2 s" },
  },
  {
    id: "reparacion",
    index: 2,
    title: "Reparación Mecánica en Curso",
    short: "Reparación",
    description:
      "Barra de avance porcentual en vivo y el nombre del mecánico asignado. Sabes qué se hace, no tienes que preguntar.",
    status: "reparacion",
    notification: {
      title: "Reparación en curso · 62%",
      body: "Henry Chambi instala el nuevo disco y plato.",
      time: "13:10",
    },
    metric: { label: "Avance actual", value: "62%" },
  },
  {
    id: "pruebas",
    index: 3,
    title: "Pruebas de Ruta y Control de Calidad",
    short: "Pruebas",
    description:
      "Antes de entregarlo, prueba de ruta y lista de seguridad verificada punto por punto. Cero sorpresas al recogerlo.",
    status: "reparacion",
    notification: {
      title: "Prueba de ruta aprobada",
      body: "8,4 km sin ruidos. Frenos y embrague verificados.",
      time: "16:35",
    },
    metric: { label: "Puntos verificados", value: "18 / 18" },
  },
  {
    id: "listo",
    index: 4,
    title: "Vehículo Listo para Recojo",
    short: "Listo",
    description:
      "Aviso automático y resumen transparente del servicio: qué se hizo, qué repuestos se usaron y cuánto cuesta. Sin letra chica.",
    status: "listo",
    notification: {
      title: "¡Tu vehículo está listo!",
      body: "Recógelo hoy hasta las 6:00 p. m. Resumen enviado.",
      time: "17:20",
    },
    metric: { label: "Llamadas hechas", value: "0" },
  },
];

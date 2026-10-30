/**
 * Identidad visual. Los datos de contacto reales se configuran antes de publicar.
 */
export const SITE = {
  name: "Chambi Motors",
  tagline: "Precisión mecánica, servicio transparente",
  description: "CHAMBI MOTORS: taller mecánico con seguimiento privado de órdenes de trabajo.",
  address: "",
  phoneDisplay: "",
  whatsappNumber: "",
  whatsappMessage:
    "Hola Chambi Motors, quisiera agendar una revisión para mi vehículo.",
  hours: [
    { days: "Lunes a Viernes", time: "8:00 a. m. – 6:00 p. m." },
    { days: "Sábados", time: "8:00 a. m. – 1:00 p. m." },
    { days: "Domingos y feriados", time: "Solo emergencias" },
  ],
} as const;

export const whatsappUrl = (message: string = SITE.whatsappMessage) =>
  SITE.whatsappNumber ? `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}` : "";

export const NAV_LINKS = [
  { href: "#consulta", label: "Seguimiento en Vivo" },
  { href: "#repuestos", label: "Repuestos" },
  { href: "#como-funciona", label: "Cómo Funciona" },
  { href: "#taller", label: "Acceso Taller" },
] as const;

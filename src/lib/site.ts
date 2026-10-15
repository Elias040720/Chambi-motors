/**
 * Configuración editable del negocio.
 * Los datos de contacto son de demostración: reemplázalos antes de publicar.
 */
export const SITE = {
  name: "Chambi Motors",
  tagline: "Precisión mecánica, estado en tiempo real",
  description:
    "Taller mecánico digital: sigue el avance de tu vehículo en tiempo real, aprueba repuestos con un toque y olvídate de las llamadas de seguimiento.",
  address: "Av. Industrial 1450, Zona Taller · Lima, Perú",
  phoneDisplay: "+51 999 000 000",
  whatsappNumber: "51999000000",
  whatsappMessage:
    "Hola Chambi Motors, quisiera agendar una revisión para mi vehículo.",
  hours: [
    { days: "Lunes a Viernes", time: "8:00 a. m. – 6:00 p. m." },
    { days: "Sábados", time: "8:00 a. m. – 1:00 p. m." },
    { days: "Domingos y feriados", time: "Solo emergencias" },
  ],
} as const;

export const whatsappUrl = (message: string = SITE.whatsappMessage) =>
  `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(message)}`;

export const NAV_LINKS = [
  { href: "#consulta", label: "Seguimiento en Vivo" },
  { href: "#repuestos", label: "Repuestos" },
  { href: "#como-funciona", label: "Cómo Funciona" },
  { href: "#taller", label: "Acceso Taller" },
] as const;

/**
 * Genera las variantes optimizadas del logo oficial (images/Logo.jpg):
 *  - logo-emblem.webp : solo el emblema (auto + llave + engranaje)
 *  - logo-full.webp   : emblema + wordmark CHAMBI MOTORS
 *  - src/app/icon.png : favicon
 * Se aplica una corrección lineal para que el fondo del JPG (#15191D)
 * coincida con el carbono mate del sistema de diseño (#121417) y las
 * piezas se fundan sin costuras con la interfaz.
 *
 * Uso: node scripts/prepare-logo.mjs
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "images", "Logo.jpg");
const out = (...p) => path.join(root, ...p);

const base = () => sharp(src).linear([1, 1, 1], [-3, -5, -6]);

await base()
  .extract({ left: 470, top: 380, width: 1210, height: 800 })
  .webp({ quality: 92 })
  .toFile(out("public", "images", "logo-emblem.webp"));

await base()
  .extract({ left: 300, top: 380, width: 1450, height: 1280 })
  .webp({ quality: 92 })
  .toFile(out("public", "images", "logo-full.webp"));

await base()
  .extract({ left: 500, top: 430, width: 1160, height: 770 })
  .resize(256, 256, { fit: "contain", background: "#121417" })
  .png()
  .toFile(out("src", "app", "icon.png"));

console.log("Logo variants generated.");

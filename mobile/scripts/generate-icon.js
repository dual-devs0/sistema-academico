/**
 * Genera assets/icon.png (1024x1024) para la app UCA:
 * - Fondo navy #0a0e17
 * - Círculo cian sutil (stroke 3px, escalado proporcional a 1024)
 * - Logo UC oficial centrado, escalado a 600px de diámetro
 *
 * Uso: node scripts/generate-icon.js
 * Requiere `sharp` (instalado con --no-save, solo para este script).
 */
const sharp = require("sharp");
const path = require("path");

const SIZE = 1024;
const LOGO_DIAMETER = 600;
const STROKE_WIDTH = 3;
const BG = "#0a0e17";
const STROKE = "#00b4d8";

async function main() {
  const assetsDir = path.join(__dirname, "..", "assets");
  const logoPath = path.join(assetsDir, "uc-logo.png");
  const outPath = path.join(assetsDir, "icon.png");

  // Logo redimensionado a un círculo de LOGO_DIAMETER, con leve padding
  // interno para que el stroke no lo toque.
  const logoBuffer = await sharp(logoPath)
    .resize(LOGO_DIAMETER, LOGO_DIAMETER, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Círculo con stroke cian, radio = LOGO_DIAMETER/2 + margen para que el
  // trazo quede levemente separado del logo (respiro visual).
  const strokeRadius = LOGO_DIAMETER / 2 + 24;
  const circleSvg = `
    <svg width="${SIZE}" height="${SIZE}">
      <circle
        cx="${SIZE / 2}"
        cy="${SIZE / 2}"
        r="${strokeRadius}"
        fill="none"
        stroke="${STROKE}"
        stroke-width="${STROKE_WIDTH}"
        stroke-opacity="0.55"
      />
    </svg>
  `;

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      { input: Buffer.from(circleSvg), top: 0, left: 0 },
      {
        input: logoBuffer,
        top: Math.round((SIZE - LOGO_DIAMETER) / 2),
        left: Math.round((SIZE - LOGO_DIAMETER) / 2),
      },
    ])
    .png()
    .toFile(outPath);

  console.log(`icon.png generado en ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

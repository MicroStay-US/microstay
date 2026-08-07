// Generate ALL favicon + PWA icons from MicroStay_logo.png.
// Output:
//   app/favicon.ico          → /favicon.ico   (16+32+48 ICO)
//   app/icon.png             → /icon.png      (512×512)
//   app/apple-icon.png       → /apple-icon.png (180×180 iOS)
//   public/icon-192.png      → /icon-192.png  (Chrome Android)
//   public/icon-512.png      → /icon-512.png  (Chrome/Discover)
//   public/icon-maskable.png → /icon-maskable.png (PWA maskable)
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/MicroStay_logo.png';
const src = sharp(SRC);
const meta = await src.metadata();
console.log('Source:', meta.width + 'x' + meta.height, meta.format);

// ── Next.js /app/ convention files ────────────────────────────
await sharp(SRC).resize(512, 512).png().toFile('app/icon.png');
console.log('✓ app/icon.png (512×512)');

await sharp(SRC).resize(180, 180).png().toFile('app/apple-icon.png');
console.log('✓ app/apple-icon.png (180×180 Apple touch)');

// ── /public/ icons for manifest.json references ───────────────
await sharp(SRC).resize(192, 192).png().toFile('public/icon-192.png');
console.log('✓ public/icon-192.png');

await sharp(SRC).resize(512, 512).png().toFile('public/icon-512.png');
console.log('✓ public/icon-512.png');

// Maskable icon — PWA spec requires the important content to fit in a
// centered 80% safe zone. We add a 10% padding on all sides so the logo
// renders correctly even when Android clips it into a circle/rounded square.
const MASK_SIZE = 512;
const LOGO_SIZE = Math.round(MASK_SIZE * 0.8);
const logoPng = await sharp(SRC).resize(LOGO_SIZE, LOGO_SIZE).png().toBuffer();
await sharp({
  create: {
    width: MASK_SIZE,
    height: MASK_SIZE,
    channels: 4,
    background: { r: 255, g: 94, b: 26, alpha: 1 }, // MicroStay orange
  },
})
  .composite([{ input: logoPng, gravity: 'center' }])
  .png()
  .toFile('public/icon-maskable.png');
console.log('✓ public/icon-maskable.png (512×512 on MS orange background)');

// ── favicon.ico (multi-size PNG-in-ICO) ───────────────────────
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((s) => sharp(SRC).resize(s, s).png({ compressionLevel: 9 }).toBuffer())
);

const ICONDIR_SIZE = 6;
const ICONDIRENTRY_SIZE = 16;
const headerSize = ICONDIR_SIZE + sizes.length * ICONDIRENTRY_SIZE;

const buffers = [];
const header = Buffer.alloc(ICONDIR_SIZE);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
buffers.push(header);

let offset = headerSize;
for (let i = 0; i < sizes.length; i++) {
  const size = sizes[i];
  const png = pngs[i];
  const entry = Buffer.alloc(ICONDIRENTRY_SIZE);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  buffers.push(entry);
  offset += png.length;
}
for (const png of pngs) buffers.push(png);

const ico = Buffer.concat(buffers);
fs.writeFileSync('app/favicon.ico', ico);
console.log(`✓ app/favicon.ico (${ico.length} bytes, embeds ${sizes.join('+')} PNG)`);

// ── manifest.json (PWA / Chrome Discover / Android home screen) ──
const manifest = {
  name: 'MicroStay',
  short_name: 'MicroStay',
  description: 'Find and book nearby motels for flexible hourly stays. Pay at front desk, no prepayment needed.',
  start_url: '/',
  display: 'standalone',
  background_color: '#FFF1EC',
  theme_color: '#FF5E1A',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync('public/manifest.json', JSON.stringify(manifest, null, 2));
console.log('✓ public/manifest.json (PWA manifest)');

console.log('\nAll icons generated. Deploy to update everywhere.');

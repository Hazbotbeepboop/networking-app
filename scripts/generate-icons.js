// Generates logo192.png and logo512.png for Varys PWA icons
// Pure Node.js — no dependencies required
// Run: node scripts/generate-icons.js

const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const NAVY = [28, 43, 58, 255]
const GOLD = [176, 141, 87, 255]

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function generateVPixels(size) {
  const s = size / 192
  // V arms: top-left → tip, top-right → tip
  const ax1 = 58 * s, ay1 = 38 * s, bx1 = 96 * s, by1 = 154 * s
  const ax2 = 134 * s, ay2 = 38 * s, bx2 = 96 * s, by2 = 154 * s
  const hw = 15 * s  // half stroke width

  const pixels = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(
        distToSegment(x + 0.5, y + 0.5, ax1, ay1, bx1, by1),
        distToSegment(x + 0.5, y + 0.5, ax2, ay2, bx2, by2)
      )
      // 1px anti-aliased edge
      const t = Math.max(0, Math.min(1, (hw + 0.5 - d)))
      const i = (y * size + x) * 4
      pixels[i]     = Math.round(NAVY[0] + (GOLD[0] - NAVY[0]) * t)
      pixels[i + 1] = Math.round(NAVY[1] + (GOLD[1] - NAVY[1]) * t)
      pixels[i + 2] = Math.round(NAVY[2] + (GOLD[2] - NAVY[2]) * t)
      pixels[i + 3] = 255
    }
  }
  return pixels
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF]
  return (c ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcVal = crc32(Buffer.concat([typeBuf, data]))
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crcVal)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function writePNG(pixels, size, filename) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6  // 8-bit RGBA

  const stride = 1 + size * 4
  const raw = Buffer.alloc(size * stride)
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4
      const d = y * stride + 1 + x * 4
      raw[d] = pixels[s]; raw[d+1] = pixels[s+1]; raw[d+2] = pixels[s+2]; raw[d+3] = pixels[s+3]
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 })
  fs.writeFileSync(filename, Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0))
  ]))
  console.log(`✓ Generated ${path.basename(filename)} (${size}×${size})`)
}

const out = path.join(__dirname, '..', 'client', 'public')
writePNG(generateVPixels(192), 192, path.join(out, 'logo192.png'))
writePNG(generateVPixels(512), 512, path.join(out, 'logo512.png'))
console.log('Done.')

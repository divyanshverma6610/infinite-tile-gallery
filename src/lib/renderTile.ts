/**
 * Render a 32x32 pixel array to a base64-encoded PNG string.
 * Each pixel is a hex color string like "#000000" or "#ffffff".
 * We use a simple manual PNG encoder to avoid sharp dependency issues.
 */

// CRC32 table
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeUint32BE(arr: number[], val: number) {
  arr.push((val >>> 24) & 0xff);
  arr.push((val >>> 16) & 0xff);
  arr.push((val >>> 8) & 0xff);
  arr.push(val & 0xff);
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const out: number[] = [];
  writeUint32BE(out, data.length);
  for (let i = 0; i < 4; i++) out.push(type.charCodeAt(i));
  for (let i = 0; i < data.length; i++) out.push(data[i]);
  // CRC over type+data
  const typeAndData = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) typeAndData[i] = type.charCodeAt(i);
  typeAndData.set(data, 4);
  const crc = crc32(typeAndData);
  writeUint32BE(out, crc);
  return new Uint8Array(out);
}

// Adler-32 checksum
function adler32(data: Uint8Array): number {
  let a = 1,
    b = 0;
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// Simple deflate (store only, no compression) with zlib wrapper
function zlibDeflateStore(data: Uint8Array): Uint8Array {
  // zlib header: CMF=0x78, FLG=0x01
  const maxBlock = 65535;
  const blocks: Uint8Array[] = [];
  let offset = 0;
  while (offset < data.length) {
    const remaining = data.length - offset;
    const blockSize = Math.min(remaining, maxBlock);
    const isLast = offset + blockSize >= data.length;
    const header = new Uint8Array(5);
    header[0] = isLast ? 0x01 : 0x00;
    header[1] = blockSize & 0xff;
    header[2] = (blockSize >> 8) & 0xff;
    header[3] = (~blockSize) & 0xff;
    header[4] = ((~blockSize) >> 8) & 0xff;
    blocks.push(header);
    blocks.push(data.subarray(offset, offset + blockSize));
    offset += blockSize;
  }
  const adler = adler32(data);
  const totalLen =
    2 + blocks.reduce((s, b) => s + b.length, 0) + 4;
  const result = new Uint8Array(totalLen);
  result[0] = 0x78;
  result[1] = 0x01;
  let pos = 2;
  for (const block of blocks) {
    result.set(block, pos);
    pos += block.length;
  }
  result[pos] = (adler >> 24) & 0xff;
  result[pos + 1] = (adler >> 16) & 0xff;
  result[pos + 2] = (adler >> 8) & 0xff;
  result[pos + 3] = adler & 0xff;
  return result;
}

function hexToRgba(hex: string): [number, number, number, number] {
  if (!hex || hex === "transparent" || hex === "") {
    return [255, 255, 255, 0];
  }
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return [r, g, b, 255];
}

export function renderPixelsToPngBase64(pixels: string[][]): string {
  const size = 32;
  // Build raw RGBA pixel data with filter byte per row
  const rawData = new Uint8Array(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (1 + size * 4);
    rawData[rowOffset] = 0; // no filter
    for (let x = 0; x < size; x++) {
      const color = pixels[y]?.[x] || "#ffffff";
      const [r, g, b, a] = hexToRgba(color);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // PNG signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = new Uint8Array(13);
  const ihdrView = new DataView(ihdrData.buffer);
  ihdrView.setUint32(0, size); // width
  ihdrView.setUint32(4, size); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk("IHDR", ihdrData);

  // IDAT
  const compressed = zlibDeflateStore(rawData);
  const idat = makeChunk("IDAT", compressed);

  // IEND
  const iend = makeChunk("IEND", new Uint8Array(0));

  // Concatenate
  const png = new Uint8Array(
    signature.length + ihdr.length + idat.length + iend.length
  );
  let off = 0;
  png.set(signature, off);
  off += signature.length;
  png.set(ihdr, off);
  off += ihdr.length;
  png.set(idat, off);
  off += idat.length;
  png.set(iend, off);

  // Convert to base64
  let binary = "";
  for (let i = 0; i < png.length; i++) {
    binary += String.fromCharCode(png[i]);
  }
  return btoa(binary);
}

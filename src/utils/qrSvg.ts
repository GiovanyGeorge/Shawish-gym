/**
 * Compact QR Code (byte mode, ECC-M) for short offline identifiers.
 * Encodes member codes such as SHW0003 without an external API.
 */

const ECC_TABLE: Record<number, { total: number; data: number; ec: number }> = {
  1: { total: 26, data: 16, ec: 10 },
  2: { total: 44, data: 28, ec: 16 },
  3: { total: 70, data: 44, ec: 26 },
  4: { total: 100, data: 64, ec: 36 },
  5: { total: 134, data: 86, ec: 48 },
};

const EXP = new Array<number>(512);
const LOG = new Array<number>(256);

(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (!a || !b) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGenerator(ecLen: number): number[] {
  let poly = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGenerator(ecLen);
  const res = data.concat(new Array(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j++) {
      res[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return res.slice(data.length);
}

function bitsToBytes(bits: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | (bits[i + j] ?? 0);
    out.push(v);
  }
  return out;
}

function encodeData(text: string, version: number): number[] {
  const info = ECC_TABLE[version]!;
  const bytes = Array.from(new TextEncoder().encode(text));
  const bits: number[] = [];
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const capacity = info.data * 8;
  const remain = capacity - bits.length;
  if (remain < 0) throw new Error("QR payload too long.");
  push(0, Math.min(4, remain));
  while (bits.length % 8 !== 0) bits.push(0);
  const data = bitsToBytes(bits);
  const pad = [0xec, 0x11];
  let p = 0;
  while (data.length < info.data) data.push(pad[p++ % 2]!);
  const ec = rsEncode(data, info.ec);
  return data.concat(ec);
}

function sizeOf(version: number): number {
  return 21 + (version - 1) * 4;
}

function isReserved(row: number, col: number, n: number): boolean {
  if (row < 9 && col < 9) return true;
  if (row < 9 && col >= n - 8) return true;
  if (row >= n - 8 && col < 9) return true;
  if (row === 6 || col === 6) return true;
  return false;
}

function placeFinder(mod: number[][], r: number, c: number): void {
  for (let y = -1; y <= 7; y++) {
    for (let x = -1; x <= 7; x++) {
      const rr = r + y;
      const cc = c + x;
      if (rr < 0 || cc < 0 || rr >= mod.length || cc >= mod.length) continue;
      const on =
        x === -1 || x === 7 || y === -1 || y === 7
          ? 0
          : x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)
            ? 1
            : 0;
      if (y >= 0 && y <= 6 && x >= 0 && x <= 6) mod[rr]![cc] = on;
    }
  }
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const on = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      mod[r + y]![c + x] = on ? 1 : 0;
    }
  }
}

function maskBit(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}

function buildMatrix(codewords: number[], version: number): number[][] {
  const n = sizeOf(version);
  const mod = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
  placeFinder(mod, 0, 0);
  placeFinder(mod, 0, n - 7);
  placeFinder(mod, n - 7, 0);
  for (let i = 0; i < n; i++) {
    mod[6]![i] = i % 2 === 0 ? 1 : 0;
    mod[i]![6] = i % 2 === 0 ? 1 : 0;
  }
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (mod[r]![c] === -1) mod[r]![c] = 0;
      if (mod[r]![n - 9 + c] === -1 && n - 9 + c >= 0) mod[r]![n - 9 + c] = 0;
      if (mod[n - 9 + r]![c] === -1 && n - 9 + r >= 0) mod[n - 9 + r]![c] = 0;
    }
  }

  const bits: number[] = [];
  for (const b of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  let bi = 0;
  let dir = -1;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const row = dir < 0 ? n - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (mod[row]![c] !== -1) continue;
        const bit = bits[bi++] ?? 0;
        mod[row]![c] = bit ^ (maskBit(row, c) ? 1 : 0);
      }
    }
    dir *= -1;
  }

  const format = 0b101010000010010;
  const formatPositions: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  formatPositions.forEach(([r, c], i) => {
    const bit = (format >> (14 - i)) & 1;
    mod[r]![c] = bit;
  });
  const other: [number, number][] = [
    [n - 1, 8], [n - 2, 8], [n - 3, 8], [n - 4, 8], [n - 5, 8], [n - 6, 8], [n - 7, 8],
    [8, n - 8], [8, n - 7], [8, n - 6], [8, n - 5], [8, n - 4], [8, n - 3], [8, n - 2], [8, n - 1],
  ];
  other.forEach(([r, c], i) => {
    mod[r]![c] = (format >> (14 - i)) & 1;
  });
  mod[n - 8]![8] = 1;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (mod[r]![c] === -1) mod[r]![c] = isReserved(r, c, n) ? 0 : 0;
    }
  }
  return mod;
}

export function qrModules(text: string): number[][] {
  const payload = text || " ";
  let version = 1;
  while (version <= 5) {
    const info = ECC_TABLE[version]!;
    const bytes = new TextEncoder().encode(payload).length;
    const header = 4 + (version <= 9 ? 8 : 16);
    if ((bytes + 1) * 8 + header + 4 <= info.data * 8) break;
    version += 1;
  }
  if (version > 5) version = 5;
  const codewords = encodeData(payload.slice(0, 80), version);
  return buildMatrix(codewords, version);
}

export function qrSvgMarkup(text: string, size = 160): string {
  const modules = qrModules(text);
  const n = modules.length;
  const quiet = 2;
  const dim = n + quiet * 2;
  let rects = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r]![c]) {
        rects += `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/>${rects}</svg>`;
}

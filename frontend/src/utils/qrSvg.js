// Zero-dependency ISO/IEC 18004 QR Code Matrix Generator (Byte Mode, ECC Level L, Versions 1-4)

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(deg) {
  let poly = [1];
  for (let i = 0; i < deg; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);
  for (let i = 0; i < data.length; i += 1) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j += 1) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return Array.from(res.slice(data.length));
}

const VERSIONS = [
  { version: 1, size: 21, dataCodewords: 19, ecCodewords: 7, align: [] },
  { version: 2, size: 25, dataCodewords: 34, ecCodewords: 10, align: [6, 18] },
  { version: 3, size: 29, dataCodewords: 55, ecCodewords: 15, align: [6, 22] },
  { version: 4, size: 33, dataCodewords: 80, ecCodewords: 20, align: [6, 26] },
];

function pushBits(bits, val, len) {
  for (let i = len - 1; i >= 0; i -= 1) {
    bits.push((val >> i) & 1);
  }
}

function computeFormatBits(ecLevelBits, maskPattern) {
  const data = (ecLevelBits << 3) | maskPattern;
  let d = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i -= 1) {
    if ((d >> i) & 1) {
      d ^= poly << (i - 10);
    }
  }
  return ((data << 10) | d) ^ 0b101010000010010;
}

export function generateQrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text || 'https://worship.pmstudio.am')));
  const spec = VERSIONS.find((v) => bytes.length + 2 <= v.dataCodewords) || VERSIONS[VERSIONS.length - 1];
  const payload = bytes.slice(0, spec.dataCodewords - 2);

  const bits = [];
  pushBits(bits, 0b0100, 4); // Byte mode
  pushBits(bits, payload.length, 8);
  payload.forEach((b) => pushBits(bits, b, 8));
  const maxBits = spec.dataCodewords * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  let padByte = 0xec;
  while (bits.length < maxBits) {
    pushBits(bits, padByte, 8);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let b = 0; b < 8; b += 1) val = (val << 1) | (bits[i + b] || 0);
    dataBytes.push(val);
  }
  const ecBytes = rsRemainder(dataBytes, spec.ecCodewords);
  const allCodewords = [...dataBytes, ...ecBytes];

  const n = spec.size;
  const grid = Array.from({ length: n }, () => new Array(n).fill(null));
  const reserved = Array.from({ length: n }, () => new Array(n).fill(false));

  const setFixed = (r, c, val) => {
    if (r >= 0 && r < n && c >= 0 && c < n) {
      grid[r][c] = val;
      reserved[r][c] = true;
    }
  };

  const drawFinder = (r0, c0) => {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const rr = r0 + r;
        const cc = c0 + c;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6);
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFixed(rr, cc, inOuter || inInner ? 1 : 0);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  if (spec.align.length >= 2) {
    for (const rCenter of spec.align) {
      for (const cCenter of spec.align) {
        const overlapsFinder =
          (rCenter < 9 && cCenter < 9) ||
          (rCenter < 9 && cCenter > n - 10) ||
          (rCenter > n - 10 && cCenter < 9);
        if (overlapsFinder) continue;
        for (let dr = -2; dr <= 2; dr += 1) {
          for (let dc = -2; dc <= 2; dc += 1) {
            const val = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0) ? 1 : 0;
            setFixed(rCenter + dr, cCenter + dc, val);
          }
        }
      }
    }
  }

  for (let i = 8; i < n - 8; i += 1) {
    setFixed(6, i, i % 2 === 0 ? 1 : 0);
    setFixed(i, 6, i % 2 === 0 ? 1 : 0);
  }
  setFixed(4 * spec.version + 9, 8, 1);

  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = n - 8; i < n; i += 1) {
    reserved[8][i] = true;
    if (i > n - 8) reserved[i][8] = true;
  }

  // Place data bits (mask pattern 0: (r + c) % 2 === 0)
  const bitStream = [];
  allCodewords.forEach((byte) => pushBits(bitStream, byte, 8));
  let bitIdx = 0;
  let dirUp = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (let step = 0; step < n; step += 1) {
      const r = dirUp ? n - 1 - step : step;
      for (let dc = 0; dc < 2; dc += 1) {
        const c = col - dc;
        if (!reserved[r][c]) {
          const bit = bitIdx < bitStream.length ? bitStream[bitIdx] : 0;
          bitIdx += 1;
          grid[r][c] = bit ^ ((r + c) % 2 === 0 ? 1 : 0);
        }
      }
    }
    dirUp = !dirUp;
  }

  // Write format info (ECC L = 01, Mask = 0)
  const fmt = computeFormatBits(0b01, 0);
  const fBit = (idx) => (fmt >> idx) & 1;
  for (let i = 0; i <= 5; i += 1) grid[8][i] = fBit(14 - i);
  grid[8][7] = fBit(8);
  grid[8][8] = fBit(7);
  grid[7][8] = fBit(6);
  for (let i = 0; i <= 5; i += 1) grid[5 - i][8] = fBit(5 - i);
  for (let i = 0; i <= 6; i += 1) grid[n - 1 - i][8] = fBit(14 - i);
  for (let i = 0; i <= 7; i += 1) grid[8][n - 8 + i] = fBit(7 - i);

  return grid;
}

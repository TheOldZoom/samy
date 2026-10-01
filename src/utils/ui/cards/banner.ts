const WIDTH = 1024;
const HEIGHT = 410;

export type ColorBanner = {
  data: Buffer;
  ext: "png";
  color: string;
};

const cache = new Map<string, Promise<Buffer>>();

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) [red, green] = [chroma, x];
  else if (section < 2) [red, green] = [x, chroma];
  else if (section < 3) [green, blue] = [chroma, x];
  else if (section < 4) [green, blue] = [x, chroma];
  else if (section < 5) [red, blue] = [x, chroma];
  else [red, blue] = [chroma, x];

  const match = l - chroma / 2;
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase()}`;
}

function generatedColor(id: string) {
  const value = BigInt(id);
  const mixed = value ^ (value >> 22n) ^ (value >> 44n);
  const hue = Number((mixed * 137n) % 360n);

  return hslToHex(hue, 68, 52);
}

function resolveColor(id: string, accentColor?: number | null) {
  if (accentColor === null || accentColor === undefined) {
    return generatedColor(id);
  }

  return `#${accentColor.toString(16).padStart(6, "0").toUpperCase()}`;
}

function createBmp(color: string) {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const rowSize = Math.ceil((WIDTH * 3) / 4) * 4;
  const pixelDataSize = rowSize * HEIGHT;
  const bmp = new Uint8Array(54 + pixelDataSize);
  const view = new DataView(bmp.buffer);

  bmp[0] = 0x42;
  bmp[1] = 0x4d;
  view.setUint32(2, bmp.length, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, WIDTH, true);
  view.setInt32(22, HEIGHT, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelDataSize, true);

  for (let y = 0; y < HEIGHT; y++) {
    const row = 54 + y * rowSize;

    for (let x = 0; x < WIDTH; x++) {
      const offset = row + x * 3;
      bmp[offset] = blue;
      bmp[offset + 1] = green;
      bmp[offset + 2] = red;
    }
  }

  return bmp;
}

async function generatePng(color: string) {
  const image = new Bun.Image(createBmp(color));
  return Buffer.from(await image.png().bytes());
}

export async function renderColorBanner(
  id: string,
  accentColor?: number | null,
): Promise<ColorBanner> {
  const color = resolveColor(id, accentColor);
  let pending = cache.get(color);

  if (!pending) {
    pending = generatePng(color);
    cache.set(color, pending);

    if (cache.size > 100) cache.delete(cache.keys().next().value!);
  }

  const data = await pending;
  return { data: Buffer.from(data), ext: "png", color };
}

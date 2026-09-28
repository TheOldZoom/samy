import { ApplicationCommandOptionType } from "@discordjs/core";
import convert from "color-convert";

import Command from "@/classes/Command";
import { Container, Text, v2 } from "@/utils/ui/components";
import { Media } from "@/utils/ui/components";
import { icons } from "@/utils/icons";

type Color = {
  r: number;
  g: number;
  b: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeColor(color: Color): Color {
  return {
    r: Math.round(clamp(color.r, 0, 255)),
    g: Math.round(clamp(color.g, 0, 255)),
    b: Math.round(clamp(color.b, 0, 255)),
  };
}

function randomColor(): Color {
  return {
    r: Math.floor(Math.random() * 256),
    g: Math.floor(Math.random() * 256),
    b: Math.floor(Math.random() * 256),
  };
}

function parseHex(input: string): Color | null {
  let hex = input.trim().replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function parseRgb(input: string): Color | null {
  const match = input.match(
    /^rgba?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*[, ]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*[, ]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:\s*[,/]\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?)?\s*\)$/i,
  );

  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);

  if (![r, g, b].every(Number.isFinite)) {
    return null;
  }

  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    return null;
  }

  return normalizeColor({ r, g, b });
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;

  if (t < 1 / 6) {
    return p + (q - p) * 6 * t;
  }

  if (t < 1 / 2) {
    return q;
  }

  if (t < 2 / 3) {
    return p + (q - p) * (2 / 3 - t) * 6;
  }

  return p;
}

function parseHsl(input: string): Color | null {
  const match = input.match(
    /^hsla?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:deg)?\s*[, ]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))%\s*[, ]\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))%(?:\s*[,/]\s*[+-]?(?:\d+(?:\.\d+)?|\.\d+)%?)?\s*\)$/i,
  );

  if (!match) {
    return null;
  }

  const h = Number(match[1]);
  const s = Number(match[2]);
  const l = Number(match[3]);

  if (![h, s, l].every(Number.isFinite)) {
    return null;
  }

  if (s < 0 || s > 100 || l < 0 || l > 100) {
    return null;
  }

  const hue = (((h % 360) + 360) % 360) / 360;
  const saturation = s / 100;
  const lightness = l / 100;

  if (saturation === 0) {
    const value = Math.round(lightness * 255);

    return {
      r: value,
      g: value,
      b: value,
    };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;

  const p = 2 * lightness - q;

  return normalizeColor({
    r: hueToRgb(p, q, hue + 1 / 3) * 255,
    g: hueToRgb(p, q, hue) * 255,
    b: hueToRgb(p, q, hue - 1 / 3) * 255,
  });
}

function parseColor(input: string): Color | null {
  const value = input.trim();

  return parseHex(value) ?? parseRgb(value) ?? parseHsl(value);
}

function toHex(color: Color): string {
  return `#${[color.r, color.g, color.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function createBmp(color: Color): Uint8Array {
  const width = 300;
  const height = 300;

  const bytesPerPixel = 3;
  const rowSize = width * bytesPerPixel;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const bmp = new Uint8Array(fileSize);
  const view = new DataView(bmp.buffer);

  bmp[0] = 0x42;
  bmp[1] = 0x4d;

  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);

  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelDataSize, true);

  let offset = 54;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      bmp[offset++] = color.b;
      bmp[offset++] = color.g;
      bmp[offset++] = color.r;
    }
  }

  return bmp;
}

async function createColorImage(color: Color): Promise<Uint8Array> {
  const bmp = createBmp(color);
  const image = new Bun.Image(bmp);

  return await image.png().bytes();
}

export default new Command({
  name: "color",
  description: "Shows information about a color",
  everywhere: true,

  options: [
    {
      name: "color",
      description: "A HEX, RGB, or HSL color",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],

  ephemeral: true,

  async execute(client, interaction) {
    const input = interaction.getOptionValue(
      "color",
      ApplicationCommandOptionType.String,
    );

    const color = input ? parseColor(input) : randomColor();

    if (!color) {
      await interaction.reply({
        components: v2(
          new Container().text(
            Text(`${icons.Wrong} Invalid color`),
            Text(
              `Use a valid HEX, RGB, or HSL color.

> **HEX:** \`#5865F2\`
> **RGB:** \`rgb(88, 101, 242)\`
> **HSL:** \`hsl(235, 86%, 65%)\``,
            ),
          ),
        ).components,

        flags: 1 << 15,
      });

      return;
    }

    const normalized = normalizeColor(color);
    const hex = toHex(normalized);

    const [h, s, l] = convert.rgb.hsl(normalized.r, normalized.g, normalized.b);

    const image = await createColorImage(normalized);

    await interaction.reply({
      files: [
        {
          data: image,
          name: "color.png",
        },
      ],

      components: v2(
        new Container()
          .text(
            Text(`${icons.paintpadbrush} ${hex}`),
            Text(
              `> **HEX:** \`${hex}\`
> **RGB:** \`rgb(${normalized.r}, ${normalized.g}, ${normalized.b})\`
> **HSL:** \`hsl(${h}, ${s}%, ${l}%)\``,
            ),
          )
          .media(Media("attachment://color.png")),
      ).components,

      flags: 1 << 15,
    });
  },
});

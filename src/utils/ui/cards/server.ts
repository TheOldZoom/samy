import path from "node:path";
import { existsSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { GIFEncoder, applyPalette, quantize } from "gifenc";
import sharp from "sharp";
import type { Guild } from "discord.js";

sharp.cache(false);
sharp.concurrency(2);

const MIN_STEP = 30;
const MAX_FRAMES = 60;
const MAX_BYTES = 14_000_000;
const BATCH = 4;
const PNG_WIDTH = 900;
const GIF_WIDTH = 600;
const HEIGHT = 320;

const fontFiles = [
  path.resolve("assets/fonts/Geist-Regular.ttf"),
  path.resolve("assets/fonts/Geist-Bold.ttf"),
].filter(existsSync);
const FONT = fontFiles.length
  ? { fontFiles, loadSystemFonts: false, defaultFontFamily: "Geist" }
  : { loadSystemFonts: true };

export type ServerCard = { data: Buffer; ext: "png" | "gif" };
type Sharp = ReturnType<typeof sharp>;
type OverlayOptions = Parameters<Sharp["composite"]>[0][number];
type Prep = (image: Sharp) => Sharp;
type Track = {
  frames: number;
  total: number;
  at: (time: number) => Promise<Buffer>;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function frameDelay(delay?: number) {
  return delay && delay > 10 ? delay : 100;
}

function makeTrack(
  delays: number[],
  render: (index: number) => Promise<Buffer>,
): Track {
  const ends: number[] = [];
  let total = 0;

  for (const delay of delays) {
    total += delay;
    ends.push(total);
  }

  const cache = new Map<number, Promise<Buffer>>();

  return {
    frames: delays.length,
    total,
    at(time) {
      const position = time % total;
      let index = ends.findIndex((end) => position < end);
      if (index < 0) index = delays.length - 1;

      if (!cache.has(index)) cache.set(index, render(index));
      return cache.get(index)!;
    },
  };
}

async function decodeFrames(url: string, prep: Prep): Promise<Track> {
  const image = sharp(await download(url), { animated: true });
  const metadata = await image.metadata();
  const frames = metadata.pages ?? 1;
  const width = metadata.width!;
  const height = metadata.pageHeight ?? metadata.height!;
  const { data } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frameSize = width * height * 4;
  const delays = Array.from({ length: frames }, (_, index) =>
    frameDelay(metadata.delay?.[index]),
  );

  return makeTrack(delays, (index) =>
    prep(
      sharp(data.subarray(index * frameSize, (index + 1) * frameSize), {
        raw: { width, height, channels: 4 },
      }),
    )
      .png()
      .toBuffer(),
  );
}

const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

async function build(guild: Guild): Promise<ServerCard> {
  const animatedBanner = guild.banner?.startsWith("a_") ?? false;
  const animatedIcon = guild.icon?.startsWith("a_") ?? false;
  let width = PNG_WIDTH;
  let height = HEIGHT;

  const bannerPrep: Prep = (image) =>
    image
      .resize(width, height, { fit: "cover" })
      .blur(Math.max(0.3, (5 * width) / PNG_WIDTH));
  const iconPrep: Prep = (image) => {
    const size = Math.round((160 * width) / PNG_WIDTH);
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`,
    );

    return image
      .resize(size, size)
      .composite([{ input: mask, blend: "dest-in" }]);
  };

  const bannerUrl = guild.bannerURL({
    size: animatedBanner ? 512 : 1024,
    extension: "png",
    forceStatic: !animatedBanner,
  });
  const iconUrl = guild.iconURL({
    size: 256,
    extension: "png",
    forceStatic: !animatedIcon,
  });
  const [banner, icon] = await Promise.all([
    bannerUrl
      ? decodeFrames(bannerUrl, bannerPrep).catch(() => null)
      : Promise.resolve(null),
    iconUrl
      ? decodeFrames(iconUrl, iconPrep).catch(() => null)
      : Promise.resolve(null),
  ]);

  const tracks = [banner, icon].filter(Boolean) as Track[];
  const duration = Math.max(
    0,
    ...tracks.filter((track) => track.frames > 1).map((track) => track.total),
  );
  let step = MIN_STEP;

  if (duration / step > MAX_FRAMES) {
    step = Math.ceil(duration / MAX_FRAMES / 10) * 10;
  }

  const count = duration ? Math.ceil(duration / step) : 1;
  width = duration ? GIF_WIDTH : PNG_WIDTH;

  const layer = (inner: string, font = false) =>
    new Resvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="320" viewBox="0 0 900 320">${inner}</svg>`,
      {
        font: font ? FONT : { loadSystemFonts: false },
        fitTo: { mode: "width", value: width },
      },
    ).render();

  const sizingLayer = layer('<rect width="900" height="320"/>');
  height = sizingLayer.height;

  const fallback = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#111118",
    },
  })
    .png()
    .toBuffer();
  const shade = layer(`
    <rect width="900" height="320" fill="#0b0b10" fill-opacity=".68"/>
  `).asPng();
  const front = layer(
    `
      <text x="450" y="258" text-anchor="middle" fill="#fff" font-family="Geist" font-size="40" font-weight="700">
        ${escapeXml(truncate(guild.name, 26))}
      </text>
      <text x="450" y="294" text-anchor="middle" fill="#a1a1aa" font-family="Geist" font-size="22">
        ${escapeXml(
          truncate(
            guild.description ??
              `${guild.memberCount.toLocaleString()} members`,
            58,
          ),
        )}
      </text>
      <rect x=".75" y=".75" width="898.5" height="318.5" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="1.5"/>
    `,
    true,
  ).asPng();
  const iconFallback = icon
    ? null
    : layer(
        `
          <circle cx="450" cy="110" r="80" fill="#5865f2"/>
          <text x="450" y="128" text-anchor="middle" fill="#ffffff" font-family="Geist" font-size="48" font-weight="700">${escapeXml(initials(guild.name))}</text>
        `,
        true,
      ).asPng();
  const cardMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${(28 * width) / PNG_WIDTH}"/></svg>`,
  );
  const scale = width / PNG_WIDTH;
  const iconPosition = {
    left: Math.round(370 * scale),
    top: Math.round(30 * scale),
  };

  const compose = async (time: number) => {
    const layers: OverlayOptions[] = [];

    if (banner) layers.push({ input: await banner.at(time) });
    layers.push({ input: shade });

    if (icon) {
      layers.push({ input: await icon.at(time), ...iconPosition });
    } else if (iconFallback) {
      layers.push({ input: iconFallback });
    }

    layers.push({ input: cardMask, blend: "dest-in" }, { input: front });
    return sharp(fallback).composite(layers);
  };

  if (!duration) {
    return { data: await (await compose(0)).png().toBuffer(), ext: "png" };
  }

  let frameWidth = 0;
  let frameHeight = 0;
  const pixelFrames: Uint8Array[] = [];

  for (let index = 0; index < count; index += BATCH) {
    const times = Array.from(
      { length: Math.min(BATCH, count - index) },
      (_, offset) => (index + offset) * step,
    );
    const results = await Promise.all(
      times.map(async (time) =>
        (await compose(time))
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
      ),
    );

    for (const { data, info } of results) {
      frameWidth = info.width;
      frameHeight = info.height;
      pixelFrames.push(
        new Uint8Array(data.buffer, data.byteOffset, data.length),
      );
    }

    await yieldToEventLoop();
  }

  const pickCount = Math.min(6, pixelFrames.length);
  const picks = Array.from(
    { length: pickCount },
    (_, index) =>
      pixelFrames[Math.floor((index * pixelFrames.length) / pickCount)]!,
  );
  const sample = new Uint8Array(
    picks.reduce((size, frame) => size + frame.length, 0),
  );
  let offset = 0;

  for (const frame of picks) {
    sample.set(frame, offset);
    offset += frame.length;
  }

  const palette = quantize(sample, 256, { format: "rgba4444" });
  const transparentIndex = palette.findIndex((color) => color[3] === 0);
  let indexed = pixelFrames.map((pixels) =>
    applyPalette(pixels, palette, "rgba4444"),
  );
  pixelFrames.length = 0;

  const encode = (frames: Uint8Array[], delay: number) => {
    const gif = GIFEncoder();

    frames.forEach((frame, index) => {
      gif.writeFrame(frame, frameWidth, frameHeight, {
        ...(index === 0 ? { palette } : {}),
        delay,
        transparent: transparentIndex >= 0,
        transparentIndex: Math.max(transparentIndex, 0),
        dispose: 2,
      });
    });

    gif.finish();
    return Buffer.from(gif.bytes());
  };

  let delay = step;
  let data = encode(indexed, delay);

  while (data.length > MAX_BYTES && indexed.length > 10) {
    indexed = indexed.filter((_, index) => index % 2 === 0);
    delay *= 2;
    data = encode(indexed, delay);
  }

  return { data, ext: "gif" };
}

const cache = new Map<string, ServerCard>();

export async function renderServerCard(guild: Guild): Promise<ServerCard> {
  const key = [
    guild.id,
    guild.name,
    guild.icon,
    guild.banner,
    guild.description,
    guild.memberCount,
  ].join(":");
  const cached = cache.get(key);
  if (cached) return { data: Buffer.from(cached.data), ext: cached.ext };

  const result = await build(guild);

  cache.set(key, { data: Buffer.from(result.data), ext: result.ext });
  if (cache.size > 50) cache.delete(cache.keys().next().value!);
  return result;
}

import path from "node:path";
import { existsSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import UPNG from "upng-js";
import { GIFEncoder, quantize, applyPalette } from "gifenc";
import type { APIUser, APIGuildMember } from "@discordjs/core";
import { avatarDecorationURL, avatarURL, bannerURL } from "@/utils/user";

sharp.cache(false);
sharp.concurrency(2);

type MemberInfo = Pick<APIGuildMember, "nick" | "joined_at" | "premium_since">;

type UserCardOptions = {
  user: APIUser;
  member?: MemberInfo;
};

type Card = { data: Buffer; ext: string };
type Sharp = ReturnType<typeof sharp>;
type OverlayOptions = Parameters<Sharp["composite"]>[0][number];
type Prep = (img: Sharp) => Sharp;

type Track = {
  frames: number;
  total: number;
  at: (t: number) => Promise<Buffer>;
};

const MIN_STEP = 30;
const MAX_FRAMES = 60;
const MAX_BYTES = 14_000_000;
const BATCH = 4;
const PNG_WIDTH = 900;
const GIF_WIDTH = 600;

const fontFiles = [
  path.resolve("assets/fonts/Geist-Regular.ttf"),
  path.resolve("assets/fonts/Geist-Bold.ttf"),
].filter(existsSync);

if (!fontFiles.length) {
  console.warn(
    "[user card] no font files found, falling back to system fonts (slow)",
  );
}

const FONT = fontFiles.length
  ? { fontFiles, loadSystemFonts: false, defaultFontFamily: "Geist" }
  : { loadSystemFonts: true };

async function download(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function fixDelay(ms?: number) {
  return ms && ms > 10 ? ms : 100;
}

function makeTrack(
  delays: number[],
  render: (i: number) => Promise<Buffer>,
): Track {
  const ends: number[] = [];
  let total = 0;

  for (const d of delays) {
    total += d;
    ends.push(total);
  }

  const cache = new Map<number, Promise<Buffer>>();

  return {
    frames: delays.length,
    total,
    at(t) {
      const time = t % total;
      let i = ends.findIndex((end) => time < end);
      if (i < 0) i = delays.length - 1;

      if (!cache.has(i)) cache.set(i, render(i));
      return cache.get(i)!;
    },
  };
}

async function decodeFrames(url: string, prep: Prep): Promise<Track> {
  const image = sharp(await download(url), { animated: true });
  const meta = await image.metadata();

  const pages = meta.pages ?? 1;
  const width = meta.width!;
  const height = meta.pageHeight ?? meta.height!;

  const { data } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const frameSize = width * height * 4;
  const delays = Array.from({ length: pages }, (_, i) =>
    fixDelay(meta.delay?.[i]),
  );

  return makeTrack(delays, (i) =>
    prep(
      sharp(data.subarray(i * frameSize, (i + 1) * frameSize), {
        raw: { width, height, channels: 4 },
      }),
    )
      .png()
      .toBuffer(),
  );
}

async function decodeDecoration(url: string, prep: Prep): Promise<Track> {
  const buffer = await download(url);

  const apng = UPNG.decode(
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer,
  );

  const rgba = UPNG.toRGBA8(apng);
  const delays = rgba.map((_, i) => fixDelay(apng.frames[i]?.delay));

  return makeTrack(delays, (i) =>
    prep(
      sharp(Buffer.from(rgba[i]!), {
        raw: { width: apng.width, height: apng.height, channels: 4 },
      }),
    )
      .png()
      .toBuffer(),
  );
}

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

const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

async function build({ user, member }: UserCardOptions): Promise<Card> {
  const animated = Boolean(
    user.avatar?.startsWith("a_") || user.banner?.startsWith("a_"),
  );

  let W = PNG_WIDTH;
  let H = 320;

  const avatarPrep: Prep = (img) => {
    const a = Math.round((160 * W) / 900);
    const circle = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${a}" height="${a}"><circle cx="${a / 2}" cy="${a / 2}" r="${a / 2}"/></svg>`,
    );

    return img.resize(a, a).composite([{ input: circle, blend: "dest-in" }]);
  };

  const bannerPrep: Prep = (img) =>
    img.resize(W, H, { fit: "cover" }).blur(Math.max(0.3, (5 * W) / 900));

  const decorationPrep: Prep = (img) => {
    const d = Math.round((192 * W) / 900);
    return img.resize(d, d);
  };

  const [avatar, banner, decoration] = await Promise.all([
    decodeFrames(avatarURL(user, 256, animated), avatarPrep),

    (async (): Promise<Track | null> => {
      const url = bannerURL(user, animated ? 512 : 1024, animated);
      return url ? await decodeFrames(url, bannerPrep).catch(() => null) : null;
    })(),

    (async (): Promise<Track | null> => {
      const url = avatarDecorationURL(user, 512);
      return url
        ? await decodeDecoration(url, decorationPrep).catch(() => null)
        : null;
    })(),
  ]);

  const displayName = member?.nick ?? user.global_name ?? user.username;
  const discriminator =
    user.discriminator !== "0" ? `#${user.discriminator}` : "";

  const tracks = [avatar, banner, decoration].filter(Boolean) as Track[];
  const duration = Math.max(
    0,
    ...tracks.filter((t) => t.frames > 1).map((t) => t.total),
  );

  let step = MIN_STEP;
  if (duration / step > MAX_FRAMES) {
    step = Math.ceil(duration / MAX_FRAMES / 10) * 10;
  }

  const count = duration ? Math.ceil(duration / step) : 1;
  W = duration ? GIF_WIDTH : PNG_WIDTH;

  console.log("[user card]", {
    animated,
    avatarFrames: avatar.frames,
    bannerFrames: banner?.frames ?? 0,
    decorationFrames: decoration?.frames ?? 0,
    durationMs: duration,
    step,
    count,
  });

  const layer = (inner: string, font = false) =>
    new Resvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="320" viewBox="0 0 900 320">${inner}</svg>`,
      {
        font: font ? FONT : { loadSystemFonts: false },
        fitTo: { mode: "width", value: W },
      },
    ).render();

  const fallbackLayer = layer(`
    <rect width="900" height="320" fill="#111118"/>
  `);

  H = fallbackLayer.height;

  const fallback = fallbackLayer.asPng();

  const shade = layer(`
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b0b10" stop-opacity=".25"/>
        <stop offset=".55" stop-color="#0b0b10" stop-opacity=".7"/>
        <stop offset="1" stop-color="#0b0b10" stop-opacity=".95"/>
      </linearGradient>
    </defs>
    <rect width="900" height="320" fill="url(#shade)"/>
  `).asPng();

  const front = layer(
    `
    <text x="450" y="258" text-anchor="middle" fill="#fff" font-family="Geist" font-size="40" font-weight="700">
      ${escapeXml(truncate(displayName, 26))}
    </text>

    <text x="450" y="294" text-anchor="middle" fill="#a1a1aa" font-family="Geist" font-size="22">
      @${escapeXml(user.username)}${escapeXml(discriminator)}
    </text>

    <rect x=".75" y=".75" width="898.5" height="318.5" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="1.5"/>
  `,
    true,
  ).asPng();

  const cardMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${(28 * W) / 900}"/></svg>`,
  );

  const k = W / 900;
  const avatarPos = { left: Math.round(370 * k), top: Math.round(30 * k) };
  const decorationPos = { left: Math.round(354 * k), top: Math.round(14 * k) };

  const compose = async (t: number) => {
    const layers: OverlayOptions[] = [];

    if (banner) layers.push({ input: await banner.at(t) });
    layers.push({ input: shade });
    layers.push({ input: await avatar.at(t), ...avatarPos });

    if (decoration) {
      layers.push({ input: await decoration.at(t), ...decorationPos });
    }

    layers.push({ input: cardMask, blend: "dest-in" });
    layers.push({ input: front });

    return sharp(fallback).composite(layers);
  };

  if (!duration) {
    return { data: await (await compose(0)).png().toBuffer(), ext: "png" };
  }

  let width = 0;
  let height = 0;
  const pixelFrames: Uint8Array[] = [];

  for (let i = 0; i < count; i += BATCH) {
    const times = Array.from(
      { length: Math.min(BATCH, count - i) },
      (_, j) => (i + j) * step,
    );

    const results = await Promise.all(
      times.map(async (t) =>
        (await compose(t))
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true }),
      ),
    );

    for (const { data, info } of results) {
      width = info.width;
      height = info.height;
      pixelFrames.push(
        new Uint8Array(data.buffer, data.byteOffset, data.length),
      );
    }

    await yieldToEventLoop();
  }

  const pickCount = Math.min(6, pixelFrames.length);
  const picks = Array.from(
    { length: pickCount },
    (_, n) => pixelFrames[Math.floor((n * pixelFrames.length) / pickCount)]!,
  );

  const sample = new Uint8Array(picks.reduce((n, f) => n + f.length, 0));
  let offset = 0;
  for (const f of picks) {
    sample.set(f, offset);
    offset += f.length;
  }

  const palette = quantize(sample, 256, { format: "rgba4444" });
  const transparentIndex = palette.findIndex((c) => c[3] === 0);

  let indexed = pixelFrames.map((px) => applyPalette(px, palette, "rgba4444"));
  pixelFrames.length = 0;

  const encode = (frames: Uint8Array[], delay: number) => {
    const gif = GIFEncoder();

    frames.forEach((index, n) => {
      gif.writeFrame(index, width, height, {
        ...(n === 0 ? { palette } : {}),
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
    indexed = indexed.filter((_, i) => i % 2 === 0);
    delay *= 2;
    data = encode(indexed, delay);
  }

  return { data, ext: "gif" };
}

const cache = new Map<string, Card>();

export async function renderUserCard(options: UserCardOptions) {
  const { user, member } = options;

  const key = [
    user.id,
    user.avatar,
    user.banner,
    user.avatar_decoration_data?.asset,
    user.global_name,
    user.username,
    member?.nick,
  ].join(":");

  const hit = cache.get(key);
  if (hit) return { data: Buffer.from(hit.data), ext: hit.ext };

  const result = await build(options);

  cache.set(key, { data: Buffer.from(result.data), ext: result.ext });
  if (cache.size > 50) cache.delete(cache.keys().next().value!);

  return result;
}

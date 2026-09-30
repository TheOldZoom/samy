import path from "node:path";
import { existsSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import type { Guild } from "discord.js";

sharp.cache(false);
sharp.concurrency(2);

const WIDTH = 900;
const HEIGHT = 320;
const fontFiles = [
  path.resolve("assets/fonts/Geist-Regular.ttf"),
  path.resolve("assets/fonts/Geist-Bold.ttf"),
].filter(existsSync);
const FONT = fontFiles.length
  ? { fontFiles, loadSystemFonts: false, defaultFontFamily: "Geist" }
  : { loadSystemFonts: true };

export type ServerCard = { data: Buffer; ext: "png" };
type OverlayOptions = Parameters<
  ReturnType<typeof sharp>["composite"]
>[0][number];

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
  if (!response.ok)
    throw new Error(`Failed to fetch image: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function layer(inner: string, font = false) {
  return new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="320" viewBox="0 0 900 320">${inner}</svg>`,
    { font: font ? FONT : { loadSystemFonts: false } },
  )
    .render()
    .asPng();
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
  if (cached) return { data: Buffer.from(cached.data), ext: "png" };

  const bannerUrl = guild.bannerURL({ size: 1024, extension: "png" });
  const iconUrl = guild.iconURL({ size: 256, extension: "png" });
  const [banner, icon] = await Promise.all([
    bannerUrl ? download(bannerUrl).catch(() => null) : null,
    iconUrl ? download(iconUrl).catch(() => null) : null,
  ]);

  const fallback = await sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: "#111118",
    },
  })
    .png()
    .toBuffer();
  const background = banner
    ? await sharp(banner)
        .resize(WIDTH, HEIGHT, { fit: "cover" })
        .blur(5)
        .png()
        .toBuffer()
    : fallback;

  const shade = layer(`
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0b0b10" stop-opacity=".25"/>
        <stop offset=".55" stop-color="#0b0b10" stop-opacity=".7"/>
        <stop offset="1" stop-color="#0b0b10" stop-opacity=".95"/>
      </linearGradient>
    </defs>
    <rect width="900" height="320" fill="url(#shade)"/>
  `);

  const front = layer(
    `
    <text x="450" y="258" text-anchor="middle" fill="#fff" font-family="Geist" font-size="40" font-weight="700">
      ${escapeXml(truncate(guild.name, 26))}
    </text>
    <text x="450" y="294" text-anchor="middle" fill="#a1a1aa" font-family="Geist" font-size="22">
      ${escapeXml(
        truncate(
          guild.description ?? `${guild.memberCount.toLocaleString()} members`,
          58,
        ),
      )}
    </text>
    <rect x=".75" y=".75" width="898.5" height="318.5" rx="28" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="1.5"/>
  `,
    true,
  );

  const iconSize = 160;
  const iconMask = Buffer.from(
    `<svg width="${iconSize}" height="${iconSize}"><circle cx="80" cy="80" r="80"/></svg>`,
  );
  const iconImage = icon
    ? await sharp(icon)
        .resize(iconSize, iconSize)
        .composite([{ input: iconMask, blend: "dest-in" }])
        .png()
        .toBuffer()
    : layer(
        `
        <circle cx="450" cy="110" r="80" fill="#5865f2"/>
        <text x="450" y="128" text-anchor="middle" fill="#ffffff" font-family="Geist" font-size="48" font-weight="700">${escapeXml(initials(guild.name))}</text>
      `,
        true,
      );

  const cardMask = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="320"><rect width="900" height="320" rx="28"/></svg>',
  );
  const layers: OverlayOptions[] = [
    { input: shade },
    icon ? { input: iconImage, left: 370, top: 30 } : { input: iconImage },
    { input: cardMask, blend: "dest-in" },
    { input: front },
  ];
  const data = await sharp(background).composite(layers).png().toBuffer();
  const result: ServerCard = { data, ext: "png" };

  cache.set(key, { data: Buffer.from(data), ext: "png" });
  if (cache.size > 50) cache.delete(cache.keys().next().value!);
  return result;
}

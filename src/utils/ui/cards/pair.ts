import sharp from "sharp";
import type { User } from "discord.js";
import { cachedAvatarUrl, type CachedUser } from "@/utils/userCache";

export type CardUser = User | CachedUser;

type PairCardOptions = {
  left: CardUser;
  right: CardUser;
  title: string;
  subtitle: string;
  accent: string;
  centerLabel: string;
};

const WIDTH = 900;
const HEIGHT = 360;
const AVATAR_SIZE = 176;
const cache = new Map<string, Buffer>();

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const displayName = (user: CardUser) =>
  (("globalName" in user ? user.globalName : null) ?? user.username).slice(
    0,
    22,
  );

async function avatar(user: CardUser) {
  const url =
    "displayAvatarURL" in user
      ? user.displayAvatarURL({
          extension: "png",
          size: 256,
          forceStatic: true,
        })
      : cachedAvatarUrl(user, 256);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch user avatar");

  const mask = Buffer.from(
    `<svg width="${AVATAR_SIZE}" height="${AVATAR_SIZE}"><circle cx="${AVATAR_SIZE / 2}" cy="${AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" fill="white"/></svg>`,
  );

  return sharp(Buffer.from(await response.arrayBuffer()))
    .resize(AVATAR_SIZE, AVATAR_SIZE)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

export async function renderPairCard(options: PairCardOptions) {
  const { left, right, title, subtitle, accent, centerLabel } = options;
  const key = [
    left.id,
    left.avatar,
    "globalName" in left ? left.globalName : null,
    right.id,
    right.avatar,
    "globalName" in right ? right.globalName : null,
    title,
    subtitle,
    accent,
    centerLabel,
  ].join(":");
  const cached = cache.get(key);
  if (cached) return Buffer.from(cached);

  const [leftAvatar, rightAvatar] = await Promise.all([
    avatar(left),
    avatar(right),
  ]);
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#11111a"/>
          <stop offset="0.5" stop-color="#1c1422"/>
          <stop offset="1" stop-color="#11111a"/>
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0" stop-color="${accent}" stop-opacity="0.34"/>
          <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="900" height="360" rx="28" fill="url(#background)"/>
      <circle cx="450" cy="155" r="230" fill="url(#glow)"/>
      <circle cx="238" cy="158" r="94" fill="none" stroke="${accent}" stroke-width="5" opacity="0.8"/>
      <circle cx="662" cy="158" r="94" fill="none" stroke="${accent}" stroke-width="5" opacity="0.8"/>
      <path d="M337 156 C382 112 408 112 450 156 C492 112 518 112 563 156" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" opacity="0.72"/>
      <circle cx="450" cy="156" r="52" fill="#18141e" stroke="${accent}" stroke-width="3"/>
      <text x="450" y="166" text-anchor="middle" fill="${accent}" font-family="Geist, sans-serif" font-size="27" font-weight="700">${escapeXml(centerLabel)}</text>
      <text x="238" y="286" text-anchor="middle" fill="#ffffff" font-family="Geist, sans-serif" font-size="27" font-weight="700">${escapeXml(displayName(left))}</text>
      <text x="662" y="286" text-anchor="middle" fill="#ffffff" font-family="Geist, sans-serif" font-size="27" font-weight="700">${escapeXml(displayName(right))}</text>
      <text x="450" y="42" text-anchor="middle" fill="#ffffff" font-family="Geist, sans-serif" font-size="29" font-weight="700">${escapeXml(title)}</text>
      <text x="450" y="326" text-anchor="middle" fill="#b8b4c2" font-family="Geist, sans-serif" font-size="18">${escapeXml(subtitle)}</text>
      <rect x="0.75" y="0.75" width="898.5" height="358.5" rx="27" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.5"/>
    </svg>
  `);

  const result = await sharp(svg)
    .composite([
      { input: leftAvatar, left: 150, top: 70 },
      { input: rightAvatar, left: 574, top: 70 },
    ])
    .png()
    .toBuffer();

  cache.set(key, Buffer.from(result));
  if (cache.size > 50) cache.delete(cache.keys().next().value!);
  return result;
}

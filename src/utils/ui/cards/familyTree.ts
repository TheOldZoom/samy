import sharp from "sharp";

import type { FamilyEdge } from "@/utils/family";
import { cachedAvatarUrl, type CachedUser } from "@/utils/userCache";

const AVATAR_SIZE = 72;
const cache = new Map<string, Buffer>();

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

async function avatar(user: CachedUser) {
  const response = await fetch(cachedAvatarUrl(user));
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

function levelsFor(rootId: string, users: CachedUser[], edges: FamilyEdge[]) {
  const levels = new Map([[rootId, 0]]);

  for (let pass = 0; pass < users.length; pass++) {
    let changed = false;
    for (const edge of edges) {
      const from = levels.get(edge.from);
      const to = levels.get(edge.to);
      const difference = edge.type === "adoption" ? 1 : 0;

      if (from !== undefined && to === undefined) {
        levels.set(edge.to, from + difference);
        changed = true;
      } else if (to !== undefined && from === undefined) {
        levels.set(edge.from, to - difference);
        changed = true;
      }
    }
    if (!changed) break;
  }

  for (const user of users) {
    if (!levels.has(user.id)) levels.set(user.id, 0);
  }
  return levels;
}

export async function renderFamilyTreeCard(
  rootId: string,
  users: CachedUser[],
  edges: FamilyEdge[],
) {
  const key = [
    rootId,
    ...users.map((user) => `${user.id}:${user.avatar}:${user.username}`),
    ...edges.map((edge) => `${edge.type}:${edge.from}:${edge.to}`),
  ].join("|");
  const cached = cache.get(key);
  if (cached) return Buffer.from(cached);

  const levels = levelsFor(rootId, users, edges);
  const rows = new Map<number, CachedUser[]>();
  for (const user of users) {
    const level = levels.get(user.id)!;
    rows.set(level, [...(rows.get(level) ?? []), user]);
  }
  const orderedLevels = [...rows.keys()].sort((a, b) => a - b);
  const largestRow = Math.max(...[...rows.values()].map((row) => row.length));
  const width = Math.max(900, largestRow * 190 + 160);
  const height = Math.max(420, orderedLevels.length * 145 + 150);
  const positions = new Map<string, { x: number; y: number }>();
  const parentByChild = new Map(
    edges
      .filter((edge) => edge.type === "adoption")
      .map((edge) => [edge.to, edge.from]),
  );
  const spouseByUser = new Map<string, string>();
  for (const edge of edges) {
    if (edge.type !== "marriage") continue;
    spouseByUser.set(edge.from, edge.to);
    spouseByUser.set(edge.to, edge.from);
  }

  const availableX = (preferred: number, used: number[]) => {
    const clamped = Math.max(80, Math.min(width - 80, preferred));
    const candidates = [clamped];
    for (let offset = 140; offset < width; offset += 140) {
      candidates.push(clamped + offset, clamped - offset);
    }

    return (
      candidates.find(
        (x) =>
          x >= 80 &&
          x <= width - 80 &&
          used.every((occupied) => Math.abs(occupied - x) >= 125),
      ) ?? clamped
    );
  };

  orderedLevels.forEach((level, rowIndex) => {
    const row = rows.get(level)!;
    row.sort((a, b) => a.id.localeCompare(b.id));
    const y = 105 + rowIndex * 145;
    const used: number[] = [];
    const placed = new Set<string>();
    const childrenByParent = new Map<string, CachedUser[]>();

    for (const user of row) {
      const parentId = parentByChild.get(user.id);
      if (!parentId || !positions.has(parentId)) continue;
      childrenByParent.set(parentId, [
        ...(childrenByParent.get(parentId) ?? []),
        user,
      ]);
    }

    const parentGroups = [...childrenByParent.entries()].sort(
      ([left], [right]) => positions.get(left)!.x - positions.get(right)!.x,
    );
    for (const [parentId, children] of parentGroups) {
      children.sort((a, b) => a.id.localeCompare(b.id));
      const parentX = positions.get(parentId)!.x;
      children.forEach((child, index) => {
        const centeredOffset = (index - (children.length - 1) / 2) * 140;
        const x = availableX(parentX + centeredOffset, used);
        positions.set(child.id, { x, y });
        used.push(x);
        placed.add(child.id);
      });
    }

    let addedSpouse = true;
    while (addedSpouse) {
      addedSpouse = false;
      for (const user of row) {
        if (placed.has(user.id)) continue;
        const spouse = spouseByUser.get(user.id);
        const spousePosition = spouse ? positions.get(spouse) : undefined;
        if (!spousePosition || spousePosition.y !== y) continue;

        const direction = spousePosition.x < width / 2 ? 1 : -1;
        const x = availableX(spousePosition.x + direction * 140, used);
        positions.set(user.id, { x, y });
        used.push(x);
        placed.add(user.id);
        addedSpouse = true;
      }
    }

    const remaining = row.filter((user) => !placed.has(user.id));
    const gap = width / (remaining.length + 1);
    remaining.forEach((user, index) => {
      const x = availableX(gap * (index + 1), used);
      positions.set(user.id, { x, y });
      used.push(x);
    });
  });

  const lines = edges
    .map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return "";
      const color = edge.type === "marriage" ? "#ff6b9d" : "#66c7ff";
      const dash = edge.type === "marriage" ? "" : ' stroke-dasharray="8 6"';
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="4"${dash} opacity="0.72"/>`;
    })
    .join("");
  const nodes = users
    .map((user) => {
      const position = positions.get(user.id)!;
      const name = user.username.slice(0, 18);
      const root = user.id === rootId;
      return `
        <circle cx="${position.x}" cy="${position.y}" r="42" fill="#17151f" stroke="${root ? "#ffd166" : "#ffffff"}" stroke-opacity="${root ? "1" : "0.25"}" stroke-width="${root ? "4" : "2"}"/>
        <text x="${position.x}" y="${position.y + 58}" text-anchor="middle" fill="#ffffff" font-family="Geist, sans-serif" font-size="18" font-weight="700">${escapeXml(name)}</text>
      `;
    })
    .join("");
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#11111a"/>
          <stop offset="0.5" stop-color="#171824"/>
          <stop offset="1" stop-color="#11111a"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" rx="28" fill="url(#background)"/>
      <text x="${width / 2}" y="42" text-anchor="middle" fill="#ffffff" font-family="Geist, sans-serif" font-size="29" font-weight="700">Family tree</text>
      ${lines}
      ${nodes}
      <circle cx="40" cy="${height - 32}" r="6" fill="#ff6b9d"/><text x="54" y="${height - 26}" fill="#b8b4c2" font-family="Geist, sans-serif" font-size="16">Marriage</text>
      <circle cx="150" cy="${height - 32}" r="6" fill="#66c7ff"/><text x="164" y="${height - 26}" fill="#b8b4c2" font-family="Geist, sans-serif" font-size="16">Parent / child</text>
      <rect x="0.75" y="0.75" width="${width - 1.5}" height="${height - 1.5}" rx="27" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.5"/>
    </svg>
  `);
  const avatars = await Promise.all(users.map(avatar));
  const result = await sharp(svg)
    .composite(
      users.map((user, index) => {
        const position = positions.get(user.id)!;
        return {
          input: avatars[index]!,
          left: Math.round(position.x - AVATAR_SIZE / 2),
          top: Math.round(position.y - AVATAR_SIZE / 2),
        };
      }),
    )
    .png()
    .toBuffer();

  cache.set(key, Buffer.from(result));
  if (cache.size > 20) cache.delete(cache.keys().next().value!);
  return result;
}

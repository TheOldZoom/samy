import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";

const START = "__START__";
const END = "__END__";

const MENTION_REGEX = /<@!?&?\d+>|@everyone|@here/gi;
const PUNCT_ONLY_REGEX = /^[\p{P}\p{S}\s]+$/u;

type ChainMap = Record<string, Record<string, number>>;

export interface MarkovSettings {
  enabled: boolean;
  mentionEnabled: boolean;
  randomEnabled: boolean;
  randomFrequency: number;
  randomCooldown: number;
  chainOrder: number;
  minOutputLength: number;
  maxOutputLength: number;
}

const DEFAULT_SETTINGS: MarkovSettings = {
  enabled: false,
  mentionEnabled: true,
  randomEnabled: false,
  randomFrequency: 200,
  randomCooldown: 300,
  chainOrder: 2,
  minOutputLength: 3,
  maxOutputLength: 25,
};

function clampOrder(order: number): number {
  return Math.min(Math.max(Math.trunc(order), 1), 4);
}

export async function getMarkovSettings(
  guildId: string,
  client: Client,
): Promise<MarkovSettings> {
  const cached = client.markovSettings.get(guildId);
  if (cached) return cached;

  const row = await client.prisma.markovSettings.findUnique({
    where: { guildId },
  });

  const settings: MarkovSettings = row
    ? {
        enabled: row.enabled,
        mentionEnabled: row.mentionEnabled,
        randomEnabled: row.randomEnabled,
        randomFrequency: row.randomFrequency,
        randomCooldown: row.randomCooldown,
        chainOrder: clampOrder(row.chainOrder),
        minOutputLength: row.minOutputLength,
        maxOutputLength: row.maxOutputLength,
      }
    : { ...DEFAULT_SETTINGS };

  client.markovSettings.set(guildId, settings);
  return settings;
}

export type MarkovSettingsPatch = Partial<{
  enabled: boolean;
  mentionEnabled: boolean;
  randomEnabled: boolean;
  randomFrequency: number;
  randomCooldown: number;
  chainOrder: number;
  minOutputLength: number;
  maxOutputLength: number;
}>;

export async function updateMarkovSettings(
  guildId: string,
  client: Client,
  patch: MarkovSettingsPatch,
): Promise<void> {
  await client.prisma.markovSettings.upsert({
    where: { guildId },
    create: { guildId, ...DEFAULT_SETTINGS, ...patch },
    update: patch,
  });

  client.markovSettings.delete(guildId);
}

function parseChain(data: string): ChainMap {
  try {
    return JSON.parse(data) as ChainMap;
  } catch {
    return {};
  }
}

export async function getChain(
  client: Client,
  guildId: string,
): Promise<ChainMap | null> {
  const cached = client.markovChains.get(guildId);
  if (cached !== undefined) {
    return cached.length === 0 ? null : parseChain(cached);
  }

  const row = await client.prisma.markovChain.findUnique({
    where: { guildId },
    select: { data: true },
  });

  const data = row?.data ?? "";

  client.markovChains.set(guildId, data);

  return data.length === 0 ? null : parseChain(data);
}

function tokenize(content: string): string[] {
  return content
    .toLowerCase()
    .replace(MENTION_REGEX, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !PUNCT_ONLY_REGEX.test(token));
}

function recordTransition(chain: ChainMap, key: string, next: string) {
  const transitions = (chain[key] ??= {});
  transitions[next] = (transitions[next] ?? 0) + 1;
}

function startStateKey(order: number): string {
  return Array(order).fill(START).join(" ");
}

export async function learnMarkov(
  client: Client,
  guildId: string,
  content: string,
  order: number,
): Promise<void> {
  const tokens = tokenize(content);

  if (tokens.length === 0) return;

  const chain = (await getChain(client, guildId)) ?? {};
  const sequence: string[] = [
    ...Array<string>(order).fill(START),
    ...tokens,
    END,
  ];

  for (let i = 0; i < sequence.length - order; i++) {
    const key = sequence.slice(i, i + order).join(" ");
    recordTransition(chain, key, sequence[i + order]);
  }

  client.markovChains.set(guildId, JSON.stringify(chain));
  client.markovDirty.add(guildId);
}

export async function flushDirtyChains(client: Client): Promise<void> {
  const dirty = [...client.markovDirty];

  if (dirty.length === 0) return;

  client.markovDirty.clear();

  for (const guildId of dirty) {
    const data = client.markovChains.get(guildId) ?? "";

    try {
      await client.prisma.markovChain.upsert({
        where: { guildId },
        create: { guildId, data },
        update: { data, messageCount: { increment: 1 } },
      });
    } catch (error) {
      client.logger.error("Failed to flush Markov chain", {
        error,
        guildId,
      });
    }
  }
}

let flushStarted = false;

export function startMarkovFlush(client: Client): void {
  if (flushStarted) return;

  flushStarted = true;

  setInterval(() => {
    void flushDirtyChains(client);
  }, 30_000);
}

export async function clearChain(
  client: Client,
  guildId: string,
): Promise<void> {
  await client.prisma.markovChain.deleteMany({ where: { guildId } });

  client.markovChains.set(guildId, "");
  client.markovDirty.delete(guildId);
}

function pickWeighted(transitions: Record<string, number>): string | null {
  const entries = Object.entries(transitions);

  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  let roll = Math.random() * total;

  for (const [next, count] of entries) {
    roll -= count;
    if (roll <= 0) return next;
  }

  return entries[0]?.[0] ?? null;
}

function walk(chain: ChainMap, startKey: string, maxWords: number): string[] {
  const words: string[] = [];
  let state = startKey;

  while (words.length < maxWords) {
    const next = pickWeighted(chain[state] ?? {});

    if (next === null || next === END) break;

    words.push(next);

    const parts = state.split(" ");
    parts.shift();
    parts.push(next);
    state = parts.join(" ");
  }

  return words;
}

export function generateMarkov(
  chain: ChainMap,
  order: number,
  seed?: string,
  minWords = 1,
  maxWords = 25,
): string | null {
  const startKey =
    seed !== undefined
      ? [
          ...Array<string>(Math.max(order - 1, 0)).fill(START),
          seed.toLowerCase(),
        ].join(" ")
      : startStateKey(order);

  if (!chain[startKey]) return null;

  const target = Math.min(minWords, maxWords);
  let best: string[] = [];

  for (let attempt = 0; attempt < 8; attempt++) {
    const words = walk(chain, startKey, maxWords);
    if (words.length > best.length) best = words;
    if (words.length >= target) {
      best = words;
      break;
    }
  }

  if (best.length === 0) return null;

  const outputWords = seed !== undefined ? [seed.toLowerCase(), ...best] : best;
  let sentence = outputWords.join(" ");

  sentence = sentence.replace(/https\\?:\/\//gi, "https://");
  sentence = sentence.replace(/http\\?:\/\//gi, "http://");

  if (!/^https?:\/\//i.test(sentence)) {
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }

  return sentence;
}

export async function getMarkovChannels(
  guildId: string,
  client: Client,
): Promise<Set<string>> {
  const cached = client.markovChannels.get(guildId);
  if (cached !== undefined) return cached;

  const rows = await client.prisma.markovChannel.findMany({
    where: { guildId },
    select: { channelId: true },
  });

  const channels = new Set(rows.map((row) => row.channelId));
  client.markovChannels.set(guildId, channels);
  return channels;
}

export async function isMarkovChannelWhitelisted(
  guildId: string,
  channelId: string,
  parentId: string | null | undefined,
  client: Client,
): Promise<boolean> {
  const channels = await getMarkovChannels(guildId, client);

  if (channels.has(channelId)) return true;

  if (parentId && channels.has(parentId)) return true;

  return false;
}

export async function addMarkovChannel(
  guildId: string,
  channelId: string,
  client: Client,
): Promise<boolean> {
  await ensureGuild(guildId);

  const existing = await client.prisma.markovChannel.findUnique({
    where: {
      guildId_channelId: { guildId, channelId },
    },
    select: { channelId: true },
  });

  if (existing) return false;

  await client.prisma.markovChannel.create({
    data: { guildId, channelId },
  });

  const channels = await getMarkovChannels(guildId, client);
  channels.add(channelId);

  return true;
}

export async function removeMarkovChannel(
  guildId: string,
  channelId: string,
  client: Client,
): Promise<boolean> {
  const result = await client.prisma.markovChannel.deleteMany({
    where: { guildId, channelId },
  });

  if (result.count > 0) {
    const channels = await getMarkovChannels(guildId, client);
    channels.delete(channelId);
    return true;
  }

  return false;
}

export async function listMarkovChannels(
  guildId: string,
  client: Client,
): Promise<string[]> {
  const channels = await getMarkovChannels(guildId, client);
  return [...channels];
}

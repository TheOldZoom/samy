import type Client from "@/classes/client";
import { ensureGuild } from "@/utils/guild";

export const BOT_EVENTS = [
  "y/n",
  "v/s",
  "afk",
  "previousreaction",
  "reactiontrigger",
  "autoresponder",
  "commandfailure",
  "snipe",
  "automodmessage",
  "instagram",
  "tiktok",
  "grailed",
  "twitch",
  "streamable",
  "twitter",
  "medal",
  "soundcloud",
  "tumblr",
  "shorts",
  "kick",
  "youtube",
  "reddit",
] as const;

export const BOT_EVENTS_DEFAULT_ENABLED = new Set<string>([
  "y/n",
  "v/s",
  "afk",
  "previousreaction",
  "reactiontrigger",
  "autoresponder",
  "commandfailure",
  "automodmessage",
]);

export const BOT_EVENTS_DEFAULT_DISABLED = new Set<string>([
  "snipe",
  "instagram",
  "tiktok",
  "grailed",
  "twitch",
  "streamable",
  "twitter",
  "medal",
  "soundcloud",
  "tumblr",
  "shorts",
  "kick",
  "youtube",
  "reddit",
]);

export type BotEventName = (typeof BOT_EVENTS)[number];

export async function isBotEventEnabled(
  client: Client,
  guildId: string,
  eventName: string,
  channelId?: string,
): Promise<boolean> {
  const normalized = eventName.toLowerCase();

  if (channelId) {
    const channelSetting = await client.prisma.botEventSetting.findFirst({
      where: {
        guildId,
        channelId,
        event: normalized,
      },
    });

    if (channelSetting) {
      return channelSetting.enabled;
    }
  }

  const guildSetting = await client.prisma.botEventSetting.findFirst({
    where: {
      guildId,
      channelId: null,
      event: normalized,
    },
  });

  if (guildSetting) {
    return guildSetting.enabled;
  }

  if (BOT_EVENTS_DEFAULT_ENABLED.has(normalized)) {
    return true;
  }

  if (BOT_EVENTS_DEFAULT_DISABLED.has(normalized)) {
    return false;
  }

  return true;
}

export async function setBotEventEnabled(
  client: Client,
  guildId: string,
  eventName: string,
  enabled: boolean,
  channelId?: string,
): Promise<void> {
  await ensureGuild(guildId);

  const existing = await client.prisma.botEventSetting.findFirst({
    where: {
      guildId,
      channelId: channelId ?? null,
      event: eventName.toLowerCase(),
    },
  });

  if (existing) {
    await client.prisma.botEventSetting.update({
      where: { id: existing.id },
      data: { enabled },
    });
    return;
  }

  await client.prisma.botEventSetting.create({
    data: {
      guildId,
      channelId: channelId ?? undefined,
      event: eventName.toLowerCase(),
      enabled,
    },
  });
}

export async function getBotEventSettings(
  client: Client,
  guildId: string,
): Promise<
  Array<{
    id: string;
    channelId: string | null;
    event: string;
    enabled: boolean;
  }>
> {
  const settings = await client.prisma.botEventSetting.findMany({
    where: { guildId },
    orderBy: [{ channelId: "asc" }, { event: "asc" }],
  });

  return settings.map((s) => ({
    id: s.id,
    channelId: s.channelId,
    event: s.event,
    enabled: s.enabled,
  }));
}

export function formatBotEventName(eventName: string): string {
  return eventName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

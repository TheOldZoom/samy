let intervalStarted = false;

export function startAfkCleanup(client: AfkCleanupClient): void {
  if (intervalStarted) return;
  intervalStarted = true;

  const tick = async () => {
    try {
      await runAfkCleanup(client);
    } catch (error) {
      client.logger?.error?.("AFK cleanup failed", { error });
    }
  };

  setInterval(() => void tick(), 30_000);
  void tick();
}

export async function runAfkCleanup(client: AfkCleanupClient): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const expiredAfks = await client.prisma.afk.findMany({
    where: { createdAt: { lt: cutoff } },
    take: 100,
  });

  if (expiredAfks.length === 0) return;

  for (const afk of expiredAfks) {
    const mentions = await client.prisma.afkMention.findMany({
      where: { userId: afk.userId, guildId: afk.guildId },
      orderBy: { createdAt: "asc" },
    });

    if (mentions.length > 0) {
      await sendAfkMentionDm(client, afk.userId, afk.guildId, mentions);
    }

    await client.prisma.afkMention.deleteMany({
      where: { userId: afk.userId, guildId: afk.guildId },
    });

    await client.prisma.afk.deleteMany({
      where: { userId: afk.userId, guildId: afk.guildId },
    });

    client.afkUsers.delete(`${afk.guildId}:${afk.userId}`);
  }
}

async function sendAfkMentionDm(
  client: AfkCleanupClient,
  userId: string,
  guildId: string,
  mentions: Array<{
    mentionerId: string;
    channelId: string;
    messageId: string;
  }>,
): Promise<void> {
  const user = await client.users.fetch(userId).catch(() => null);

  if (!user) return;

  const dmLines = [
    client.i18n.t("commands.afk.dm_title"),
    "",
    ...mentions.map((m) =>
      client.i18n.t("commands.afk.dm_entry", {
        mentioner: `<@${m.mentionerId}>`,
        channel: `<#${m.channelId}>`,
        url: `https://discord.com/channels/${guildId}/${m.channelId}/${m.messageId}`,
      }),
    ),
    "",
    client.i18n.t("commands.afk.dm_footer", {
      count: mentions.length,
    }),
  ];

  await client.i18n.withResolvedLocale(
    {
      userId,
      guildId,
    },
    async () => {
      try {
        await user.send({
          flags: MessageFlags.IsComponentsV2,
          components: [new Container().text(Text(dmLines.join("\n")))],
        });
      } catch {
        // ignore dm failures
      }
    },
  );
}

interface AfkCleanupClient {
  logger?: { error?: (message: string, data: Record<string, unknown>) => void };
  prisma: {
    afk: {
      findMany: (
        args: Record<string, unknown>,
      ) => Promise<Array<{ userId: string; guildId: string }>>;
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
    };
    afkMention: {
      findMany: (
        args: Record<string, unknown>,
      ) => Promise<
        Array<{ mentionerId: string; channelId: string; messageId: string }>
      >;
      deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
    };
  };
  afkUsers: {
    delete: (key: string) => void;
  };
  users: {
    fetch: (
      userId: string,
    ) => Promise<{
      id: string;
      send: (options: unknown) => Promise<unknown>;
    } | null>;
  };
  i18n: {
    t: (key: string, data?: Record<string, unknown>) => string;
    withResolvedLocale: (
      opts: { userId: string; guildId: string },
      fn: () => Promise<unknown>,
    ) => Promise<unknown>;
  };
}

import { MessageFlags } from "discord.js";
import { Container, Text } from "@/ui/components";

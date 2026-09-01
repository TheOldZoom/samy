import { MessageFlags, WebhookClient } from "discord.js";
import { LogCategory } from "@prisma/client";

import type Client from "@/classes/client";
import type { Container } from "@/ui/components";
import { checkPermissions } from "@/utils/permission";
import { toEnumCategory, type LogCategoryKey } from "@/commands/shared/logs";

export interface SendLogOptions {
  guildId: string;
  category: LogCategoryKey;
  sourceChannelId?: string | null;
  ignoreTargets?: (string | null | undefined)[];
  container: Container;
}

async function isIgnored(
  client: Client,
  guildId: string,
  category: LogCategoryKey,
  targets: (string | null | undefined)[],
): Promise<boolean> {
  const targetIds = targets.filter(
    (id): id is string => typeof id === "string",
  );

  if (targetIds.length === 0) return false;

  const count = await client.prisma.logIgnore.count({
    where: {
      guildId,
      targetId: { in: targetIds },
      category: { in: [LogCategory.ALL, toEnumCategory(category)] },
    },
  });

  return count > 0;
}

async function resolveDestination(
  client: Client,
  guildId: string,
  category: LogCategoryKey,
): Promise<string | null> {
  const enumCategory = toEnumCategory(category);

  const logChannel = await client.prisma.logChannel.findUnique({
    where: {
      guildId_category: { guildId, category: enumCategory },
    },
  });

  return logChannel?.channelId ?? null;
}

async function resolveWebhook(
  client: Client,
  logChannel: {
    channelId: string;
    webhookId?: string | null;
    webhookToken?: string | null;
  },
) {
  if (!logChannel.webhookId || !logChannel.webhookToken) return null;

  const channel = await client.channels
    .fetch(logChannel.channelId)
    .catch(() => null);

  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    return null;
  }

  return new WebhookClient({
    id: logChannel.webhookId,
    token: logChannel.webhookToken,
  });
}

export async function sendLog(
  client: Client,
  options: SendLogOptions,
): Promise<void> {
  const {
    guildId,
    category,
    sourceChannelId,
    ignoreTargets = [],
    container,
  } = options;

  try {
    if (await isIgnored(client, guildId, category, ignoreTargets)) {
      return;
    }

    const destinationId = await resolveDestination(client, guildId, category);

    if (!destinationId) return;

    const logChannel = await client.prisma.logChannel.findUnique({
      where: {
        guildId_category: {
          guildId,
          category: toEnumCategory(category),
        },
      },
    });

    if (!logChannel) return;

    const webhook = await resolveWebhook(client, logChannel);

    const allowedMentions = {
      parse: ["users", "roles", "everyone"] as const,
      repliedUser: false,
    };

    if (webhook) {
      await webhook.send({
        components: [container],
        allowedMentions,
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const channel = await client.channels
      .fetch(destinationId)
      .catch(() => null);

    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      return;
    }

    const botMember = channel.guild.members.me;

    if (
      botMember &&
      !await checkPermissions(botMember, channel, ["ViewChannel", "SendMessages"])
    ) {
      return;
    }

    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
      allowedMentions,
    });
  } catch (error) {
    client.logger.error("Failed to deliver log message", {
      guildId,
      category,
      sourceChannelId,
      error,
    });
  }
}

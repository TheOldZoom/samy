import {
  AttachmentBuilder,
  ContainerBuilder,
  MessageFlags,
  TextDisplayBuilder,
  type Client,
  type Message,
} from "discord.js";
import { decompileMessageToScript } from "@/libs/scripting";
import type { DecompileOptions } from "@/libs/scripting/decompile";
const MESSAGE_LINK =
  /^https?:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/channels\/(?<guildId>@me|\d{15,20})\/(?<channelId>\d{15,20})\/(?<messageId>\d{15,20})/i;

const CODE_BLOCK_CHAR_BUDGET = 3900;

export async function fetchBuilderCopyTarget(
  client: Client,
  options: {
    link?: string;
    reply?: Message;
    guildId?: string | null;
  },
): Promise<Message | null> {
  const link = options.link?.trim();

  if (link) {
    const match = MESSAGE_LINK.exec(link);
    const groups = match?.groups;
    const channelId = groups?.channelId;
    const messageId = groups?.messageId;
    const linkGuildId = groups?.guildId;

    if (!channelId || !messageId) return null;
    if (
      options.guildId &&
      linkGuildId &&
      linkGuildId !== "@me" &&
      linkGuildId !== options.guildId
    ) {
      return null;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased() || !("messages" in channel)) return null;

    return channel.messages.fetch(messageId).catch(() => null);
  }

  if (!options.reply?.reference?.messageId) return null;
  return options.reply.fetchReference().catch(() => null);
}

export function decompileMessageForBuilder(
  message: Message,
  options: DecompileOptions = {},
): string {
  return decompileMessageToScript(
    {
      content: message.content,
      embeds: message.embeds.map((embed) => embed.toJSON()),
      components: message.components.map((component) => component.toJSON()),
    },
    options,
  );
}

export function buildBuilderCopyContainer(script: string): {
  flags: MessageFlags.IsComponentsV2;
  components: ContainerBuilder[];
  files?: AttachmentBuilder[];
} {
  const codeBlock = wrapScript(script);

  if (codeBlock.length <= CODE_BLOCK_CHAR_BUDGET) {
    const container = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(codeBlock),
    );

    return {
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    };
  }

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      "The decompiled script was too long to show inline, so it's attached below.",
    ),
  );

  const file = new AttachmentBuilder(Buffer.from(script, "utf-8"), {
    name: "builder-script.txt",
  });

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    files: [file],
  };
}

function wrapScript(script: string): string {
  return `\`\`\`txt\n${script.replaceAll("```", "\\`\\`\\`")}\n\`\`\``;
}

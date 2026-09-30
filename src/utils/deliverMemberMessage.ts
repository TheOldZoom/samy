import {
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type Message,
  type MessageCreateOptions,
  type PartialGuildMember,
  type PermissionsBitField,
} from "discord.js";

import {
  buildScriptMessage,
  getMemberVariableSource,
  replaceVariables,
  scheduleMessageDeletion,
  type ScriptMessageBody,
} from "@/libs/scripting";

type SendableChannel = {
  guild: Guild;
  isThread(): boolean;
  permissionsFor(member: GuildMember): Readonly<PermissionsBitField> | null;
  send(options: MessageCreateOptions): Promise<Message>;
};

export function missingMemberMessagePermissions(
  channel: SendableChannel,
  body: ScriptMessageBody,
) {
  const me = channel.guild.members.me;

  if (!me) {
    return ["View Channel", "Send Messages"];
  }

  const permissions = channel.permissionsFor(me);
  const missing: string[] = [];

  if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
    missing.push("View Channel");
  }

  const sendPermission = channel.isThread()
    ? PermissionFlagsBits.SendMessagesInThreads
    : PermissionFlagsBits.SendMessages;

  if (!permissions?.has(sendPermission)) {
    missing.push(
      channel.isThread() ? "Send Messages in Threads" : "Send Messages",
    );
  }

  if (
    body.embeds?.length &&
    !permissions?.has(PermissionFlagsBits.EmbedLinks)
  ) {
    missing.push("Embed Links");
  }

  return missing;
}

export type MemberMessageFailure =
  | { type: "invalid-message"; error: string }
  | { type: "missing-permissions"; permissions: string[] }
  | { type: "send-failed"; error: unknown };

export async function deliverMemberMessage(
  channel: SendableChannel,
  message: string,
  member: GuildMember | PartialGuildMember,
) {
  const source = getMemberVariableSource(member, message);
  const built = buildScriptMessage(replaceVariables(message, source));

  if (!built.success) {
    return {
      success: false as const,
      failure: { type: "invalid-message" as const, error: built.error },
    };
  }

  const missing = missingMemberMessagePermissions(channel, built.message.body);

  if (missing.length) {
    return {
      success: false as const,
      failure: {
        type: "missing-permissions" as const,
        permissions: missing,
      },
    };
  }

  try {
    const sent = await channel.send({
      ...built.message.body,
      allowedMentions: { users: [member.id] },
    });

    scheduleMessageDeletion(() => sent.delete(), built.message.deleteMs);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      failure: { type: "send-failed" as const, error },
    };
  }
}

export function memberMessageFailureReason(failure: MemberMessageFailure) {
  if (failure.type === "invalid-message") {
    return failure.error;
  }

  if (failure.type === "missing-permissions") {
    return `Missing permissions: ${failure.permissions.join(", ")}`;
  }

  return "Discord rejected the message";
}

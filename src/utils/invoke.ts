import {
  MessageFlags,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type Message,
  type User,
} from "discord.js";
import prisma from "@/libs/prisma";
import { ensureGuild } from "@/utils/guild";
import { replaceVariables } from "@/libs/scripting/variables";
import { detectScriptKind } from "@/libs/scripting/detectScriptKind";
import {
  compileEmbedScript,
  compileMultiEmbedScripts,
} from "@/libs/scripting/embed";
import { compileCv2Script } from "@/libs/scripting/cv2";
import { scheduleMessageDeletion } from "@/libs/scripting/scheduleMessageDeletion";
import { isScriptError } from "@/libs/scripting/common/ScriptError";

export const INVOKE_COMMANDS = [
  "ban",
  "tempban",
  "softban",
  "hardban",
  "kick",
  "timeout",
  "untimeout",
  "warn",
  "jail",
  "unjail",
  "imute",
  "iunmute",
  "rmute",
  "runmute",
  "stripstaff",
  "recentsoftban",
] as const;

export type InvokeCommand = (typeof INVOKE_COMMANDS)[number];
export type InvokeType = "message" | "dm" | "jail";

export function isInvokeCommand(cmd: string): cmd is InvokeCommand {
  return INVOKE_COMMANDS.includes(cmd.toLowerCase() as InvokeCommand);
}

export async function getInvokeMessage(
  guildId: string,
  command: string,
  type: InvokeType,
): Promise<string | null> {
  const record = await prisma.invokeMessage.findUnique({
    where: {
      guildId_command_type: {
        guildId,
        command: command.toLowerCase(),
        type,
      },
    },
    select: { content: true },
  });

  return record?.content ?? null;
}

export async function setInvokeMessage(
  guildId: string,
  command: string,
  type: InvokeType,
  content: string,
): Promise<void> {
  await ensureGuild(guildId);

  await prisma.invokeMessage.upsert({
    where: {
      guildId_command_type: {
        guildId,
        command: command.toLowerCase(),
        type,
      },
    },
    create: {
      guildId,
      command: command.toLowerCase(),
      type,
      content,
    },
    update: {
      content,
      updatedAt: new Date(),
    },
  });
}

export async function deleteInvokeMessage(
  guildId: string,
  command: string,
  type?: InvokeType,
): Promise<number> {
  if (type) {
    const result = await prisma.invokeMessage.deleteMany({
      where: {
        guildId,
        command: command.toLowerCase(),
        type,
      },
    });
    return result.count;
  }

  const result = await prisma.invokeMessage.deleteMany({
    where: {
      guildId,
      command: command.toLowerCase(),
    },
  });
  return result.count;
}

export async function getAllInvokeMessages(guildId: string) {
  return prisma.invokeMessage.findMany({
    where: { guildId },
    orderBy: [{ command: "asc" }, { type: "asc" }],
  });
}

export function validateInvokeScript(script: string): {
  valid: boolean;
  error?: string;
} {
  try {
    const detected = detectScriptKind(script);

    if (detected.kind === "text") {
      return { valid: true };
    }

    if (detected.kind === "embed") {
      if (!detected.source) {
        return { valid: false, error: "Missing embed definition" };
      }
      const compiled = compileEmbedScript(detected.source);
      if (!compiled.success) {
        return {
          valid: false,
          error: isScriptError(compiled.error)
            ? compiled.error.message
            : "Invalid embed script",
        };
      }
      return { valid: true };
    }

    if (detected.kind === "multi-embed") {
      if (!detected.source) {
        return { valid: false, error: "Missing embed definition" };
      }
      const compiled = compileMultiEmbedScripts(detected.source);
      if (!compiled.success) {
        return {
          valid: false,
          error: isScriptError(compiled.error)
            ? compiled.error.message
            : "Invalid multi-embed script",
        };
      }
      return { valid: true };
    }

    if (!detected.source) {
      return { valid: false, error: "Missing CV2 definition" };
    }
    const compiled = compileCv2Script(detected.source);
    if (!compiled.success) {
      return {
        valid: false,
        error: isScriptError(compiled.error)
          ? compiled.error.message
          : "Invalid CV2 script",
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid script",
    };
  }
}

export interface PunishmentVariableOptions {
  user: User;
  guild: Guild | null;
  member?: GuildMember | null;
  moderator?: User | GuildMember | null;
  reason?: string | null;
  duration?: string | null;
  caseNumber?: number | null;
}

export function replacePunishmentVariables(
  content: string,
  options: PunishmentVariableOptions,
): string {
  const {
    user,
    guild,
    member = null,
    moderator = null,
    reason = null,
    duration = null,
    caseNumber = null,
  } = options;

  let result = replaceVariables(content, { user, guild, member });

  const modUser = moderator
    ? "user" in moderator
      ? moderator.user
      : moderator
    : null;

  const modMember = moderator && "roles" in moderator ? moderator : null;

  const modTag = modUser
    ? modUser.discriminator && modUser.discriminator !== "0"
      ? `${modUser.username}#${modUser.discriminator}`
      : modUser.username
    : "Moderator";

  const punishmentVars: Record<string, string> = {
    "{reason}": reason || "No reason provided.",
    "{duration}": duration || "Permanent",
    "{case}":
      caseNumber !== null && caseNumber !== undefined
        ? String(caseNumber)
        : "N/A",
    "{moderator}": modUser ? modUser.toString() : "Moderator",
    "{moderator.mention}": modUser ? modUser.toString() : "Moderator",
    "{moderator.id}": modUser ? modUser.id : "",
    "{moderator.username}": modUser ? modUser.username : "Moderator",
    "{moderator.tag}": modTag,
    "{moderator.displayname}":
      modMember?.displayName ?? modUser?.displayName ?? "Moderator",
    "{moderator.avatar}": modUser?.displayAvatarURL({ size: 1024 }) ?? "",
  };

  for (const [key, value] of Object.entries(punishmentVars)) {
    result = result.replaceAll(key, value);
  }

  return result;
}

export async function deliverPunishmentDm(options: {
  guild: Guild;
  target: User;
  action: InvokeCommand;
  moderator?: User | GuildMember | null;
  reason?: string | null;
  duration?: string | null;
  caseNumber?: number | null;
  fallback?: () => Promise<void>;
}): Promise<boolean> {
  const {
    guild,
    target,
    action,
    moderator,
    reason,
    duration,
    caseNumber,
    fallback,
  } = options;

  const customScript = await getInvokeMessage(guild.id, action, "dm");

  if (!customScript) {
    if (fallback) {
      try {
        await fallback();
      } catch {}
    }
    return false;
  }

  const member = guild.members.cache.get(target.id) ?? null;
  const processed = replacePunishmentVariables(customScript, {
    user: target,
    guild,
    member,
    moderator,
    reason,
    duration,
    caseNumber,
  });

  try {
    const detected = detectScriptKind(processed);

    if (detected.kind === "text") {
      const sent = await target.send(detected.source);
      scheduleMessageDeletion(sent, detected.deleteMs);
      return true;
    }

    if (detected.kind === "embed") {
      if (!detected.source) return false;
      const compiled = compileEmbedScript(detected.source);
      if (!compiled.success) return false;

      const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;
      const sent = await target.send({
        ...(compiled.result.content
          ? { content: compiled.result.content }
          : {}),
        embeds: [compiled.result.embed],
        ...(compiled.result.components.length > 0
          ? { components: compiled.result.components }
          : {}),
      });
      scheduleMessageDeletion(sent, deleteMs);
      return true;
    }

    if (detected.kind === "multi-embed") {
      if (!detected.source) return false;
      const compiled = compileMultiEmbedScripts(detected.source);
      if (!compiled.success) return false;

      const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;
      const allComponents: (typeof compiled.result.embeds)[number]["components"] =
        [];
      const embeds = compiled.result.embeds.map((e) => {
        allComponents.push(...e.components);
        return e.embed;
      });

      const sent = await target.send({
        ...(compiled.result.content
          ? { content: compiled.result.content }
          : {}),
        embeds,
        ...(allComponents.length > 0 ? { components: allComponents } : {}),
      });
      scheduleMessageDeletion(sent, deleteMs);
      return true;
    }

    if (!detected.source) return false;
    const compiled = compileCv2Script(detected.source);
    if (!compiled.success) return false;

    const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;
    const sent = await target.send({
      flags: MessageFlags.IsComponentsV2,
      components: compiled.result.components,
    });
    scheduleMessageDeletion(sent, deleteMs);
    return true;
  } catch {
    return false;
  }
}

export async function sendPunishmentResponse(options: {
  message: Message;
  target: User;
  action: InvokeCommand;
  moderator?: User | GuildMember | null;
  reason?: string | null;
  duration?: string | null;
  caseNumber?: number | null;
  fallback?: () => Promise<void>;
  channel?: GuildTextBasedChannel | null;
}): Promise<void> {
  const {
    message,
    target,
    action,
    moderator,
    reason,
    duration,
    caseNumber,
    fallback,
    channel,
  } = options;

  if (!message.guild) {
    if (fallback) await fallback();
    return;
  }

  const targetChannel = (channel ?? message.channel) as GuildTextBasedChannel;

  const customScript = await getInvokeMessage(
    message.guild.id,
    action,
    channel ? "jail" : "message",
  );

  if (!customScript) {
    if (fallback) await fallback();
    return;
  }

  const member = message.guild.members.cache.get(target.id) ?? null;
  const processed = replacePunishmentVariables(customScript, {
    user: target,
    guild: message.guild,
    member,
    moderator: moderator ?? message.author,
    reason,
    duration,
    caseNumber,
  });

  try {
    const detected = detectScriptKind(processed);

    if (detected.kind === "text") {
      const sent = await targetChannel.send(detected.source);
      scheduleMessageDeletion(sent, detected.deleteMs);
      return;
    }

    if (detected.kind === "embed") {
      if (!detected.source) {
        if (fallback) await fallback();
        return;
      }
      const compiled = compileEmbedScript(detected.source);
      if (!compiled.success) {
        if (fallback) await fallback();
        return;
      }

      const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;
      const sent = await targetChannel.send({
        ...(compiled.result.content
          ? { content: compiled.result.content }
          : {}),
        embeds: [compiled.result.embed],
        ...(compiled.result.components.length > 0
          ? { components: compiled.result.components }
          : {}),
      });
      scheduleMessageDeletion(sent, deleteMs);
      return;
    }

    if (detected.kind === "multi-embed") {
      if (!detected.source) {
        if (fallback) await fallback();
        return;
      }
      const compiled = compileMultiEmbedScripts(detected.source);
      if (!compiled.success) {
        if (fallback) await fallback();
        return;
      }

      const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;
      const allComponents: (typeof compiled.result.embeds)[number]["components"] =
        [];
      const embeds = compiled.result.embeds.map((e) => {
        allComponents.push(...e.components);
        return e.embed;
      });

      const sent = await targetChannel.send({
        ...(compiled.result.content
          ? { content: compiled.result.content }
          : {}),
        embeds,
        ...(allComponents.length > 0 ? { components: allComponents } : {}),
      });
      scheduleMessageDeletion(sent, deleteMs);
      return;
    }

    if (!detected.source) {
      if (fallback) await fallback();
      return;
    }
    const compiled = compileCv2Script(detected.source);
    if (!compiled.success) {
      if (fallback) await fallback();
      return;
    }

    const deleteMs = compiled.result.deleteMs ?? detected.deleteMs;
    const sent = await targetChannel.send({
      flags: MessageFlags.IsComponentsV2,
      components: compiled.result.components,
    });
    scheduleMessageDeletion(sent, deleteMs);
  } catch {
    if (fallback) await fallback();
  }
}

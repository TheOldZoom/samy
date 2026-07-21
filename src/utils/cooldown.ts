import type { ChatInputCommandInteraction } from "discord.js";
import type Client from "@/classes/Client";
import type {
  MessageCommand,
  MessageSubcommand,
  SlashCommand,
} from "@/classes/Command";

type Command = SlashCommand | MessageCommand | MessageSubcommand;

function getCooldownKey(
  commandType: "slash" | "message",
  userId: string,
  command: Command,
  options?: {
    interaction?: ChatInputCommandInteraction;
    path?: string[];
  },
) {
  const parts = [commandType, userId, command.name];

  if (commandType === "slash" && options?.interaction) {
    const group = options.interaction.options.getSubcommandGroup(false);
    const sub = options.interaction.options.getSubcommand(false);

    if (group) parts.push(group);
    if (sub) parts.push(sub);
  }

  if (commandType === "message" && options?.path) {
    parts.push(...options.path);
  }

  return parts.join(":");
}

export function checkCooldown(
  client: Client,
  commandType: "slash" | "message",
  userId: string,
  command: Command,
  options?: {
    interaction?: ChatInputCommandInteraction;
    path?: string[];
  },
) {
  const key = getCooldownKey(commandType, userId, command, options);

  const expiresAt = client.cooldowns.get(key);

  if (!expiresAt) return null;

  const remaining = expiresAt - Date.now();

  if (remaining <= 0) {
    client.cooldowns.delete(key);
    return null;
  }

  return Math.ceil(remaining / 1000);
}

export function setCooldown(
  client: Client,
  commandType: "slash" | "message",
  userId: string,
  command: Command,
  cooldown: number,
  options?: {
    interaction?: ChatInputCommandInteraction;
    path?: string[];
  },
) {
  const key = getCooldownKey(commandType, userId, command, options);

  client.cooldowns.set(key, Date.now() + cooldown * 1000);
}

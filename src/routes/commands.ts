import { Elysia } from "elysia";
import type { ShardingManager } from "discord.js";
import type { MessageCommand, MessageSubcommand } from "@/classes/Command";

interface SerializedSubcommand {
  name: string;
  aliases: string[];
  description: string | null;

  arguments: MessageSubcommand["arguments"];

  cooldown: number | null;
  guildOnly: boolean;
  ownerOnly: boolean;

  userPermissions: MessageSubcommand["userPermissions"];
  botPermissions: MessageSubcommand["botPermissions"];

  hasExecute: boolean;

  subcommands: SerializedSubcommand[];
}

interface SerializedCommand {
  name: string;
  aliases: string[];
  description: string | null;

  category: string;

  arguments: MessageCommand["arguments"];

  cooldown: number | null;
  guildOnly: boolean;
  ownerOnly: boolean;

  userPermissions: MessageCommand["userPermissions"];
  botPermissions: MessageCommand["botPermissions"];

  hasExecute: boolean;

  subcommands: SerializedSubcommand[];
}

export default (manager: ShardingManager) =>
  new Elysia({ prefix: "/commands" }).get("/", async () => {
    const perShard = (await manager.broadcastEval((client: { [key: string]: unknown }) => {
      const serializeSubcommand = (sub: { name: string; aliases: string[]; description?: string; arguments: unknown[]; cooldown?: number; guildOnly?: boolean; ownerOnly?: boolean; userPermissions?: string[]; botPermissions?: string[]; hasExecute: boolean; subcommands?: unknown[] }): SerializedSubcommand => ({
        name: sub.name,
        aliases: sub.aliases,
        description: sub.description ?? null,

        arguments: sub.arguments,

        cooldown: sub.cooldown ?? null,
        guildOnly: sub.guildOnly ?? false,
        ownerOnly: sub.ownerOnly ?? false,

        userPermissions: sub.userPermissions ?? [],
        botPermissions: sub.botPermissions ?? [],

        hasExecute: sub.hasExecute,

        subcommands: (sub.subcommands ?? []).map(serializeSubcommand),
      });

      const serializeCommand = (command: { name: string; aliases: string[]; description?: string; options?: { category?: string }; arguments: unknown[]; cooldown?: number; guildOnly?: boolean; ownerOnly?: boolean; userPermissions?: string[]; botPermissions?: string[]; hasExecute: boolean; subcommands?: unknown[] }): SerializedCommand => ({
        name: command.name,
        aliases: command.aliases,
        description: command.description ?? null,

        category: command.options?.category ?? "Uncategorized",

        arguments: command.arguments,

        cooldown: command.cooldown ?? null,
        guildOnly: command.guildOnly ?? false,
        ownerOnly: command.ownerOnly ?? false,

        userPermissions: command.userPermissions ?? [],
        botPermissions: command.botPermissions ?? [],

        hasExecute: command.hasExecute,

        subcommands: (command.subcommands ?? []).map(serializeSubcommand),
      });

      return [...(client.messageCommands as Map<string, { name: string; aliases: string[]; description?: string; options?: { category?: string }; arguments: unknown[]; cooldown?: number; guildOnly?: boolean; ownerOnly?: boolean; userPermissions?: string[]; botPermissions?: string[]; hasExecute: boolean; subcommands?: unknown[] }>).values()].map(serializeCommand);
    })) as SerializedCommand[][];

    const commands = [
      ...new Map(
        perShard.flat().map((command) => [command.name, command]),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name));

    const categories = new Map<string, SerializedCommand[]>();

    for (const command of commands) {
      const list = categories.get(command.category) ?? [];

      list.push(command);
      categories.set(command.category, list);
    }

    return Object.fromEntries(
      [...categories.entries()].sort(([a], [b]) => a.localeCompare(b)),
    );
  });

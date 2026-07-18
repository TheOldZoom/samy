import type {
  ChatInputCommandInteraction,
  Collection,
  ContextMenuCommandBuilder,
  ContextMenuCommandInteraction,
  Message,
  PermissionResolvable,
  SlashCommandBuilder,
} from "discord.js";
import type Client from "./Client";
import { readdir } from "fs/promises";
import { join } from "path";

export interface BaseCommandOptions {
  category?: string;
  cooldown?: number;
  guildOnly?: boolean;
  ownerOnly?: boolean;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
}

export interface SlashCommandOptions extends BaseCommandOptions {
  data: SlashCommandBuilder;

  execute: (
    client: Client,
    interaction: ChatInputCommandInteraction,
  ) => Promise<void>;
}

export interface MessageCommandOptions extends BaseCommandOptions {
  name: string;
  aliases?: string[];
  description?: string;
  usage?: string;

  execute: (client: Client, message: Message, args: string[]) => Promise<void>;
}

export interface ContextCommandOptions extends BaseCommandOptions {
  data: ContextMenuCommandBuilder;

  execute: (
    client: Client,
    interaction: ContextMenuCommandInteraction,
  ) => Promise<void>;
}

export class SlashCommand {
  constructor(public readonly options: SlashCommandOptions) {}

  get name() {
    return this.options.data.name;
  }

  execute(client: Client, interaction: ChatInputCommandInteraction) {
    return this.options.execute(client, interaction);
  }
}

export class MessageCommand {
  constructor(public readonly options: MessageCommandOptions) {}

  get name() {
    return this.options.name;
  }

  execute(client: Client, message: Message, args: string[]) {
    return this.options.execute(client, message, args);
  }
}

export class ContextCommand {
  constructor(public readonly options: ContextCommandOptions) {}

  get name() {
    return this.options.data.name;
  }

  execute(client: Client, interaction: ContextMenuCommandInteraction) {
    return this.options.execute(client, interaction);
  }
}

export async function LoadCommands<T extends { name: string }>(
  client: Client,
  directory: string,
  collection: Collection<string, T>,
) {
  const files = await readdir(join(import.meta.dir, directory), {
    recursive: true,
  });

  const type = directory.split("/").pop();

  for (const file of files) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

    const command = (await import(join(import.meta.dir, directory, file)))
      .default as T;

    collection.set(command.name, command);

    client.logger.info(`Loaded ${type} command: ${command.name}`);
  }
}

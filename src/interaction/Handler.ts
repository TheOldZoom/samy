import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  ContextMenuCommandInteraction,
  Interaction as DiscordInteraction,
  MessageComponentInteraction,
} from "discord.js";

import type Client from "@/classes/Client";
import type { Interaction } from "@/classes/Interaction";

import type { ComponentId } from "./ComponentId";

export type InteractionHandlerExecute = (
  client: Client,
  interaction: Interaction,
  component: ComponentId,
) => Promise<void> | void;

export default class InteractionHandler {
  public readonly feature: string;
  public readonly action: string;
  public readonly execute: InteractionHandlerExecute;

  constructor(options: {
    feature: string;
    action: string;
    execute: InteractionHandlerExecute;
  }) {
    this.feature = options.feature;
    this.action = options.action;
    this.execute = options.execute;
  }

  get key() {
    return `${this.feature}:${this.action}`;
  }
}

export function LogInteraction(
  client: Client,
  interaction:
    | DiscordInteraction
    | MessageComponentInteraction
    | ContextMenuCommandInteraction,
  target: string,
) {
  const data: Record<string, unknown> = {
    interactionId: interaction.id,
    userId: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    target,
  };

  let type: string;

  if (interaction.isChatInputCommand()) {
    type = "command";
    data.commandName = interaction.commandName;
    data.options = interaction.options.data.map((option) => option.name);
  } else if (interaction.isContextMenuCommand()) {
    type = "context";
    data.commandName = interaction.commandName;
    data.commandType = interaction.commandType;
    data.targetId = interaction.targetId;
  } else if (interaction.isAutocomplete()) {
    type = "autocomplete";
    data.commandName = interaction.commandName;
    data.focusedOption = interaction.options.getFocused(true).name;
  } else if (interaction.isButton()) {
    type = "button";
    data.customId = interaction.customId;
  } else if (interaction.isAnySelectMenu()) {
    type = "select";
    data.customId = interaction.customId;
    data.values = interaction.values;
  } else if (interaction.isModalSubmit()) {
    type = "modal";
    data.customId = interaction.customId;
  } else {
    type = "unknown";
  }

  client.logger.info(data, `Interaction: ${type}`);
}

async function getFiles(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getFiles(path)));
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))
    ) {
      files.push(path);
    }
  }

  return files;
}

export async function LoadInteractionHandlers(
  client: Client,
  type: "buttons" | "selects" | "modals",
) {
  const directory = join(import.meta.dir, `./${type}`);

  const files = await getFiles(directory);

  for (const file of files) {
    const handler = (
      (await import(file)) as {
        default: InteractionHandler;
      }
    ).default;

    client.interactionHandlers[type].set(handler.key, handler);

    client.logger.info(
      `${`[${type.toUpperCase()}]:`.padEnd(10)} ${handler.key}`,
    );
  }
}

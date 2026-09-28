import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type APIChatInputApplicationCommandInteraction,
  type APIApplicationCommandBasicOption,
  type APIApplicationCommandInteractionDataOption,
  type APIApplicationCommandAutocompleteInteraction,
} from "@discordjs/core";

import type Client from "./Client";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Interaction } from "./Interaction";

const DEFAULT_COOLDOWN = 2.5;

const EPHEMERAL_OPTION: APIApplicationCommandBasicOption = {
  name: "ephemeral",
  description: "Whether the response should only be visible to you",
  type: ApplicationCommandOptionType.Boolean,
  required: false,
};

function withEphemeral(
  options: APIApplicationCommandBasicOption[] | undefined,
  ephemeral: boolean,
): APIApplicationCommandBasicOption[] | undefined {
  if (!ephemeral) return options;

  if (options?.some((option) => option.name === EPHEMERAL_OPTION.name)) {
    return options;
  }

  return [...(options ?? []), EPHEMERAL_OPTION];
}

export type CommandExecute = (
  client: Client,
  interaction: Interaction,
) => Promise<void> | void;

export interface SubcommandOptions {
  name: string;
  description: string;
  options?: APIApplicationCommandBasicOption[];
  cooldown?: number;
  dailyLimit?: number;
  ephemeral?: boolean;
  execute: CommandExecute;
  autocomplete?: CommandExecute;
}

export class Subcommand {
  public readonly name: string;
  public readonly description: string;
  public readonly options?: APIApplicationCommandBasicOption[];
  public readonly cooldown?: number;
  public readonly dailyLimit?: number;
  public readonly ephemeral: boolean;
  public readonly execute: CommandExecute;
  public readonly autocomplete?: CommandExecute;

  constructor(options: SubcommandOptions) {
    this.name = options.name;
    this.description = options.description;
    this.options = options.options;
    this.cooldown = options.cooldown ?? DEFAULT_COOLDOWN;
    this.dailyLimit = options.dailyLimit;
    this.ephemeral = options.ephemeral ?? false;
    this.execute = options.execute;
    this.autocomplete = options.autocomplete;
  }
}

export interface SubcommandGroupOptions {
  name: string;
  description: string;
  subcommands: Subcommand[];
}

export class SubcommandGroup {
  public readonly name: string;
  public readonly description: string;
  public readonly subcommands = new Map<string, Subcommand>();

  constructor(options: SubcommandGroupOptions) {
    this.name = options.name;
    this.description = options.description;

    for (const subcommand of options.subcommands) {
      this.subcommands.set(subcommand.name, subcommand);
    }
  }
}

export interface CommandOptions {
  name: string;
  description: string;
  options?: APIApplicationCommandBasicOption[];
  subcommands?: Subcommand[];
  subcommandGroups?: SubcommandGroup[];
  everywhere?: boolean;
  defaultMemberPermissions?: string;
  cooldown?: number;
  dailyLimit?: number;
  ephemeral?: boolean;
  execute?: CommandExecute;
  autocomplete?: CommandExecute;
}

export interface ResolvedCommand {
  execute?: CommandExecute;
  options?: APIApplicationCommandInteractionDataOption[];
  cooldown?: number;
  dailyLimit?: number;
  ephemeral: boolean;
  key: string;
}

export default class Command {
  public readonly data: RESTPostAPIChatInputApplicationCommandsJSONBody;

  public readonly cooldown?: number;
  public readonly dailyLimit?: number;
  public readonly ephemeral: boolean;
  public readonly execute?: CommandExecute;
  public readonly autocomplete?: CommandExecute;

  public readonly subcommands = new Map<string, Subcommand>();
  public readonly subcommandGroups = new Map<string, SubcommandGroup>();

  constructor(options: CommandOptions) {
    for (const subcommand of options.subcommands ?? []) {
      this.subcommands.set(subcommand.name, subcommand);
    }

    for (const group of options.subcommandGroups ?? []) {
      this.subcommandGroups.set(group.name, group);
    }

    const ephemeral = options.ephemeral ?? false;

    const hasSubcommands =
      (options.subcommands?.length ?? 0) > 0 ||
      (options.subcommandGroups?.length ?? 0) > 0;

    const commandOptions = hasSubcommands
      ? [
          ...(options.subcommandGroups?.map((group) => ({
            name: group.name,
            description: group.description,
            type: ApplicationCommandOptionType.SubcommandGroup as const,
            options: [...group.subcommands.values()].map((sub) => ({
              name: sub.name,
              description: sub.description,
              type: ApplicationCommandOptionType.Subcommand as const,
              options: withEphemeral(sub.options, sub.ephemeral),
            })),
          })) ?? []),

          ...(options.subcommands?.map((sub) => ({
            name: sub.name,
            description: sub.description,
            type: ApplicationCommandOptionType.Subcommand as const,
            options: withEphemeral(sub.options, sub.ephemeral),
          })) ?? []),
        ]
      : withEphemeral(options.options, ephemeral);

    this.data = {
      name: options.name,
      description: options.description,
      type: ApplicationCommandType.ChatInput,
      options: commandOptions,
      default_member_permissions: options.defaultMemberPermissions,

      ...(options.everywhere
        ? {
            integration_types: [
              ApplicationIntegrationType.GuildInstall,
              ApplicationIntegrationType.UserInstall,
            ],

            contexts: [
              InteractionContextType.Guild,
              InteractionContextType.BotDM,
              InteractionContextType.PrivateChannel,
            ],
          }
        : {}),
    };

    this.cooldown = options.cooldown ?? DEFAULT_COOLDOWN;
    this.dailyLimit = options.dailyLimit;
    this.ephemeral = ephemeral;
    this.execute = options.execute;
    this.autocomplete = options.autocomplete;
  }

  get name() {
    return this.data.name;
  }

  resolve(
    interaction: APIChatInputApplicationCommandInteraction,
  ): ResolvedCommand {
    const first = interaction.data.options?.[0];

    if (first?.type === ApplicationCommandOptionType.SubcommandGroup) {
      const group = this.subcommandGroups.get(first.name);
      const sub = first.options?.[0];

      const subcommand = sub ? group?.subcommands.get(sub.name) : undefined;

      return {
        execute: subcommand?.execute,
        options: sub?.options as
          APIApplicationCommandInteractionDataOption[] | undefined,
        cooldown: subcommand?.cooldown ?? this.cooldown,
        ephemeral: subcommand?.ephemeral ?? false,
        dailyLimit: subcommand?.dailyLimit ?? this.dailyLimit,
        key: `${this.name}:${first.name}:${sub?.name}`,
      };
    }

    if (first?.type === ApplicationCommandOptionType.Subcommand) {
      const subcommand = this.subcommands.get(first.name);

      return {
        execute: subcommand?.execute,
        options: first.options as
          APIApplicationCommandInteractionDataOption[] | undefined,
        cooldown: subcommand?.cooldown ?? this.cooldown,
        ephemeral: subcommand?.ephemeral ?? false,
        dailyLimit: subcommand?.dailyLimit ?? this.dailyLimit,
        key: `${this.name}:${first.name}`,
      };
    }

    return {
      execute: this.execute,
      options: interaction.data.options,
      cooldown: this.cooldown,
      ephemeral: this.ephemeral,
      dailyLimit: this.dailyLimit,
      key: this.name,
    };
  }

  resolveAutocomplete(
    interaction: APIApplicationCommandAutocompleteInteraction,
  ): CommandExecute | undefined {
    const first = interaction.data.options?.[0];

    if (first?.type === ApplicationCommandOptionType.SubcommandGroup) {
      const group = this.subcommandGroups.get(first.name);
      const sub = first.options?.[0];

      if (sub?.type === ApplicationCommandOptionType.Subcommand) {
        return group?.subcommands.get(sub.name)?.autocomplete;
      }

      return undefined;
    }

    if (first?.type === ApplicationCommandOptionType.Subcommand) {
      return this.subcommands.get(first.name)?.autocomplete;
    }

    return this.autocomplete;
  }
}

async function getCommandFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getCommandFiles(path)));
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

export async function LoadCommands(client: Client) {
  const commandsDirectory = join(import.meta.dir, "../interaction/commands");
  const files = await getCommandFiles(commandsDirectory);

  for (const file of files) {
    const command = (
      (await import(file)) as {
        default: Command;
      }
    ).default;

    client.commands.set(command.name, command);

    client.logger.info(`${`[COMMAND]:`.padEnd(10)} ${command.name}`);
  }
}

interface NormalizableCommand {
  name: string;
  description: string;
  type?: ApplicationCommandType;
  options?: unknown[];
  default_member_permissions?: string | null;
  nsfw?: boolean;
  integration_types?: unknown[] | null;
  contexts?: unknown[] | null;
}

function normalize(command: NormalizableCommand) {
  return stableStringify({
    name: command.name,
    description: command.description,
    type: command.type ?? 1,
    options: command.options ?? [],
    default_member_permissions: command.default_member_permissions ?? null,
    nsfw: command.nsfw ?? false,
    integration_types: command.integration_types ?? [],
    contexts: command.contexts ?? [],
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();

    const entries = keys.map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(
          (value as Record<string, unknown>)[key],
        )}`,
    );

    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

export async function RegisterCommands(client: Client) {
  const local = [...client.commands.values()].map((command) => command.data);

  const existing = await client.api.applicationCommands.getGlobalCommands(
    client.user!.id,
  );

  const sameCount = local.length === existing.length;

  const noDifferences =
    sameCount &&
    local.every((localCommand) => {
      const match = existing.find(
        (existingCommand) => existingCommand.name === localCommand.name,
      );

      if (!match) return false;

      return normalize(localCommand) === normalize(match);
    });

  if (noDifferences) {
    client.logger.info("Commands unchanged, skipping registration");

    return;
  }

  const result =
    await client.api.applicationCommands.bulkOverwriteGlobalCommands(
      client.user!.id,
      local,
    );

  client.logger.info(`Registered ${result.length} global commands`);
}

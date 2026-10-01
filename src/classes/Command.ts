import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
  Routes,
  type APIApplicationCommandBasicOption,
  type APIApplicationCommandInteractionDataOption,
  type APIApplicationCommandOption,
  type APIChatInputApplicationCommandInteractionData,
  type RESTGetAPIApplicationCommandsResult,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
  type RESTPutAPIApplicationCommandsJSONBody,
  type RESTPutAPIApplicationCommandsResult,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type ContextMenuCommandBuilder,
  type ContextMenuCommandInteraction,
  type PermissionsString,
  type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from "discord.js";

import type { Interaction } from "./Interaction";
import type Client from "./Client";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

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
  interaction: Interaction<ChatInputCommandInteraction>,
) => Promise<void> | void;

export type AutocompleteExecute = (
  client: Client,
  interaction: Interaction<AutocompleteInteraction>,
) => Promise<void> | void;

export interface SubcommandOptions {
  name: string;
  description: string;
  options?: APIApplicationCommandBasicOption[];
  cooldown?: number;
  dailyLimit?: number;
  ephemeral?: boolean;
  execute: CommandExecute;
  autocomplete?: AutocompleteExecute;
}

export class Subcommand {
  public readonly name: string;
  public readonly description: string;
  public readonly options?: APIApplicationCommandBasicOption[];
  public readonly cooldown?: number;
  public readonly dailyLimit?: number;
  public readonly ephemeral: boolean;
  public readonly execute: CommandExecute;
  public readonly autocomplete?: AutocompleteExecute;

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
  defaultMemberPermissions?: string | bigint;
  cooldown?: number;
  dailyLimit?: number;
  ephemeral?: boolean;
  execute?: CommandExecute;
  autocomplete?: AutocompleteExecute;
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
  public readonly defaultMemberPermissions?: bigint;
  public readonly execute?: CommandExecute;
  public readonly autocomplete?: AutocompleteExecute;

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
      default_member_permissions: options.defaultMemberPermissions?.toString(),
      integration_types: options.everywhere
        ? [
            ApplicationIntegrationType.GuildInstall,
            ApplicationIntegrationType.UserInstall,
          ]
        : [ApplicationIntegrationType.GuildInstall],
      contexts: options.everywhere
        ? [
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel,
          ]
        : [InteractionContextType.Guild],
    };

    this.cooldown = options.cooldown ?? DEFAULT_COOLDOWN;
    this.dailyLimit = options.dailyLimit;
    this.ephemeral = ephemeral;
    this.defaultMemberPermissions =
      options.defaultMemberPermissions === undefined
        ? undefined
        : BigInt(options.defaultMemberPermissions);
    this.execute = options.execute;
    this.autocomplete = options.autocomplete;
  }

  get name() {
    return this.data.name;
  }

  resolve(interaction: ChatInputCommandInteraction): ResolvedCommand {
    const data = interaction.options
      .data as APIChatInputApplicationCommandInteractionData["options"];
    const first = data?.[0];

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
      options: data,
      cooldown: this.cooldown,
      ephemeral: this.ephemeral,
      dailyLimit: this.dailyLimit,
      key: this.name,
    };
  }

  resolveAutocomplete(
    interaction: AutocompleteInteraction,
  ): AutocompleteExecute | undefined {
    const data = interaction.options
      .data as APIChatInputApplicationCommandInteractionData["options"];
    const first = data?.[0];

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

export interface ContextCommandOptions {
  data: ContextMenuCommandBuilder;
  botPermissions?: PermissionsString[];
  cooldown?: number;
  dailyLimit?: number;
  execute: (
    client: Client,
    interaction: Interaction<ContextMenuCommandInteraction>,
  ) => Promise<void> | void;
}

export class ContextCommand {
  public readonly data: RESTPostAPIContextMenuApplicationCommandsJSONBody;
  public readonly cooldown?: number;
  public readonly dailyLimit?: number;
  public readonly execute: ContextCommandOptions["execute"];

  constructor(options: ContextCommandOptions) {
    this.data = options.data.toJSON();
    this.cooldown = options.cooldown ?? DEFAULT_COOLDOWN;
    this.dailyLimit = options.dailyLimit;
    this.execute = options.execute;
  }

  get name() {
    return this.data.name;
  }

  get key() {
    return `${this.data.type}:${this.name}`;
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
  const startedAt = performance.now();
  const commandsDirectory = join(import.meta.dir, "../interaction/commands");
  const commandFiles = await getCommandFiles(commandsDirectory);

  client.logger.debug(
    { directory: commandsDirectory, files: commandFiles.length },
    "Discovered command files",
  );

  for (const file of commandFiles) {
    const command = ((await import(file)) as { default: Command }).default;

    if (client.commands.has(command.name)) {
      client.logger.warn(
        { command: command.name, file },
        "Duplicate command replaced",
      );
    }
    client.commands.set(command.name, command);
    client.logger.debug({ command: command.name, file }, "Loaded command");
    client.logger.info("[COMMAND]:".padEnd(10) + " " + command.name);
  }

  const contextsDirectory = join(import.meta.dir, "../interaction/contexts");
  const contextFiles = await getCommandFiles(contextsDirectory);

  client.logger.debug(
    { directory: contextsDirectory, files: contextFiles.length },
    "Discovered context command files",
  );

  for (const file of contextFiles) {
    const command = ((await import(file)) as { default: ContextCommand })
      .default;

    if (client.contextCommands.has(command.key)) {
      client.logger.warn(
        { command: command.name, key: command.key, file },
        "Duplicate context command replaced",
      );
    }
    client.contextCommands.set(command.key, command);
    client.logger.debug(
      { command: command.name, key: command.key, file },
      "Loaded context command",
    );
    client.logger.info("[CONTEXT]:".padEnd(10) + " " + command.name);
  }

  client.logger.debug(
    {
      commands: client.commands.size,
      contextCommands: client.contextCommands.size,
      durationMs: Math.round(performance.now() - startedAt),
    },
    "Commands loaded",
  );
}

interface NormalizableCommand {
  name: string;
  description?: string;
  type?: ApplicationCommandType | number;
  options?: readonly APIApplicationCommandOption[];
  default_member_permissions?: string | null;
  nsfw?: boolean;
  integration_types?: unknown[] | null;
  contexts?: unknown[] | null;
}

const EMPTY_OPTION_ARRAYS = new Set(["options", "choices", "channel_types"]);
const FALSE_OPTION_DEFAULTS = new Set(["required", "autocomplete"]);

function normalizeOptionValue(value: unknown, key?: string): unknown {
  if (value === undefined || value === null) return undefined;
  if (value === false && key && FALSE_OPTION_DEFAULTS.has(key)) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const normalized = value.map((item) => normalizeOptionValue(item));
    if (key === "channel_types") {
      normalized.sort((left, right) => Number(left) - Number(right));
    }
    if (!normalized.length && key && EMPTY_OPTION_ARRAYS.has(key)) {
      return undefined;
    }
    return normalized;
  }
  if (typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      const child = normalizeOptionValue(childValue, childKey);
      if (child !== undefined) normalized[childKey] = child;
    }
    return normalized;
  }
  return value;
}

function canonicalCommand(
  command: NormalizableCommand,
  template: NormalizableCommand = command,
) {
  return {
    name: command.name,
    description: command.description ?? "",
    type: command.type ?? 1,
    options: normalizeOptionValue(command.options ?? [], "options") ?? [],
    default_member_permissions: command.default_member_permissions ?? null,
    nsfw: command.nsfw ?? false,
    integration_types:
      template.integration_types == null
        ? null
        : [...(command.integration_types ?? [])].sort(
            (left, right) => Number(left) - Number(right),
          ),
    contexts:
      template.contexts == null
        ? null
        : [...(command.contexts ?? [])].sort(
            (left, right) => Number(left) - Number(right),
          ),
  };
}

function normalize(
  command: NormalizableCommand,
  template: NormalizableCommand = command,
) {
  return stableStringify(canonicalCommand(command, template));
}

function changedFields(
  local: NormalizableCommand,
  existing: NormalizableCommand,
) {
  const wanted = canonicalCommand(local);
  const actual = canonicalCommand(existing, local);

  return Object.keys(wanted).filter(
    (key) =>
      stableStringify(wanted[key as keyof typeof wanted]) !==
      stableStringify(actual[key as keyof typeof actual]),
  );
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
  const startedAt = performance.now();
  const local = [
    ...[...client.commands.values()].map((command) => command.data),
    ...[...client.contextCommands.values()].map((command) => command.data),
  ];

  if (!client.user) {
    client.logger.warn("Skipping command registration before client is ready");
    return;
  }

  client.logger.debug(
    { applicationId: client.user.id, localCount: local.length },
    "Checking global command registration",
  );

  const fetchStartedAt = performance.now();
  const existing = (await client.rest.get(
    Routes.applicationCommands(client.user.id),
  )) as RESTGetAPIApplicationCommandsResult;
  client.logger.debug(
    {
      existingCount: existing.length,
      durationMs: Math.round(performance.now() - fetchStartedAt),
    },
    "Fetched global commands",
  );

  const sameCount = local.length === existing.length;

  const noDifferences =
    sameCount &&
    local.every((localCommand) => {
      const match = existing.find(
        (existingCommand) =>
          existingCommand.name === localCommand.name &&
          existingCommand.type === localCommand.type,
      );

      if (!match) return false;

      return normalize(localCommand) === normalize(match, localCommand);
    });

  if (noDifferences) {
    client.logger.info(
      {
        commands: local.length,
        durationMs: Math.round(performance.now() - startedAt),
      },
      "Commands unchanged, skipping registration",
    );

    return;
  }

  client.logger.warn(
    { localCount: local.length, existingCount: existing.length },
    "Command registration differences detected",
  );

  for (const localCommand of local) {
    const match = existing.find(
      (existingCommand) =>
        existingCommand.name === localCommand.name &&
        existingCommand.type === localCommand.type,
    );

    if (!match) {
      client.logger.warn(
        { command: localCommand.name, type: localCommand.type },
        "Command is missing remotely",
      );
      continue;
    }

    const fields = changedFields(localCommand, match);
    if (!fields.length) continue;

    client.logger.warn(
      { command: localCommand.name, type: localCommand.type, fields },
      "Command fields changed",
    );
    client.logger.debug(
      {
        command: localCommand.name,
        local: canonicalCommand(localCommand),
        existing: canonicalCommand(match, localCommand),
      },
      "Command registration comparison",
    );
  }

  for (const existingCommand of existing) {
    const match = local.find(
      (localCommand) =>
        localCommand.name === existingCommand.name &&
        localCommand.type === existingCommand.type,
    );
    if (!match) {
      client.logger.warn(
        { command: existingCommand.name, type: existingCommand.type },
        "Remote command no longer exists locally",
      );
    }
  }

  const registrationStartedAt = performance.now();
  const result = (await client.rest.put(
    Routes.applicationCommands(client.user.id),
    {
      body: local as RESTPutAPIApplicationCommandsJSONBody,
    },
  )) as RESTPutAPIApplicationCommandsResult;

  client.logger.debug(
    {
      commands: result.map((command) => ({
        name: command.name,
        contexts: command.contexts,
        integrationTypes: command.integration_types,
        defaultMemberPermissions: command.default_member_permissions,
      })),
    },
    "Verified registered command access settings",
  );

  client.logger.info(
    {
      commands: result.length,
      apiDurationMs: Math.round(performance.now() - registrationStartedAt),
      totalDurationMs: Math.round(performance.now() - startedAt),
    },
    "Registered global commands",
  );
}

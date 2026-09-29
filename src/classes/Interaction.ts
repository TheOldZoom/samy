import {
  ApplicationCommandOptionType,
  ComponentType,
  MessageFlags,
  type APIApplicationCommandInteractionDataOption,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type CommandInteraction,
  type Interaction as DiscordInteraction,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  type InteractionUpdateOptions,
  type MessageComponentInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

type ReplyData = InteractionReplyOptions & {
  ephemeral?: boolean;
};

type OptionValueMap = {
  [ApplicationCommandOptionType.String]: string;
  [ApplicationCommandOptionType.Integer]: number;
  [ApplicationCommandOptionType.Boolean]: boolean;
  [ApplicationCommandOptionType.User]: string;
  [ApplicationCommandOptionType.Channel]: string;
  [ApplicationCommandOptionType.Role]: string;
  [ApplicationCommandOptionType.Mentionable]: string;
  [ApplicationCommandOptionType.Number]: number;
  [ApplicationCommandOptionType.Attachment]: string;
};

type PatchableInteraction =
  | ChatInputCommandInteraction
  | AutocompleteInteraction
  | MessageComponentInteraction
  | ModalSubmitInteraction;

interface InteractionMethods {
  isDeferred(): boolean;
  isReplied(): boolean;

  isButton(): boolean;
  isSelect(): boolean;
  isModal(): boolean;

  getSelectedValues(): string[];
  getModalValue(customId: string): string | undefined;

  defer(ephemeral?: boolean): Promise<void>;
  reply(data: ReplyData): Promise<void>;
  followUp(data: ReplyData): Promise<void>;
  deleteReply(messageId?: string): Promise<void>;
  getOriginalReply(): Promise<unknown>;

  deferUpdate(): Promise<void>;
  updateMessage(data: InteractionUpdateOptions): Promise<void>;

  showModal(
    data: Parameters<CommandInteraction["showModal"]>[0],
  ): Promise<void>;

  autocomplete(data: {
    choices: { name: string; value: string | number }[];
  }): Promise<void>;

  getOptionValue<K extends keyof OptionValueMap>(
    name: string,
    type: K,
  ): OptionValueMap[K] | undefined;
}

type InteractionOverrideKeys =
  keyof InteractionMethods | "reply" | "followUp" | "deleteReply" | "showModal";

export type Interaction<T extends object = any> = Omit<
  T,
  InteractionOverrideKeys
> &
  InteractionMethods;

export function createInteraction<T extends PatchableInteraction>(
  raw: T,
  resolvedOptions?: APIApplicationCommandInteractionDataOption[],
  defaultEphemeral = false,
): Interaction<T> {
  const base = raw as any;
  let state: "none" | "deferred" | "replied" = base.replied
    ? "replied"
    : base.deferred
      ? "deferred"
      : "none";
  const requestedEphemeral = getEphemeralOption(raw, resolvedOptions);
  let ephemeral = requestedEphemeral ?? defaultEphemeral;

  const patched = raw as unknown as Interaction<T>;

  const native = {
    reply: typeof base.reply === "function" ? base.reply.bind(raw) : null,
    deferReply:
      typeof base.deferReply === "function" ? base.deferReply.bind(raw) : null,
    followUp:
      typeof base.followUp === "function" ? base.followUp.bind(raw) : null,
    editReply:
      typeof base.editReply === "function" ? base.editReply.bind(raw) : null,
    deleteReply:
      typeof base.deleteReply === "function"
        ? base.deleteReply.bind(raw)
        : null,
    fetchReply:
      typeof base.fetchReply === "function" ? base.fetchReply.bind(raw) : null,
    deferUpdate:
      typeof base.deferUpdate === "function"
        ? base.deferUpdate.bind(raw)
        : null,
    update: typeof base.update === "function" ? base.update.bind(raw) : null,
    showModal:
      typeof base.showModal === "function" ? base.showModal.bind(raw) : null,
    respond: typeof base.respond === "function" ? base.respond.bind(raw) : null,
  };

  function withEphemeral(data: ReplyData): InteractionReplyOptions {
    const { ephemeral: requested, ...rest } = data;
    const isEphemeral = requested ?? ephemeral;
    const resolved = isEphemeral
      ? {
          ...rest,
          flags: addFlag(rest.flags, MessageFlags.Ephemeral),
        }
      : rest;

    return resolved;
  }

  function withoutEphemeral(data: ReplyData): InteractionEditReplyOptions {
    const { ephemeral: _requested, ...rest } = data;

    return rest as InteractionEditReplyOptions;
  }

  patched.isDeferred = () => Boolean(base.deferred) || state === "deferred";
  patched.isReplied = () => Boolean(base.replied) || state === "replied";

  patched.isButton = () =>
    raw.isMessageComponent() && raw.componentType === ComponentType.Button;

  patched.isSelect = () =>
    raw.isMessageComponent() && raw.componentType !== ComponentType.Button;

  patched.isModal = () => raw.isModalSubmit();

  patched.getSelectedValues = () => {
    if (!raw.isAnySelectMenu()) {
      return [];
    }

    return raw.values;
  };

  patched.getModalValue = (customId) => {
    if (!raw.isModalSubmit()) {
      return undefined;
    }

    return raw.fields.getTextInputValue(customId);
  };

  patched.defer = async (eph?: boolean) => {
    if (!native.deferReply) {
      return;
    }

    const isEphemeral = eph ?? ephemeral;

    await native.deferReply({
      flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
    });

    state = "deferred";
    ephemeral = isEphemeral;
  };

  patched.reply = async (data: ReplyData) => {
    if (patched.isDeferred()) {
      await native.editReply?.(withoutEphemeral(data));
      state = "replied";
      return;
    }

    const resolved = withEphemeral(data);

    if (patched.isReplied()) {
      await native.followUp?.(resolved);
      return;
    }

    ephemeral = data.ephemeral ?? ephemeral;

    await native.reply?.(resolved);
    state = "replied";
  };

  patched.followUp = async (data: ReplyData) => {
    const resolved = withEphemeral(data);
    await native.followUp?.(resolved);
  };

  patched.deleteReply = async (messageId?: string) => {
    await native.deleteReply?.(messageId);

    if (!messageId) {
      state = "none";
    }
  };

  patched.getOriginalReply = async () => native.fetchReply?.();

  patched.deferUpdate = async () => {
    await native.deferUpdate?.();
    state = "replied";
  };

  patched.updateMessage = async (data: InteractionUpdateOptions) => {
    await native.update?.(data);
    state = "replied";
  };

  patched.showModal = async (
    data: Parameters<CommandInteraction["showModal"]>[0],
  ) => {
    await native.showModal?.(data);
    state = "replied";
  };

  patched.autocomplete = async (data: {
    choices: { name: string; value: string | number }[];
  }) => {
    await native.respond?.(data.choices);
  };

  patched.getOptionValue = (name, type) => {
    const options = resolvedOptions ?? getNativeOptions(raw);
    const option = options?.find(
      (option) => option.name === name && option.type === type,
    );
    const value =
      option && "value" in option
        ? (option.value as OptionValueMap[typeof type])
        : undefined;

    return value;
  };

  return patched;
}

function getEphemeralOption(
  interaction: PatchableInteraction,
  options?: APIApplicationCommandInteractionDataOption[],
): boolean | undefined {
  if (interaction.isChatInputCommand()) {
    const value = interaction.options.getBoolean("ephemeral");

    if (value !== null) {
      return value;
    }
  }

  const option = options?.find(
    (option) =>
      option.name === "ephemeral" &&
      option.type === ApplicationCommandOptionType.Boolean,
  );

  return option && "value" in option && typeof option.value === "boolean"
    ? option.value
    : undefined;
}

function getNativeOptions(
  interaction: PatchableInteraction,
): APIApplicationCommandInteractionDataOption[] | undefined {
  if (!interaction.isCommand() && !interaction.isAutocomplete()) {
    return undefined;
  }

  return interaction.options
    .data as APIApplicationCommandInteractionDataOption[];
}

function addFlag(flags: InteractionReplyOptions["flags"], flag: MessageFlags) {
  if (typeof flags === "number") {
    return flags | flag;
  }

  if (Array.isArray(flags)) {
    return [...flags, flag];
  }

  return flag;
}

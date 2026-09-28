import {
  MessageFlags,
  ApplicationCommandOptionType,
  ComponentType,
  InteractionType,
  type API,
  type APIInteraction,
  type APIInteractionResponseCallbackData,
  type APIModalInteractionResponseCallbackData,
  type APICommandAutocompleteInteractionResponseCallbackData,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";

import type { RawFile } from "@discordjs/rest";

type ReplyData = APIInteractionResponseCallbackData & {
  ephemeral?: boolean;
  files?: RawFile[];
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

export type Interaction<T extends APIInteraction = APIInteraction> = T & {
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
  getOriginalReply(): ReturnType<API["interactions"]["getOriginalReply"]>;

  deferUpdate(): Promise<void>;
  updateMessage(data: APIInteractionResponseCallbackData): Promise<void>;

  showModal(data: APIModalInteractionResponseCallbackData): Promise<void>;

  autocomplete(
    data: APICommandAutocompleteInteractionResponseCallbackData,
  ): Promise<void>;

  getOptionValue<K extends keyof OptionValueMap>(
    name: string,
    type: K,
  ): OptionValueMap[K] | undefined;
};

export function createInteraction<T extends APIInteraction>(
  api: API,
  raw: T,
  resolvedOptions?: APIApplicationCommandInteractionDataOption[],
  defaultEphemeral = false,
): Interaction<T> {
  let state: "none" | "deferred" | "replied" = "none";
  let ephemeral = getEphemeralOption(resolvedOptions) ?? defaultEphemeral;

  function resolveReplyData({
    ephemeral: requested,
    files,
    ...data
  }: ReplyData): {
    data: APIInteractionResponseCallbackData;
    files?: RawFile[];
  } {
    const isEphemeral = requested ?? ephemeral;

    const resolvedData: APIInteractionResponseCallbackData = isEphemeral
      ? {
          ...data,
          flags: (data.flags ?? 0) | MessageFlags.Ephemeral,
        }
      : data;

    return {
      data: resolvedData,
      files,
    };
  }

  const interaction = raw as Interaction<T>;

  interaction.isDeferred = () => state === "deferred";
  interaction.isReplied = () => state === "replied";

  interaction.isButton = () => {
    if (raw.type !== InteractionType.MessageComponent) {
      return false;
    }

    return raw.data.component_type === ComponentType.Button;
  };

  interaction.isSelect = () => {
    if (raw.type !== InteractionType.MessageComponent) {
      return false;
    }

    return raw.data.component_type !== ComponentType.Button;
  };

  interaction.isModal = () => raw.type === InteractionType.ModalSubmit;

  interaction.getSelectedValues = () => {
    if (raw.type !== InteractionType.MessageComponent) {
      return [];
    }

    if (!("values" in raw.data)) {
      return [];
    }

    return raw.data.values;
  };

  interaction.getModalValue = (customId) => {
    if (raw.type !== InteractionType.ModalSubmit) {
      return undefined;
    }

    return findModalValue(raw.data.components, customId);
  };

  interaction.defer = async (eph) => {
    const isEphemeral = eph ?? ephemeral;

    await api.interactions.defer(raw.id, raw.token, {
      flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
    });

    state = "deferred";
    ephemeral = isEphemeral;
  };

  interaction.reply = async (data) => {
    const resolved = resolveReplyData(data);

    if (state === "deferred") {
      await api.interactions.editReply(raw.application_id, raw.token, {
        ...resolved.data,
        files: resolved.files,
      });

      state = "replied";
      return;
    }

    if (state === "replied") {
      await api.interactions.followUp(raw.application_id, raw.token, {
        ...resolved.data,
        files: resolved.files,
      });

      return;
    }

    ephemeral = data.ephemeral ?? ephemeral;

    await api.interactions.reply(raw.id, raw.token, {
      ...resolved.data,
      files: resolved.files,
    });

    state = "replied";
  };

  interaction.followUp = async (data) => {
    const resolved = resolveReplyData(data);

    await api.interactions.followUp(raw.application_id, raw.token, {
      ...resolved.data,
      files: resolved.files,
    });
  };

  interaction.deleteReply = async (messageId) => {
    await api.interactions.deleteReply(
      raw.application_id,
      raw.token,
      messageId,
    );

    if (!messageId) {
      state = "none";
    }
  };

  interaction.getOriginalReply = () =>
    api.interactions.getOriginalReply(raw.application_id, raw.token);

  interaction.deferUpdate = async () => {
    await api.interactions.deferMessageUpdate(raw.id, raw.token);

    state = "replied";
  };

  interaction.updateMessage = async (data) => {
    await api.interactions.updateMessage(raw.id, raw.token, data);

    state = "replied";
  };

  interaction.showModal = async (data) => {
    await api.interactions.createModal(raw.id, raw.token, data);

    state = "replied";
  };

  interaction.autocomplete = async (data) => {
    await api.interactions.createAutocompleteResponse(raw.id, raw.token, data);
  };

  interaction.getOptionValue = (name, type) => {
    const options =
      resolvedOptions ??
      (
        raw.data as {
          options?: APIApplicationCommandInteractionDataOption[];
        }
      ).options;

    const option = options?.find(
      (option) => option.name === name && option.type === type,
    );

    if (!option || !("value" in option)) {
      return undefined;
    }

    return option.value as OptionValueMap[typeof type];
  };

  return interaction;
}

/**
 * Returns the user's explicit choice, or `undefined` if they didn't set one,
 * so the command default can apply.
 */
function getEphemeralOption(
  options?: APIApplicationCommandInteractionDataOption[],
): boolean | undefined {
  const option = options?.find(
    (option) =>
      option.name === "ephemeral" &&
      option.type === ApplicationCommandOptionType.Boolean,
  );

  return option && "value" in option && typeof option.value === "boolean"
    ? option.value
    : undefined;
}

function findModalValue(
  components: unknown[],
  customId: string,
): string | undefined {
  for (const component of components) {
    if (typeof component !== "object" || component === null) {
      continue;
    }

    const value = component as {
      custom_id?: unknown;
      value?: unknown;
      components?: unknown[];
    };

    if (value.custom_id === customId && typeof value.value === "string") {
      return value.value;
    }

    if (Array.isArray(value.components)) {
      const nestedValue = findModalValue(value.components, customId);

      if (nestedValue !== undefined) {
        return nestedValue;
      }
    }
  }

  return undefined;
}

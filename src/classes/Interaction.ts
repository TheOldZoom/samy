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

type ReplyData = APIInteractionResponseCallbackData & {
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

type ComponentData = Extract<
  APIInteraction,
  {
    type: InteractionType.MessageComponent;
  }
>["data"];

type ModalData = Extract<
  APIInteraction,
  {
    type: InteractionType.ModalSubmit;
  }
>["data"];

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
): Interaction<T> {
  let state: "none" | "deferred" | "replied" = "none";
  let ephemeral = false;

  function resolveFlags(
    { ephemeral: requested, ...data }: ReplyData,
    forceEphemeral?: boolean,
  ): APIInteractionResponseCallbackData {
    const isEphemeral = forceEphemeral ?? requested ?? false;

    if (!isEphemeral) {
      return data;
    }

    return {
      ...data,
      flags: (data.flags ?? 0) | MessageFlags.Ephemeral,
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

  interaction.defer = async (eph = false) => {
    await api.interactions.defer(raw.id, raw.token, {
      flags: eph ? MessageFlags.Ephemeral : undefined,
    });

    state = "deferred";
    ephemeral = eph;
  };

  interaction.reply = async (data) => {
    if (state === "deferred") {
      await api.interactions.editReply(
        raw.application_id,
        raw.token,
        resolveFlags(data, ephemeral),
      );

      state = "replied";
      return;
    }

    if (state === "replied") {
      await api.interactions.followUp(
        raw.application_id,
        raw.token,
        resolveFlags(data, ephemeral),
      );

      return;
    }

    ephemeral = data.ephemeral ?? false;

    await api.interactions.reply(
      raw.id,
      raw.token,
      resolveFlags(data, ephemeral),
    );

    state = "replied";
  };

  interaction.followUp = async (data) => {
    await api.interactions.followUp(
      raw.application_id,
      raw.token,
      resolveFlags(data, ephemeral),
    );
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

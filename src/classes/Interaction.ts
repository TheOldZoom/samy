import {
  MessageFlags,
  ApplicationCommandOptionType,
  type API,
  type APIInteraction,
  type APIInteractionResponseCallbackData,
  type APIModalInteractionResponseCallbackData,
  type APICommandAutocompleteInteractionResponseCallbackData,
  type APIApplicationCommandInteractionDataOption,
} from "@discordjs/core";

type ReplyData = APIInteractionResponseCallbackData & { ephemeral?: boolean };

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
    if (!isEphemeral) return data;

    return { ...data, flags: (data.flags ?? 0) | MessageFlags.Ephemeral };
  }

  const interaction = raw as Interaction<T>;

  interaction.isDeferred = () => state === "deferred";
  interaction.isReplied = () => state === "replied";

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
    if (!messageId) state = "none";
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
      (raw.data as { options?: APIApplicationCommandInteractionDataOption[] })
        .options;
    const option = options?.find((o) => o.name === name && o.type === type);
    return option
      ? ((option as unknown as { value: unknown }).value as never)
      : undefined;
  };

  return interaction;
}

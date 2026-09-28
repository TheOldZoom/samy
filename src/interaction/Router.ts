import {
  ApplicationCommandType,
  ComponentType,
  InteractionType,
  type API,
  type APIApplicationCommandInteraction,
  type APIApplicationCommandAutocompleteInteraction,
  type APIChatInputApplicationCommandInteraction,
  type APIInteraction,
} from "@discordjs/core";

import type Client from "@/classes/Client";
import { createInteraction, type Interaction } from "@/classes/Interaction";
import { parseComponentId } from "./ComponentId";

function isChatInputCommand(
  interaction: APIApplicationCommandInteraction,
): interaction is APIChatInputApplicationCommandInteraction {
  return interaction.data.type === ApplicationCommandType.ChatInput;
}

function isAutocomplete(
  interaction: APIInteraction,
): interaction is APIApplicationCommandAutocompleteInteraction {
  return interaction.type === InteractionType.ApplicationCommandAutocomplete;
}

export async function routeInteraction(
  client: Client,
  api: API,
  raw: APIInteraction,
) {
  if (!client.startInteraction()) {
    return;
  }

  try {
    switch (raw.type) {
      case InteractionType.ApplicationCommand:
        await handleCommand(client, api, raw);
        break;

      case InteractionType.ApplicationCommandAutocomplete:
        await handleAutocomplete(client, api, raw);
        break;

      case InteractionType.MessageComponent:
        await handleComponent(client, api, raw);
        break;

      case InteractionType.ModalSubmit:
        await handleModal(client, api, raw);
        break;
    }
  } catch (error) {
    client.logger.error({ err: error }, "Error handling interaction");
  } finally {
    client.finishInteraction();
  }
}

async function handleCommand(client: Client, api: API, raw: APIInteraction) {
  if (raw.type !== InteractionType.ApplicationCommand) {
    return;
  }

  if (!isChatInputCommand(raw)) {
    return;
  }

  const command = client.commands.get(raw.data.name);

  if (!command) {
    client.logger.warn(`No command matched for "${raw.data.name}"`);
    return;
  }

  const { execute, options } = command.resolve(raw);

  if (!execute) {
    client.logger.warn(`No handler resolved for "${raw.data.name}"`);
    return;
  }

  const interaction = createInteraction(api, raw, options);

  try {
    await execute(client, interaction);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error executing command "${command.name}"`,
    );

    await interaction
      .reply({
        content: "Something went wrong running that command.",
      })
      .catch(() => {});
  }
}

async function handleAutocomplete(
  client: Client,
  api: API,
  raw: APIInteraction,
) {
  if (!isAutocomplete(raw)) {
    return;
  }

  const command = client.commands.get(raw.data.name);

  if (!command) {
    client.logger.warn(
      `No command matched for autocomplete "${raw.data.name}"`,
    );
    return;
  }

  const execute = command.resolveAutocomplete(raw);

  if (!execute) {
    return;
  }

  const interaction = createInteraction(api, raw);

  try {
    await execute(client, interaction);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error handling autocomplete "${command.name}"`,
    );
  }
}

async function handleComponent(client: Client, api: API, raw: APIInteraction) {
  if (raw.type !== InteractionType.MessageComponent) {
    return;
  }

  const parsed = parseComponentId(raw.data.custom_id);

  if (!parsed) {
    client.logger.warn(`Invalid component ID "${raw.data.custom_id}"`);
    return;
  }

  const type =
    raw.data.component_type === ComponentType.Button ? "buttons" : "selects";

  const handler = client.interactionHandlers[type].get(
    `${parsed.feature}:${parsed.action}`,
  );

  if (!handler) {
    client.logger.warn(
      `No ${type.slice(0, -1)} handler matched for "${parsed.feature}:${parsed.action}"`,
    );
    return;
  }

  const interaction = createInteraction(api, raw);

  try {
    await handler.execute(client, interaction, parsed);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error handling ${type.slice(0, -1)} "${handler.key}"`,
    );
  }
}

async function handleModal(client: Client, api: API, raw: APIInteraction) {
  if (raw.type !== InteractionType.ModalSubmit) {
    return;
  }

  const parsed = parseComponentId(raw.data.custom_id);

  if (!parsed) {
    client.logger.warn(`Invalid modal ID "${raw.data.custom_id}"`);
    return;
  }

  const handler = client.interactionHandlers.modals.get(
    `${parsed.feature}:${parsed.action}`,
  );

  if (!handler) {
    client.logger.warn(
      `No modal handler matched for "${parsed.feature}:${parsed.action}"`,
    );
    return;
  }

  const interaction = createInteraction(api, raw);

  try {
    await handler.execute(client, interaction, parsed);
  } catch (error) {
    client.logger.error(
      { err: error },
      `Error handling modal "${handler.key}"`,
    );
  }
}

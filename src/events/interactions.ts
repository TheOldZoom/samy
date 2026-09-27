import {
  GatewayDispatchEvents,
  InteractionType,
  ApplicationCommandType,
  type APIApplicationCommandInteraction,
  type APIChatInputApplicationCommandInteraction,
} from "@discordjs/core";
import Event from "../classes/Event";
import { createInteraction } from "../classes/Interaction";

function isChatInputCommand(
  interaction: APIApplicationCommandInteraction,
): interaction is APIChatInputApplicationCommandInteraction {
  return interaction.data.type === ApplicationCommandType.ChatInput;
}

export default new Event({
  name: GatewayDispatchEvents.InteractionCreate,
  execute: async (client, { data: raw, api }) => {
    if (raw.type !== InteractionType.ApplicationCommand) return;
    if (!isChatInputCommand(raw)) return;

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
        .reply({ content: "Something went wrong running that command." })
        .catch(() => {});
    }
  },
});

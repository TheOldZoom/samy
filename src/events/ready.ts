import Event from "../classes/Event";
import { REST, Routes } from "discord.js";
import type Client from "../classes/Client";

export default new Event({
  name: "clientReady",
  once: true,

  async execute(client) {
    await DeployCommands(client);

    client.logger.info(`Logged in as ${client.user?.tag}`);
  },
});

export async function DeployCommands(client: Client) {
  const commands = client.slashCommands.map((command) =>
    command.options.data.toJSON(),
  );

  const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

  await rest.put(Routes.applicationCommands(client.user!.id), {
    body: commands,
  });

  client.logger.info(`Loaded ${commands.length} slash commands`);
}

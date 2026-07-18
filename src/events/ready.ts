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

function normalizeCommand(command: any) {
  const cleaned = structuredClone(command);

  delete cleaned.id;
  delete cleaned.application_id;
  delete cleaned.version;
  delete cleaned.default_member_permissions;
  delete cleaned.dm_permission;
  delete cleaned.nsfw;

  if (cleaned.options?.length === 0) {
    delete cleaned.options;
  }

  if (cleaned.contexts) {
    cleaned.contexts.sort();
  }

  if (cleaned.options) {
    cleaned.options.sort((a: any, b: any) => a.name.localeCompare(b.name));
  }

  return cleaned;
}
function getDifferences(oldCommand: any, newCommand: any) {
  const oldNormalized = normalizeCommand(oldCommand);
  const newNormalized = normalizeCommand(newCommand);

  const differences: string[] = [];

  const keys = new Set([
    ...Object.keys(oldNormalized ?? {}),
    ...Object.keys(newNormalized ?? {}),
  ]);

  for (const key of keys) {
    const oldValue = oldNormalized?.[key];
    const newValue = newNormalized?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      differences.push(
        `${key}: ${JSON.stringify(oldValue)} -> ${JSON.stringify(newValue)}`,
      );
    }
  }

  return differences;
}

export async function DeployCommands(client: Client) {
  const rest = new REST({
    version: "10",
  }).setToken(process.env.DISCORD_TOKEN!);

  const route = Routes.applicationCommands(client.user!.id);

  const localCommands = client.slashCommands.map((command) =>
    command.options.data.toJSON(),
  );

  const currentCommands = (await rest.get(route)) as any[];

  const localMap = new Map(
    localCommands.map((command) => [command.name, command]),
  );

  const currentMap = new Map(
    currentCommands.map((command) => [command.name, command]),
  );

  const added: any[] = [];
  const updated: any[] = [];
  const removed: any[] = [];

  for (const [name, command] of localMap) {
    const existing = currentMap.get(name);

    if (!existing) {
      added.push(command);
      continue;
    }

    const differences = getDifferences(existing, command);

    if (differences.length) {
      updated.push(command);

      client.logger.debug(
        {
          command: name,
          differences,
        },
        "Slash command changes detected",
      );
    }
  }

  for (const [name, command] of currentMap) {
    if (!localMap.has(name)) {
      removed.push(command);
    }
  }

  if (added.length === 0 && updated.length === 0 && removed.length === 0) {
    client.logger.debug("No slash command changes detected");

    return;
  }

  client.logger.debug(
    {
      added: added.map((c) => c.name),
      updated: updated.map((c) => c.name),
      removed: removed.map((c) => c.name),
    },
    "Slash command deployment changes",
  );

  await rest.put(route, {
    body: localCommands,
  });

  client.logger.info(`Deployed ${localCommands.length} slash commands`);
}

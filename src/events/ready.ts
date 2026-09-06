import Event from "../classes/Event";
import { REST, Routes } from "discord.js";
import type Client from "@/classes/client";
import { reconcileGuildBans } from "@/utils/guildBan";
import { reconcileHardBans } from "./hardban";
import { reconcileStickyRoles } from "./stickyRole";
import { ensureGuild } from "@/utils/guild";
import { reconcileJails } from "@/utils/jail";
import { reconcileTemporaryMutes } from "@/utils/mute";
import { startTemporaryRoleCleanup } from "@/utils/temporaryRoles";
import { startMarkovFlush } from "@/utils/markov";
import { startAfkCleanup } from "@/utils/afkCleanup";

export default new Event({
  name: "clientReady",
  once: true,

  async execute(client) {
    await DeployCommands(client);
    await reconcileGuildBans(client);
    await reconcileHardBans(client);
    await reconcileStickyRoles(client);
    await reconcileJails(client);
    await reconcileTemporaryMutes(client);
    await registerGuilds(client);
    await cacheStuff(client);
    startTemporaryRoleCleanup(client);
    startMarkovFlush(client);
    startAfkCleanup(client);
    client.logger.info(`Logged in as ${client.user?.tag}`);
  },
});

async function registerGuilds(client: Client) {
  for (const guild of client.guilds.cache.values()) {
    await ensureGuild(guild.id);
  }
}

async function cacheStuff(client: Client) {
  const afkUsers = await client.prisma.afk.findMany();

  for (const afk of afkUsers) {
    client.logger.debug(`Cached user for afk`, {
      user: afk.userId,
      guild: afk.guildId,
      reason: afk.reason,
    });
    client.afkUsers.set(`${afk.guildId}:${afk.userId}`, afk);
  }
}

function normalizeCommand(command: { [key: string]: unknown }) {
  const ignoredKeys = new Set([
    "id",
    "application_id",
    "version",
    "guild_id",
    "dm_permission",
    "default_member_permissions",
    "integration_types",
    "nsfw",
  ]);

  function normalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value
        .map(normalize)
        .sort(
          (
            a: { name?: string } | undefined,
            b: { name?: string } | undefined,
          ) => {
            if (a?.name && b?.name) {
              return a.name.localeCompare(b.name);
            }

            return JSON.stringify(a).localeCompare(JSON.stringify(b));
          },
        );
    }

    if (value && typeof value === "object") {
      return Object.keys(value)
        .filter((key) => {
          if (ignoredKeys.has(key)) return false;

          const val = (value as Record<string, unknown>)[key];

          return !(
            val === false ||
            val === null ||
            val === undefined ||
            val === "" ||
            (Array.isArray(val) && val.length === 0)
          );
        })
        .sort()
        .reduce(
          (obj: Record<string, unknown>, key: string) => {
            obj[key] = normalize((value as Record<string, unknown>)[key]);
            return obj;
          },
          {} as Record<string, unknown>,
        );
    }

    return value;
  }

  return normalize(command);
}

function getDifferences(
  oldCommand: { [key: string]: unknown },
  newCommand: { [key: string]: unknown },
): string[] {
  const oldNormalized = normalizeCommand(oldCommand) as
    Record<string, unknown> | undefined;
  const newNormalized = normalizeCommand(newCommand) as
    Record<string, unknown> | undefined;

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

  const localCommands = [
    ...client.slashCommands.map((command) => command.options.data.toJSON()),
    ...client.contextCommands.map((command) => command.options.data.toJSON()),
  ];

  const currentCommands = (await rest.get(route)) as {
    type?: number;
    name: string;
    [key: string]: unknown;
  }[];

  const commandKey = (command: { type?: number; name: string }) =>
    `${command.type ?? 1}:${command.name}`;

  const localMap = new Map(
    localCommands.map((command) => [commandKey(command), command]),
  );

  const currentMap = new Map(
    currentCommands.map((command) => [commandKey(command), command]),
  );

  const added: { type?: number; name: string; [key: string]: unknown }[] = [];
  const updated: { type?: number; name: string; [key: string]: unknown }[] = [];
  const removed: { type?: number; name: string; [key: string]: unknown }[] = [];

  for (const [key, command] of localMap) {
    const existing = currentMap.get(key);

    if (!existing) {
      added.push(command);
      continue;
    }

    const differences = getDifferences(existing, command);

    if (differences.length) {
      updated.push(command);

      client.logger.debug(
        {
          command: command.name,
          differences,
        },
        "Slash command changes detected",
      );
    }
  }

  for (const [key, command] of currentMap) {
    if (!localMap.has(key)) {
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

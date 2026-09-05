import type { Collection } from "discord.js";
import { readdir } from "fs/promises";
import { join } from "path";
import type Client from "../client";

export async function LoadCommands<T extends { name: string }>(
  client: Client,
  directory: string,
  collection: Collection<string, T>,
) {
  const files = await readdir(join(import.meta.dir, directory), {
    recursive: true,
  });

  const type = directory.split("/").pop();
  for (const file of files) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

    const module = (await import(join(import.meta.dir, directory, file))) as {
      default?: T;
    };

    if (!module.default) {
      client.logger.debug(`Skipping ${file}: no default export found`);
      continue;
    }

    const command = module.default;

    if (!command.name) {
      client.logger.debug(`Skipping ${file}: missing command name`);
      continue;
    }

    collection.set(command.name, command);

    client.logger.info(
      `${`[${type?.toUpperCase()}]:`.padEnd(10)} ${command.name}`,
    );
  }
}

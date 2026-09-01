import type { Collection } from "discord.js";
import { readdir } from "fs/promises";
import { join } from "path";
import type Client from "../client";

export async function LoadInteractions<T extends { name: string }>(
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

    const module = await import(join(import.meta.dir, directory, file)) as { default?: T };

    if (!module.default) {
      client.logger.warn(`Skipping ${file}: no default export found`);
      continue;
    }

    const handler = module.default;

    if (!handler.name) {
      client.logger.warn(`Skipping ${file}: missing handler name`);
      continue;
    }

    collection.set(handler.name, handler);

    client.logger.info(
      `${`[${type?.toUpperCase()}]:`.padEnd(10)} ${handler.name}`,
    );
  }
}

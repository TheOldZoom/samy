import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ClientEvents } from "discord.js";
import type Client from "./client";

export interface EventOptions<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;

  execute: (client: Client, ...args: ClientEvents[K]) => Promise<void> | void;
}

export default class Event<K extends keyof ClientEvents> {
  public readonly name: K;
  public readonly once: boolean;
  public readonly execute: (
    client: Client,
    ...args: ClientEvents[K]
  ) => Promise<void> | void;

  constructor(options: EventOptions<K>) {
    this.name = options.name;
    this.once = options.once ?? false;
    this.execute = options.execute;
  }
}

async function getEventFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getEventFiles(path)));
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))
    ) {
      files.push(path);
    }
  }

  return files;
}

export async function LoadEvents(client: Client) {
  const eventsDirectory = join(import.meta.dir, "../events");
  const files = await getEventFiles(eventsDirectory);

  for (const file of files) {
    const event = (
      (await import(file)) as { default: Event<keyof ClientEvents> }
    ).default;

    client.logger.info(`${`[EVENT]:`.padEnd(10)} ${event.name}`);

    if (event.once) {
      client.once(event.name, (...args) => void event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => void event.execute(client, ...args));
    }
  }
}

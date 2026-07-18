import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { ClientEvents } from "discord.js";
import type Client from "./Client";

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

export async function LoadEvents(client: Client) {
  const files = await readdir(join(import.meta.dir, "../events"));

  for (const file of files) {
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

    const event = (await import(`../events/${file}`)).default as Event<
      keyof ClientEvents
    >;

    client.logger.info(`Loaded event: ${event.name}`);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}

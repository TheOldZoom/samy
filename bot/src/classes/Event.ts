import { readdir } from "fs/promises";
import type Client from "./Client";
import type { ClientEvents } from "discord.js";
import { join } from "path";

export default class Event<K extends keyof ClientEvents> {
  constructor(
    public name: K,
    public execute: (
      client: Client,
      ...args: ClientEvents[K]
    ) => Promise<void> | void,
    public once = false,
  ) {}
}

export async function LoadEvents(client: Client) {
  const files = await readdir(join(import.meta.dir, "../events"));

  for (const file of files) {
    const event = (await import(`../events/${file}`)).default;
    client.logger.info(`Loaded event: ${event.name}`);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}

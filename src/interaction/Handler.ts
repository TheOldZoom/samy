import { readdir } from "node:fs/promises";
import { join } from "node:path";

import type Client from "@/classes/Client";
import type { Interaction } from "@/classes/Interaction";
import type { ComponentId } from "./ComponentId";

export type InteractionHandlerExecute = (
  client: Client,
  interaction: Interaction,
  component: ComponentId,
) => Promise<void> | void;

export default class InteractionHandler {
  public readonly feature: string;
  public readonly action: string;
  public readonly execute: InteractionHandlerExecute;

  constructor(options: {
    feature: string;
    action: string;
    execute: InteractionHandlerExecute;
  }) {
    this.feature = options.feature;
    this.action = options.action;
    this.execute = options.execute;
  }

  get key() {
    return `${this.feature}:${this.action}`;
  }
}

async function getFiles(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await readdir(directory, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getFiles(path)));
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

export async function LoadInteractionHandlers(
  client: Client,
  type: "buttons" | "selects" | "modals",
) {
  const directory = join(import.meta.dir, `./${type}`);

  const files = await getFiles(directory);

  for (const file of files) {
    const handler = (
      (await import(file)) as {
        default: InteractionHandler;
      }
    ).default;

    client.interactionHandlers[type].set(handler.key, handler);

    client.logger.info(
      `${`[${type.toUpperCase()}]:`.padEnd(10)} ${handler.key}`,
    );
  }
}

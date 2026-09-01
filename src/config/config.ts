import { PresenceUpdateStatus } from "discord.js";
import type { Config } from "./types";

function list(name: string): string[] {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function browser(name: string): Config["presence"]["browser"] {
  const value = process.env[name] ?? "Discord Desktop";
  const allowed = [
    "Discord Desktop",
    "Discord Android",
    "Discord iOS",
  ] as const;
  if (!allowed.includes(value as (typeof allowed)[number])) {
    throw new Error(
      `Invalid PRESENCE_BROWSER: ${value}. Must be one of: ${allowed.join(", ")}`,
    );
  }
  return value as Config["presence"]["browser"];
}

function status(name: string): Config["presence"]["status"] {
  const value = process.env[name] ?? PresenceUpdateStatus.Online;
  const allowed = [
    PresenceUpdateStatus.Online,
    PresenceUpdateStatus.Idle,
    PresenceUpdateStatus.DoNotDisturb,
    PresenceUpdateStatus.Invisible,
    PresenceUpdateStatus.Offline,
  ] as const;
  if (!allowed.includes(value as (typeof allowed)[number])) {
    throw new Error(`Invalid PRESENCE_STATUS: ${value}`);
  }
  return value as Config["presence"]["status"];
}

export const config: Config = {
  defaultPrefix: process.env.DEFAULT_PREFIX ?? ",",
  devs: list("DEVS"),
  devGuilds: list("DEV_GUILDS"),
  support: process.env.SUPPORT_INVITE ?? "https://discord.gg/SBx3mn4r8e",

  defaults: {
    cooldown: Number(process.env.DEFAULT_COOLDOWN ?? 3),
  },

  presence: {
    status: status("PRESENCE_STATUS"),
    browser: browser("PRESENCE_BROWSER"),
  },
};

import type { PresenceStatusData } from "discord.js";

export interface Config {
  defaultPrefix: string;

  devs: string[];
  devGuilds: string[];

  support: string;

  defaults: {
    cooldown: number;
  };

  presence: {
    status: PresenceStatusData;
    browser: "Discord Desktop" | "Discord Android" | "Discord iOS";
  };
}

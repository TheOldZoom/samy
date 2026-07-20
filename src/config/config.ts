import { PresenceUpdateStatus } from "discord.js";
import type { Config } from "./types";

export const config: Config = {
  defaultPrefix: ",",
  devs: ["1041378399005978624", "817404369838276618"],
  devGuilds: ["1233555772521320458"],
  support: "https://discord.gg/mCaNMPkW8U",

  defaults: {
    cooldown: 5, // in seconds
  },

  presence: {
    status: PresenceUpdateStatus.Online,
    browser: "Discord Android",
  },
};

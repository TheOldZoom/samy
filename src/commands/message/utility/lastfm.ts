import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import {
  LastFMLink,
  LastFMNow,
  LastFMNowUsername,
} from "@/commands/shared/lastfm";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";
import LastFMNowUI from "@/ui/lastfm/now";
import { MessageFlags } from "discord.js";

import { icons } from "@/utils/icons";

export default new MessageCommand({
  name: "lastfm",
  description: "View your currently playing or last played Last.fm track.",
  category: "Utility",
  aliases: ["fm"],
  arguments: [
    {
      name: "user",
      aliases: ["u"],
      type: "user",
      description: "A Discord user (mention or ID) to view.",
      required: false,
    },
  ],

  async execute(client, message, args) {
    try {
      const userArg = args.getUser("user");

      let nowPlaying;

      if (userArg) {
        const linkedUser = await client.lastFm.getUser(userArg.id);

        if (!linkedUser) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(icons.music + " " + client.i18n.t("commands.lastfm.user_no_link")),
            ],
          });

          return;
        }

        nowPlaying = await LastFMNowUsername(linkedUser.username);
      } else {
        nowPlaying = await LastFMNow(client, message.author.id);
      }

      if (!nowPlaying) {
        await message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            new Container().text(
              Text(icons.music + " " + client.i18n.t("commands.lastfm.no_tracks")),
            ),
          ],
        });

        return;
      }

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          LastFMNowUI(nowPlaying, (key, variables) =>
            client.i18n.t(key, variables),
          ),
        ],
      });
    } catch (error) {
      client.logger.error("Failed to get Last.fm track", {
        error,
        user: message.author.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI(icons.music + " " + client.i18n.t("commands.lastfm.fetch_error"))],
      });
    }
  },

  subcommands: [
    new MessageSubcommand({
      name: "link",
      description: "Link your Last.fm profile to the bot",

      arguments: [
        {
          name: "username",
          aliases: ["u"],
          type: "string",
          description: "Your Last.fm username.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const username = args.getString("username");

        if (!username) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(icons.music + " " + client.i18n.t("commands.lastfm.provide_username")),
            ],
          });

          return;
        }

        try {
          const profile = await LastFMLink(client, message.author.id, username);

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.music + " " + client.i18n.t("commands.lastfm.linked", {
                    username: profile.name,
                  }),
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to link Last.fm account", {
            error,
            user: message.author.id,
            username,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [errorUI(icons.music + " " + client.i18n.t("commands.lastfm.link_error"))],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "unlink",
      description: "Remove your linked Last.fm account",

      async execute(client, message) {
        try {
          const user = await client.lastFm.getUser(message.author.id);

          if (!user) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [errorUI(icons.music + " " + client.i18n.t("commands.lastfm.no_link"))],
            });

            return;
          }

          await client.lastFm.deleteUser(message.author.id);

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(icons.music + " " + client.i18n.t("commands.lastfm.unlinked", {
                    username: user.username,
                  }),
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to unlink Last.fm account", {
            error,
            user: message.author.id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              errorUI(icons.music + " " + client.i18n.t("commands.lastfm.unlink_error")),
            ],
          });
        }
      },
    }),
  ],
});

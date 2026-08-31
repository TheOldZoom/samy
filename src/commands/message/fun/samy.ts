import { MessageFlags } from "discord.js";

import { MessageCommand, MessageSubcommand } from "@/classes/Command";
import { SamyResult } from "@/commands/shared/samy";
import { Container, Text } from "@/ui/components";
import errorUI from "@/ui/error";

export default new MessageCommand({
  name: "samy",
  description: "Get a random picture of Samy.",
  category: "Fun",

  async execute(client, message) {
    try {
      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [await SamyResult(client, message.author.id)],
      });
    } catch (error) {
      client.logger.error("Failed to execute Samy command", {
        error,
        user: message.author.id,
      });

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [errorUI("Failed to get a Samy picture.")],
      });
    }
  },

  subcommands: [
    new MessageSubcommand({
      name: "add",
      description: "Add a new Samy picture.",
      ownerOnly: true,

      arguments: [
        {
          name: "url",
          aliases: ["image", "picture"],
          type: "string",
          description: "The direct URL of the Samy picture.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const url = args.getString("url");

        if (!url) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [errorUI("Please provide an image URL.")],
          });

          return;
        }

        try {
          const parsedUrl = new URL(url);

          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [
                errorUI("Please provide a valid HTTP or HTTPS URL."),
              ],
            });

            return;
          }

          const image = await client.prisma.samyImage.create({
            data: {
              url: parsedUrl.toString(),
            },
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `Samy picture added successfully.\n\n**ID:** \`${image.id}\``,
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to add Samy image", {
            error,
            user: message.author.id,
            url,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [errorUI("Failed to add the Samy picture.")],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "remove",
      aliases: ["delete", "del"],
      description: "Remove a Samy picture.",
      ownerOnly: true,

      arguments: [
        {
          name: "id",
          aliases: ["image"],
          type: "string",
          description: "The ID of the Samy picture to remove.",
          required: true,
        },
      ],

      async execute(client, message, args) {
        const id = args.getString("id");

        if (!id) {
          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [errorUI("Please provide a Samy picture ID.")],
          });

          return;
        }

        try {
          const image = await client.prisma.samyImage.findUnique({
            where: {
              id,
            },
          });

          if (!image) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [errorUI("That Samy picture does not exist.")],
            });

            return;
          }

          await client.prisma.samyImage.delete({
            where: {
              id,
            },
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(Text("Samy picture removed successfully.")),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to remove Samy image", {
            error,
            user: message.author.id,
            image: id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [errorUI("Failed to remove the Samy picture.")],
          });
        }
      },
    }),

    new MessageSubcommand({
      name: "list",
      aliases: ["all"],
      description: "List all Samy pictures.",
      ownerOnly: true,

      async execute(client, message) {
        try {
          const images = await client.prisma.samyImage.findMany({
            select: {
              id: true,
              url: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          });

          if (images.length === 0) {
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [errorUI("There are no Samy pictures available.")],
            });

            return;
          }

          const lines = images.map(
            (image, index) =>
              `**${index + 1}.** \`${image.id}\` - ${image.url}`,
          );

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [
              new Container().text(
                Text(
                  `**Samy Pictures (${images.length})**\n\n${lines.join("\n")}`,
                ),
              ),
            ],
          });
        } catch (error) {
          client.logger.error("Failed to list Samy images", {
            error,
            user: message.author.id,
          });

          await message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [errorUI("Failed to list Samy pictures.")],
          });
        }
      },
    }),
  ],
});

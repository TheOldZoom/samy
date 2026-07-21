import { MessageCommand, MessageSubcommand } from "@/classes/Command";

export default new MessageCommand({
  name: "music",
  description: "Music commands.",
  async execute(client, message, args) {
    await message.reply(`Music`);
  },
  subcommands: [
    new MessageSubcommand({
      name: "play",
      description: "Play a song.",

      async execute(client, message, args) {
        console.log("sex");
        await message.reply(
          `Playing: ${args.join(" ") || "Nothing provided!"}`,
        );
      },
    }),

    new MessageSubcommand({
      name: "playlist",
      description: "Manage playlists.",

      subcommands: [
        new MessageSubcommand({
          name: "add",
          description: "Add a song to a playlist.",

          async execute(client, message, args) {
            await message.reply(`Added "${args.join(" ")}" to the playlist.`);
          },
        }),

        new MessageSubcommand({
          name: "remove",
          description: "Remove a song from a playlist.",

          async execute(client, message, args) {
            await message.reply(
              `Removed "${args.join(" ")}" from the playlist.`,
            );
          },
        }),

        new MessageSubcommand({
          name: "list",
          description: "List all playlists.",

          async execute(client, message) {
            await message.reply("Your playlists:\n- Favorites\n- Chill");
          },
        }),
      ],
    }),
  ],
});

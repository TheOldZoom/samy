import Command from "@/classes/Command";
import { formatMs } from "@/utils/format";
import { icons } from "@/utils/icons";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Command({
  name: "ping",
  description: "Replies with pong",
  everywhere: true,
  ephemeral: true,

  execute: async (client, interaction) => {
    const { ws, rest, db } = await client.ping(
      interaction.guildId,
      "ws",
      "rest",
      "db",
    );

    await interaction.reply(
      v2(
        new Container().text(
          Text(`-# ${icons.pings} Ping`),
          Text(
            [
              `> Gateway: **${formatMs(ws)}**`,
              `> REST: **${rest}ms**`,
              `> Database: **${formatMs(db, "Unreachable")}**`,
            ].join("\n"),
          ),
        ),
      ),
    );
  },
});

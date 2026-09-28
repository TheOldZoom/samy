import Command from "@/classes/Command";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Command({
  name: "ping",
  description: "Replies with pong",
  everywhere: true,
  execute: async (client, interaction) => {
    const { ws, rest } = await client.ping();

    await interaction.reply(
      v2(
        new Container().text(
          Text(`Websocket: **${ws === null ? "-1ms" : `${ws}ms`}**`),
          Text(`API: **${rest}ms**`),
        ),
      ),
    );
  },
});

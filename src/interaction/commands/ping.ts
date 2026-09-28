import Command from "@/classes/Command";
import { Container, Text, v2 } from "@/utils/ui/components";

export default new Command({
  name: "ping",
  description: "Replies with pong",
  everywhere: true,
  execute: async (client, interaction) => {
    await interaction.reply(v2(new Container().text(Text("pong"))));
  },
});

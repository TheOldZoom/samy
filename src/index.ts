import {
  Client,
  GatewayDispatchEvents,
  GatewayIntentBits,
} from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";

const token = process.env.DISCORD_TOKEN!;

const rest = new REST({ version: "10" }).setToken(token);

const gateway = new WebSocketManager({
  token,
  intents: GatewayIntentBits.Guilds,
  rest,
});

const client = new Client({ rest, gateway });

client.once(GatewayDispatchEvents.Ready, ({ data }) => {
  console.log(`Logged in as ${data.user.username}`);
});

gateway.connect();

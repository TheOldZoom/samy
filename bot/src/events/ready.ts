import Event from "../classes/Event";

export default new Event(
  "clientReady",
  (client) => {
    console.log(`Logged in as ${client.user?.tag}`);
  },
  true,
);

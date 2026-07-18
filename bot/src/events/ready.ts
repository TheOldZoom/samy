import Event from "../classes/Event";

export default new Event(
  "clientReady",
  (client) => {
    client.logger.info(`Logged in as ${client.user?.tag}`);
  },
  true,
);

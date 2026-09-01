import { Elysia } from "elysia";
import type { ShardingManager } from "discord.js";
import type Logger from "./Logger";

import indexRoute from "../routes";
import healthRoute from "../routes/health";
import commandsRoute from "../routes/commands";
import servers from "@/routes/servers";
import statusRoute from "@/routes/status";

export default class API {
  public readonly app: Elysia;

  constructor(
    private readonly manager: ShardingManager,
    private readonly logger: Logger,
  ) {
    this.app = new Elysia();

    this.registerRoutes();

    this.logger.info("API initialized");
  }

  private registerRoutes() {
    this.app
      .use(indexRoute)
      .use(healthRoute)
      .use(commandsRoute(this.manager))
      .use(servers(this.manager))
      .use(statusRoute(this.manager))
      .get("/shards", () => ({
        total: this.manager.shards.size,
        shards: [...this.manager.shards.values()].map((shard) => ({
          id: shard.id,
          ready: shard.ready,
        })),
      }));
  }

  start(port = 3000) {
    this.app.listen(port);

    this.logger.info(`API listening on port ${port}`);

    return this;
  }

  stop() {
    void this.app.stop();

    this.logger.info("API stopped");
  }
}

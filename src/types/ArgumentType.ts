import type { Channel, GuildMember, Role, User } from "discord.js";

import type Client from "@/classes/client";
import type { Message } from "discord.js";

export type ArgumentTypeName =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "user"
  | "member"
  | "role"
  | "channel"
  | "channelLike"
  | "userList"
  | "memberList";

export interface ArgumentResolverContext {
  client: Client;
  message: Message;
  raw: string;
}

export type ArgumentResolveResult<T> =
  | {
      success: true;
      value: T;
    }
  | {
      success: false;
      error: string;
    };

export interface ArgumentTypeDefinition<T> {
  name: ArgumentTypeName;
  description: string;

  resolve(
    raw: string,
    context: ArgumentResolverContext,
  ): Promise<ArgumentResolveResult<T>> | ArgumentResolveResult<T>;
}

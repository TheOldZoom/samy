import type {
  Channel,
  GuildBasedChannel,
  GuildMember,
  Role,
  User,
} from "discord.js";

import type { ArgumentTypeName } from "../../types/ArgumentType";

export interface ResolvedArgumentValue {
  type: ArgumentTypeName;
  value: unknown;
}

export class ParsedArguments {
  constructor(
    private readonly values: ReadonlyMap<string, ResolvedArgumentValue>,
  ) {}

  has(name: string): boolean {
    return this.values.has(name);
  }

  get<T = unknown>(name: string): T | undefined {
    return this.values.get(name)?.value as T | undefined;
  }

  getString(name: string): string | undefined {
    return this.get<string>(name);
  }

  getNumber(name: string): number | undefined {
    return this.get<number>(name);
  }

  getInteger(name: string): number | undefined {
    return this.get<number>(name);
  }

  getBoolean(name: string): boolean | undefined {
    return this.get<boolean>(name);
  }

  getUser(name: string): User | undefined {
    return this.get<User>(name);
  }

  getMember(name: string): GuildMember | undefined {
    return this.get<GuildMember>(name);
  }

  getRole(name: string): Role | undefined {
    return this.get<Role>(name);
  }

  getChannel(name: string): Channel | undefined {
    return this.get<Channel>(name);
  }

  getChannelLike(name: string): GuildBasedChannel | undefined {
    return this.get<GuildBasedChannel>(name);
  }

  getUserList(name: string): User[] | undefined {
    return this.get<User[]>(name);
  }

  getMemberList(name: string): GuildMember[] | undefined {
    return this.get<GuildMember[]>(name);
  }

  getResolvedType(name: string): string | undefined {
    return this.values.get(name)?.type;
  }
}

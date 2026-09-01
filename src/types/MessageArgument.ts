import type { ArgumentTypeName } from "./ArgumentType";

export interface MessageArgument {
  name: string;
  aliases?: string[];
  type: ArgumentTypeName | ArgumentTypeName[];
  description?: string;
  required?: boolean;
  default?: unknown;
}

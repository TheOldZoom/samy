import type { Message } from "discord.js";
import type Client from "../../classes/client";
import type { ArgumentParseError } from "../../types/ArgumentError";
import type { MessageArgument } from "../../types/MessageArgument";
import { ParsedArguments, type ResolvedArgumentValue } from "./ParsedArguments";
import { ArgumentRegistry } from "./Resolver";
import { tokenize } from "./Tokenizer";

export type ArgumentParseResult =
  | { success: true; args: ParsedArguments }
  | { success: false; errors: ArgumentParseError[] };

interface FlagLookup {
  long: Map<string, MessageArgument>;
  short: Map<string, MessageArgument>;
}

function buildFlagLookup(definitions: MessageArgument[]): FlagLookup {
  const long = new Map<string, MessageArgument>();
  const short = new Map<string, MessageArgument>();

  for (const definition of definitions) {
    long.set(definition.name.toLowerCase(), definition);

    for (const alias of definition.aliases ?? []) {
      if (alias.length === 1) {
        short.set(alias.toLowerCase(), definition);
      } else {
        long.set(alias.toLowerCase(), definition);
      }
    }
  }

  return { long, short };
}

function isFlagToken(token: string): boolean {
  if (token.startsWith("--") && token.length > 2) return true;

  if (token.startsWith("-") && !token.startsWith("--") && token.length > 1) {
    return /^[A-Za-z]/.test(token[1]!);
  }

  return false;
}

function resolveFlagDefinition(
  token: string,
  lookup: FlagLookup,
): MessageArgument | undefined {
  if (token.startsWith("--")) {
    return lookup.long.get(token.slice(2).toLowerCase());
  }
  return lookup.short.get(token.slice(1).toLowerCase());
}

export class ArgumentParser {
  static async parse(
    client: Client,
    message: Message,
    input: string,
    definitions: MessageArgument[],
  ): Promise<ArgumentParseResult> {
    const errors: ArgumentParseError[] = [];
    const tokens = tokenize(input);
    const lookup = buildFlagLookup(definitions);

    const rawValues = new Map<string, string>();
    const usedFlags = new Set<string>();
    const positionalTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;

      if (!isFlagToken(token)) {
        positionalTokens.push(token);
        continue;
      }

      const definition = resolveFlagDefinition(token, lookup);

      if (!definition) {
        errors.push({
          code: "UNKNOWN_FLAG",
          message: `Unknown flag: ${token}`,
        });
        continue;
      }

      if (usedFlags.has(definition.name)) {
        errors.push({
          code: "DUPLICATE_FLAG",
          argument: definition.name,
          message: `Duplicate flag: ${token}`,
        });
        continue;
      }

      if (definition.type === "boolean") {
        const next = tokens[i + 1];
        const nextIsExplicitBoolean =
          next !== undefined &&
          !isFlagToken(next) &&
          (next.toLowerCase() === "true" || next.toLowerCase() === "false");

        if (nextIsExplicitBoolean) {
          rawValues.set(definition.name, next.toLowerCase());
          i++;
        } else {
          rawValues.set(definition.name, "true");
        }

        usedFlags.add(definition.name);
        continue;
      }

      const value = tokens[i + 1];

      if (value === undefined || isFlagToken(value)) {
        errors.push({
          code: "MISSING_VALUE",
          argument: definition.name,
          message: `Missing value for flag: ${token}`,
        });
        continue;
      }

      if (definition.type === "string") {
        const words: string[] = [];
        let j = i + 1;

        while (j < tokens.length && !isFlagToken(tokens[j]!)) {
          words.push(tokens[j]!);
          j++;
        }

        rawValues.set(definition.name, words.join(" "));
        usedFlags.add(definition.name);
        i = j - 1;
        continue;
      }

      rawValues.set(definition.name, value);
      usedFlags.add(definition.name);
      i++;
    }

    let positionalIndex = 0;
    for (let index = 0; index < definitions.length; index++) {
      const definition = definitions[index]!;

      if (rawValues.has(definition.name)) continue;
      if (positionalIndex >= positionalTokens.length) continue;

      const isLastDefinition = index === definitions.length - 1;

      const isStringType = definition.type === "string";
      const isListType =
        definition.type === "userList" ||
        definition.type === "memberList";

      if (isLastDefinition && (isStringType || isListType)) {
        rawValues.set(
          definition.name,
          positionalTokens.slice(positionalIndex).join(" "),
        );
        positionalIndex = positionalTokens.length;
        continue;
      }

      if (isListType) {
        const remainingRequired = definitions
          .slice(index + 1)
          .filter((d) => d.required && !rawValues.has(d.name)).length;
        const remainingOptional = definitions
          .slice(index + 1)
          .filter((d) => !d.required && !rawValues.has(d.name)).length;
        const availableTokens = positionalTokens.length - positionalIndex;

        let tokensForThis = Math.max(1, availableTokens - remainingRequired);
        if (remainingOptional > 0 && availableTokens > remainingRequired + 1) {
          tokensForThis = availableTokens - remainingOptional;
        }

        rawValues.set(
          definition.name,
          positionalTokens.slice(positionalIndex, positionalIndex + tokensForThis).join(" "),
        );
        positionalIndex += tokensForThis;
        continue;
      }

      rawValues.set(definition.name, positionalTokens[positionalIndex]!);
      positionalIndex++;
    }

    for (const leftover of positionalTokens.slice(positionalIndex)) {
      errors.push({
        code: "UNEXPECTED_ARGUMENT",
        message: `Unexpected argument: ${leftover}`,
      });
    }

    const resolved = new Map<string, ResolvedArgumentValue>();

    for (const definition of definitions) {
      const raw = rawValues.get(definition.name);

      if (raw === undefined) {
        if (definition.required) {
          errors.push({
            code: "MISSING_REQUIRED",
            argument: definition.name,
            message: `Missing required argument: ${definition.name}`,
            usage: `--${definition.name} <value>`,
          });
        } else if (definition.default !== undefined) {
          resolved.set(definition.name, {
            type: Array.isArray(definition.type) ? definition.type.join("|") : definition.type,
            value: definition.default,
          });
        }
        continue;
      }

      const types = Array.isArray(definition.type)
        ? definition.type
        : [definition.type];

      let resolvedValue: { success: true; value: unknown } | null = null;
      const typeErrors: string[] = [];

      for (const typeName of types) {
        const typeDefinition = ArgumentRegistry.get(typeName);

        if (!typeDefinition) {
          typeErrors.push(`Unknown argument type: ${typeName}`);
          continue;
        }

        const resolveResult = await typeDefinition.resolve(raw, {
          client,
          message,
          raw,
        });

        if (resolveResult.success) {
          resolvedValue = resolveResult;
          break;
        }
        typeErrors.push(resolveResult.error);
      }

      if (!resolvedValue) {
        errors.push({
          code: "INVALID_TYPE",
          argument: definition.name,
          message: `Invalid value for ${definition.name}: ${typeErrors.join(", ")}`,
        });
        continue;
      }

      resolved.set(definition.name, {
        type: Array.isArray(definition.type) ? definition.type.join("|") : definition.type,
        value: resolvedValue.value,
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, args: new ParsedArguments(resolved) };
  }
}

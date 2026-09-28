import type { MessageArgument } from "../../types/MessageArgument";

export interface UsageOptions {
  prefix: string;
  name: string;
}

export function buildUsage(
  options: UsageOptions,
  definitions: MessageArgument[],
): string {
  const parts = definitions.map((definition) =>
    definition.required ? `<${definition.name}>` : `[${definition.name}]`,
  );

  return [`${options.prefix}${options.name}`, ...parts].join(" ");
}

export function buildFlagsHelp(definitions: MessageArgument[]): string {
  return definitions
    .map((definition) => {
      const flags = [
        `--${definition.name}`,
        ...(definition.aliases ?? []).map((alias) =>
          alias.length === 1 ? `-${alias}` : `--${alias}`,
        ),
      ];

      const suffix = definition.description
        ? ` - ${definition.description}`
        : "";
      return `${flags.join(", ")}${suffix}`;
    })
    .join("\n");
}

export function buildHelp(
  options: UsageOptions,
  definitions: MessageArgument[],
): string {
  const usage = buildUsage(options, definitions);

  if (definitions.length === 0) {
    return `Usage:\n${usage}`;
  }

  return `Usage:\n${usage}\n\nFlags:\n${buildFlagsHelp(definitions)}`;
}

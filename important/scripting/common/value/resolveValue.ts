import type { ScriptValue, ValuePart } from "./ValueNode";

export interface VariableContext {
  data?: Record<string, unknown>;
}

export type VariableResolver = (
  path: string[],
  context: VariableContext,
) => string | undefined;

export const passthroughVariableResolver: VariableResolver = (path) =>
  `{${path.join(".")}}`;

export function resolveValue(
  value: ScriptValue,
  context: VariableContext = {},
  resolver: VariableResolver = passthroughVariableResolver,
): string {
  return value.parts
    .map((part) => resolvePart(part, context, resolver))
    .join("");
}

function resolvePart(
  part: ValuePart,
  context: VariableContext,
  resolver: VariableResolver,
): string {
  if (part.type === "text") return part.value;

  const resolved = resolver(part.path, context);
  if (resolved !== undefined) return resolved;

  return `{${part.path.join(".")}}`;
}

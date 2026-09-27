export type ValuePart =
  { type: "text"; value: string } | { type: "variable"; path: string[] };

export interface ScriptValue {
  parts: ValuePart[];
}

export function emptyValue(): ScriptValue {
  return { parts: [] };
}

export function textValue(value: string): ScriptValue {
  return { parts: value.length > 0 ? [{ type: "text", value }] : [] };
}

export function isEmptyValue(value: ScriptValue): boolean {
  return value.parts.every(
    (part) => part.type === "text" && part.value.trim().length === 0,
  );
}

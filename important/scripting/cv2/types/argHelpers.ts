import type { Token } from "../../common/Token";
import { ScriptError } from "../../common/ScriptError";
import { isEmptyValue, type ScriptValue } from "../../common/value/ValueNode";

export function requireArgCount(
  name: string,
  args: ScriptValue[],
  min: number,
  max: number,
  token: Token,
): void {
  if (args.length < min) {
    throw new ScriptError(
      "MISSING_ARGUMENT",
      `{${name}} expects at least ${min} argument${min === 1 ? "" : "s"}.`,
      token,
    );
  }

  if (args.length > max) {
    throw new ScriptError(
      "TOO_MANY_ARGUMENTS",
      `{${name}} accepts at most ${max} argument${max === 1 ? "" : "s"}.`,
      token,
    );
  }
}

export function requireNonEmpty(
  name: string,
  value: ScriptValue,
  token: Token,
  label = "value",
): void {
  if (isEmptyValue(value)) {
    throw new ScriptError(
      "MISSING_ARGUMENT",
      `{${name}} requires a non-empty ${label}.`,
      token,
    );
  }
}

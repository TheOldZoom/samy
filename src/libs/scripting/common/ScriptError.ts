export type ScriptErrorCode =
  | "SYNTAX"
  | "UNKNOWN_PARAMETER"
  | "UNKNOWN_COMPONENT"
  | "INVALID_NESTING"
  | "INVALID_ARGUMENT"
  | "MISSING_ARGUMENT"
  | "TOO_MANY_ARGUMENTS"
  | "DUPLICATE_PARAMETER"
  | "LIMIT_EXCEEDED"
  | "INVALID_VALUE"
  | "EMPTY_SCRIPT";

export class ScriptError extends Error {
  readonly code: ScriptErrorCode;
  readonly offset?: number;
  readonly line?: number;
  readonly column?: number;

  constructor(
    code: ScriptErrorCode,
    message: string,
    location?: { offset?: number; line?: number; column?: number },
  ) {
    super(formatMessage(message, location));
    this.name = "ScriptError";
    this.code = code;
    this.offset = location?.offset;
    this.line = location?.line;
    this.column = location?.column;
  }
}

function formatMessage(
  message: string,
  location?: { line?: number; column?: number },
): string {
  if (location?.line !== undefined && location.column !== undefined) {
    return `${message} (line ${location.line}, column ${location.column})`;
  }
  return message;
}

export function isScriptError(error: unknown): error is ScriptError {
  return error instanceof ScriptError;
}

export interface ArgumentParseError {
  code:
    | "MISSING_REQUIRED"
    | "INVALID_TYPE"
    | "MISSING_VALUE"
    | "DUPLICATE_FLAG"
    | "UNKNOWN_FLAG"
    | "UNKNOWN_TYPE"
    | "UNEXPECTED_ARGUMENT";
  argument?: string;
  message: string;
  usage?: string;
}

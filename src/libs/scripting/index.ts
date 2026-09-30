export * as common from "./common";
export * as embed from "./embed";
export * as cv2 from "./cv2";

export { compileEmbedScript, compileMultiEmbedScripts } from "./embed";
export { compileCv2Script } from "./cv2";
export { ScriptError, isScriptError } from "./common/ScriptError";
export { extractRawScript } from "./extractRawScript";
export {
  detectScriptKind,
  mergeMessageContent,
  extractDeleteDirective,
} from "./detectScriptKind";
export type { DetectedScript } from "./detectScriptKind";
export { scheduleMessageDeletion } from "./scheduleMessageDeletion";
export { buildScriptMessage } from "./buildScriptMessage";
export type {
  BuildScriptMessageResult,
  ScriptMessage,
  ScriptMessageBody,
  ScriptMessageKind,
} from "./buildScriptMessage";
export {
  getMemberVariableSource,
  getVariableSource,
  needsGuildData,
  replaceVariables,
} from "./variables";
export type { VariableMember, VariableSource } from "./variables";
export {
  decompileEmbedToScript,
  decompileCv2ToScript,
  decompileMessageToScript,
} from "./decompile";
export type { MessageScriptInput } from "./decompile";

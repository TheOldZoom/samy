import { ScriptError, isScriptError } from "../common/ScriptError";
import type { Cv2Script } from "./types/ComponentDefinition";
import { parseCv2Script } from "./parser/Cv2Parser";
import { validateCv2Script } from "./validator/Cv2Validator";
import { prependCv2Text } from "./prependText";
import {
  renderCv2Script,
  type Cv2RenderOptions,
  type Cv2RenderResult,
} from "./renderer/Cv2Renderer";

export type { Cv2Script, Cv2Node } from "./types/ComponentDefinition";
export { Cv2Parser, parseCv2Script } from "./parser/Cv2Parser";
export { Cv2Validator, validateCv2Script } from "./validator/Cv2Validator";
export {
  Cv2Renderer,
  renderCv2Script,
  type Cv2RenderOptions,
  type Cv2RenderResult,
} from "./renderer/Cv2Renderer";
export { getCv2Component, listCv2Components } from "./registry";

export type Cv2CompileResult =
  | { success: true; result: Cv2RenderResult; script: Cv2Script }
  | { success: false; error: ScriptError };

export function compileCv2Script(
  source: string,
  options?: Cv2RenderOptions,
): Cv2CompileResult {
  try {
    const script = parseCv2Script(source);
    if (options?.prependText) {
      prependCv2Text(script, options.prependText);
    }
    validateCv2Script(script);
    const result = renderCv2Script(script, options);
    return { success: true, result, script };
  } catch (error) {
    if (isScriptError(error)) {
      return { success: false, error };
    }

    return {
      success: false,
      error: new ScriptError(
        "SYNTAX",
        error instanceof Error
          ? error.message
          : "Failed to compile Components V2 script.",
      ),
    };
  }
}

import { ScriptError } from "../../common/ScriptError";
import { EMBED_LIMITS } from "../../common/limits";
import { resolveValue } from "../../common/value/resolveValue";
import type { ScriptValue } from "../../common/value/ValueNode";
import type { AnyEmbedNode, EmbedScript } from "../ast/EmbedNode";
import type { TitleNode } from "../ast/nodes/TitleNode";
import type { DescriptionNode } from "../ast/nodes/DescriptionNode";
import type { AuthorNode } from "../ast/nodes/AuthorNode";
import type { FooterNode } from "../ast/nodes/FooterNode";
import type { FieldNode } from "../ast/nodes/FieldNode";
import type { ContentNode } from "../ast/nodes/ContentNode";
import { getEmbedParameter } from "../registry";
import type { EmbedValidationContext } from "../types/ParameterDefinition";

export class EmbedValidator {
  validate(script: EmbedScript): void {
    const errors: ScriptError[] = [];

    const context: EmbedValidationContext = {
      fieldCount: 0,
      buttonCount: 0,
      errors,
      addError(error) {
        errors.push(error);
      },
    };

    for (const node of script.nodes) {
      const definition = getEmbedParameter(node.kind);
      if (!definition) {
        context.addError(
          new ScriptError(
            "UNKNOWN_PARAMETER",
            `Unknown embed parameter "${node.kind}".`,
            node.token,
          ),
        );
        continue;
      }

      definition.validate(node, context);
    }

    const total = estimateEmbedCharacters(script);
    if (total > EMBED_LIMITS.totalCharacters) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Embed content cannot exceed ${EMBED_LIMITS.totalCharacters} total characters (got ${total}).`,
        ),
      );
    }

    if (errors.length === 1) {
      throw errors[0]!;
    }

    if (errors.length > 1) {
      throw new ScriptError(
        "INVALID_VALUE",
        errors.map((error) => `• ${error.message}`).join("\n"),
      );
    }
  }
}

function estimateEmbedCharacters(script: EmbedScript): number {
  let total = 0;
  for (const node of script.nodes) {
    total += characterContribution(node);
  }
  return total;
}

function characterContribution(node: AnyEmbedNode): number {
  switch (node.kind) {
    case "title":
      return lengthOf((node as TitleNode).value);
    case "description":
      return lengthOf((node as DescriptionNode).value);
    case "author":
      return lengthOf((node as AuthorNode).name);
    case "footer":
      return lengthOf((node as FooterNode).text);
    case "field": {
      const field = node as FieldNode;
      return lengthOf(field.name) + lengthOf(field.value);
    }
    case "content":
      return lengthOf((node as ContentNode).value);
    default:
      return 0;
  }
}

function lengthOf(value: ScriptValue): number {
  return resolveValue(value).length;
}

export function validateEmbedScript(script: EmbedScript): void {
  new EmbedValidator().validate(script);
}

import type { ScriptValue } from "../../../common/value/ValueNode";
import { resolveValue } from "../../../common/value/resolveValue";
import { ScriptError } from "../../../common/ScriptError";
import { parseDuration } from "@/utils/duration";
import type { EmbedNode } from "../EmbedNode";
import type { EmbedParameterDefinition } from "../../types/ParameterDefinition";
import { requireArgCount, requireNonEmpty } from "../../types/argHelpers";

export const MAX_DELETE_DURATION_MS = 24 * 24 * 60 * 60 * 1000;

export interface DeleteNode extends EmbedNode {
  readonly kind: "delete";
  readonly value: ScriptValue;
}

export const deleteParameter: EmbedParameterDefinition<DeleteNode> = {
  name: "delete",
  aliases: ["del", "autodelete"],

  create(token, args) {
    requireArgCount("delete", args, 1, 1, token);
    requireNonEmpty("delete", args[0]!, token, "duration");
    return { kind: "delete", token, value: args[0]! };
  },

  validate(node, context) {
    if (context.hasDelete) {
      context.addError(
        new ScriptError(
          "DUPLICATE_PARAMETER",
          "Cannot specify multiple delete parameters.",
          node.token,
        ),
      );
      return;
    }
    context.hasDelete = true;

    const raw = resolveValue(node.value).trim();
    const ms = parseDuration(raw);

    if (ms === null || ms <= 0) {
      context.addError(
        new ScriptError(
          "INVALID_VALUE",
          `Invalid duration "${raw}" for delete parameter. Examples: 1s, 5m, 1h.`,
          node.token,
        ),
      );
      return;
    }

    if (ms > MAX_DELETE_DURATION_MS) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          "Delete duration cannot exceed 24 days.",
          node.token,
        ),
      );
    }
  },

  render(node, target, context) {
    const raw = resolveValue(
      node.value,
      context.variables,
      context.resolver,
    ).trim();
    const ms = parseDuration(raw);
    if (ms !== null && ms > 0 && ms <= MAX_DELETE_DURATION_MS) {
      target.deleteMs = ms;
    }
  },
};

import {
  ActionRowBuilder,
  ButtonBuilder,
  type BaseMessageOptions,
} from "discord.js";
import {
  passthroughVariableResolver,
  type VariableContext,
  type VariableResolver,
} from "../../common/value/resolveValue";
import type { Cv2Script, Cv2RenderContext } from "../types/ComponentDefinition";
import { renderCv2Child } from "./renderChild";
import { CV2_LIMITS } from "../../common/limits";

import { parseDuration } from "@/utils/duration";
import type { DeleteNode } from "../ast/nodes/DeleteNode";
import { resolveValue } from "../../common/value/resolveValue";

type MessageComponent = NonNullable<BaseMessageOptions["components"]>[number];

export interface Cv2RenderResult {
  components: MessageComponent[];
  deleteMs?: number;
}

export interface Cv2RenderOptions {
  variables?: VariableContext;
  resolver?: VariableResolver;
  prependText?: string;
}

export class Cv2Renderer {
  render(script: Cv2Script, options: Cv2RenderOptions = {}): Cv2RenderResult {
    const context: Cv2RenderContext = {
      variables: options.variables ?? {},
      resolver: options.resolver ?? passthroughVariableResolver,
    };

    const components: MessageComponent[] = [];
    const pendingButtons: ButtonBuilder[] = [];

    const flushButtons = () => {
      while (pendingButtons.length > 0) {
        const slice = pendingButtons.splice(0, CV2_LIMITS.buttonsPerActionRow);
        components.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(slice),
        );
      }
    };

    for (const root of script.roots) {
      if (root.kind === "delete") {
        continue;
      }

      if (root.kind === "button") {
        const rendered = renderCv2Child(root, context);
        const button = Array.isArray(rendered) ? rendered[0] : rendered;
        if (button instanceof ButtonBuilder) {
          pendingButtons.push(button);
        }
        continue;
      }

      flushButtons();

      const rendered = renderCv2Child(root, context);
      const items = Array.isArray(rendered) ? rendered : [rendered];
      for (const item of items) {
        if (item) {
          components.push(item as MessageComponent);
        }
      }
    }

    flushButtons();

    const deleteNode = script.flat.find(
      (n): n is DeleteNode => n.kind === "delete",
    );
    let deleteMs: number | undefined;
    if (deleteNode) {
      const raw = resolveValue(
        deleteNode.value,
        context.variables,
        context.resolver,
      ).trim();
      const ms = parseDuration(raw);
      if (ms !== null && ms > 0 && ms <= 24 * 24 * 60 * 60 * 1000) {
        deleteMs = ms;
      }
    }

    return { components, deleteMs };
  }
}

export function renderCv2Script(
  script: Cv2Script,
  options?: Cv2RenderOptions,
): Cv2RenderResult {
  return new Cv2Renderer().render(script, options);
}

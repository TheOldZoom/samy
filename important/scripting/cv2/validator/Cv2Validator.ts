import { ScriptError } from "../../common/ScriptError";
import { CV2_LIMITS } from "../../common/limits";
import type { Cv2Node, Cv2Script } from "../types/ComponentDefinition";
import type { Cv2ValidationContext } from "../types/ComponentDefinition";
import { getCv2Component } from "../registry";
import type { ContainerNode } from "../ast/nodes/ContainerNode";
import type { SectionNode } from "../ast/nodes/SectionNode";

export class Cv2Validator {
  validate(script: Cv2Script): void {
    const errors: ScriptError[] = [];
    const context: Cv2ValidationContext = {
      errors,
      addError(error) {
        errors.push(error);
      },
    };

    const deleteNodes = script.flat.filter((node) => node.kind === "delete");
    if (deleteNodes.length > 1) {
      context.addError(
        new ScriptError(
          "DUPLICATE_PARAMETER",
          "Cannot specify multiple delete parameters.",
          deleteNodes[1]!.token,
        ),
      );
    }

    const visualRoots = script.roots.filter((root) => root.kind !== "delete");
    if (visualRoots.length > CV2_LIMITS.topLevelComponents) {
      context.addError(
        new ScriptError(
          "LIMIT_EXCEEDED",
          `Messages can have at most ${CV2_LIMITS.topLevelComponents} top-level components.`,
        ),
      );
    }

    for (const root of script.roots) {
      this.validateNode(root, context, "root");
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

  private validateNode(
    node: Cv2Node,
    context: Cv2ValidationContext,
    parent: string,
  ): void {
    const definition = getCv2Component(node.kind);
    if (!definition) {
      context.addError(
        new ScriptError(
          "UNKNOWN_COMPONENT",
          `Unknown component "${node.kind}".`,
          node.token,
        ),
      );
      return;
    }

    definition.validate(node, context);

    if (node.kind === "container") {
      const container = node as ContainerNode;
      if (parent !== "root") {
        context.addError(
          new ScriptError(
            "INVALID_NESTING",
            "Containers cannot be nested inside other components.",
            node.token,
          ),
        );
      }

      for (const child of container.children) {
        if (child.kind === "container") {
          context.addError(
            new ScriptError(
              "INVALID_NESTING",
              "Containers cannot contain other containers.",
              child.token,
            ),
          );
          continue;
        }
        this.validateNode(child, context, "container");
      }
      return;
    }

    if (node.kind === "section") {
      const section = node as SectionNode;

      if (parent !== "root" && parent !== "container") {
        context.addError(
          new ScriptError(
            "INVALID_NESTING",
            "Sections must be top-level or inside a container.",
            node.token,
          ),
        );
      }

      for (const text of section.texts) {
        this.validateNode(text, context, "section");
      }

      if (section.accessory) {
        this.validateNode(section.accessory, context, "section-accessory");
      }
      return;
    }

    if (node.kind === "button" && parent === "root") {
      return;
    }

    if (node.kind === "thumbnail" && parent !== "section-accessory") {
      context.addError(
        new ScriptError(
          "INVALID_NESTING",
          "{thumbnail} is only valid as a section accessory.",
          node.token,
        ),
      );
    }
  }
}

export function validateCv2Script(script: Cv2Script): void {
  new Cv2Validator().validate(script);
}

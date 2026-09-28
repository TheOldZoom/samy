import { ScriptError } from "../../common/ScriptError";
import type { Cv2Node } from "../types/ComponentDefinition";
import type { ContainerNode } from "../ast/nodes/ContainerNode";
import type { SectionNode } from "../ast/nodes/SectionNode";

export function buildCv2Tree(flat: Cv2Node[]): Cv2Node[] {
  const roots: Cv2Node[] = [];
  let index = 0;

  while (index < flat.length) {
    const node = flat[index]!;

    if (node.kind === "container") {
      const { container, nextIndex } = takeContainer(flat, index);
      roots.push(container);
      index = nextIndex;
      continue;
    }

    if (node.kind === "section") {
      const { section, nextIndex } = takeSection(flat, index);
      roots.push(section);
      index = nextIndex;
      continue;
    }

    if (node.kind === "thumbnail") {
      throw new ScriptError(
        "INVALID_NESTING",
        "{thumbnail} must be used as a section accessory (place it after {section} and its text).",
        node.token,
      );
    }

    roots.push(node);
    index += 1;
  }

  return roots;
}

function takeContainer(
  flat: Cv2Node[],
  start: number,
): { container: ContainerNode; nextIndex: number } {
  const container = flat[start] as ContainerNode;
  container.children = [];
  let index = start + 1;

  while (index < flat.length) {
    const node = flat[index]!;

    if (node.kind === "container") {
      break;
    }

    if (node.kind === "section") {
      const { section, nextIndex } = takeSection(flat, index);
      container.children.push(section);
      index = nextIndex;
      continue;
    }

    if (node.kind === "thumbnail") {
      throw new ScriptError(
        "INVALID_NESTING",
        "{thumbnail} must be used as a section accessory.",
        node.token,
      );
    }

    container.children.push(node);
    index += 1;
  }

  return { container, nextIndex: index };
}

function takeSection(
  flat: Cv2Node[],
  start: number,
): { section: SectionNode; nextIndex: number } {
  const section = flat[start] as SectionNode;
  section.texts = [];
  section.accessory = undefined;
  let index = start + 1;

  while (index < flat.length) {
    const node = flat[index]!;

    if (
      node.kind === "container" ||
      node.kind === "section" ||
      node.kind === "separator" ||
      node.kind === "media" ||
      node.kind === "delete"
    ) {
      break;
    }

    if (node.kind === "text") {
      if (section.accessory) break;
      section.texts.push(node);
      index += 1;
      continue;
    }

    if (node.kind === "button" || node.kind === "thumbnail") {
      if (section.accessory) break;
      section.accessory = node;
      index += 1;

      break;
    }

    break;
  }

  return { section, nextIndex: index };
}

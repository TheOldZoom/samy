import type { AnyEmbedParameterDefinition } from "./types/ParameterDefinition";
import {
  authorParameter,
  buttonParameter,
  colorParameter,
  contentParameter,
  descriptionParameter,
  fieldParameter,
  footerParameter,
  imageParameter,
  thumbnailParameter,
  timestampParameter,
  titleParameter,
  urlParameter,
  deleteParameter,
} from "./ast/nodes";

const definitions: AnyEmbedParameterDefinition[] = [
  titleParameter,
  descriptionParameter,
  colorParameter,
  urlParameter,
  thumbnailParameter,
  imageParameter,
  timestampParameter,
  authorParameter,
  footerParameter,
  fieldParameter,
  buttonParameter,
  contentParameter,
  deleteParameter,
];

const byName = new Map<string, AnyEmbedParameterDefinition>();

for (const definition of definitions) {
  byName.set(definition.name.toLowerCase(), definition);
  for (const alias of definition.aliases ?? []) {
    byName.set(alias.toLowerCase(), definition);
  }
}

export function getEmbedParameter(
  name: string,
): AnyEmbedParameterDefinition | undefined {
  return byName.get(name.toLowerCase());
}

export function listEmbedParameters(): readonly AnyEmbedParameterDefinition[] {
  return definitions;
}

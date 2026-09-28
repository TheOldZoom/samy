import type { AnyCv2ComponentDefinition } from "./types/ComponentDefinition";
import {
  buttonComponent,
  containerComponent,
  mediaComponent,
  sectionComponent,
  separatorComponent,
  textComponent,
  thumbnailComponent,
  deleteComponent,
} from "./ast/nodes";

const definitions: AnyCv2ComponentDefinition[] = [
  containerComponent,
  sectionComponent,
  textComponent,
  separatorComponent,
  thumbnailComponent,
  mediaComponent,
  buttonComponent,
  deleteComponent,
];

const byName = new Map<string, AnyCv2ComponentDefinition>();

for (const definition of definitions) {
  byName.set(definition.name.toLowerCase(), definition);
  for (const alias of definition.aliases ?? []) {
    byName.set(alias.toLowerCase(), definition);
  }
}

export function getCv2Component(
  name: string,
): AnyCv2ComponentDefinition | undefined {
  return byName.get(name.toLowerCase());
}

export function listCv2Components(): readonly AnyCv2ComponentDefinition[] {
  return definitions;
}

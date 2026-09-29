import { MessageFlags, type APIMessageTopLevelComponent } from "discord.js";

type TopLevel =
  { toJSON(): APIMessageTopLevelComponent } | APIMessageTopLevelComponent;

function toJSON(component: TopLevel): APIMessageTopLevelComponent {
  return "toJSON" in component ? component.toJSON() : component;
}

export function v2(...components: TopLevel[]): {
  flags: MessageFlags.IsComponentsV2;
  components: APIMessageTopLevelComponent[];
} {
  return {
    flags: MessageFlags.IsComponentsV2,
    components: components.map(toJSON),
  };
}

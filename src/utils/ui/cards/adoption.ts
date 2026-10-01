import { renderPairCard, type CardUser } from "./pair";

export type AdoptionCardState =
  "proposal" | "adopted" | "declined" | "separate" | "removed" | "kept";

const copy: Record<
  AdoptionCardState,
  { title: string; subtitle: string; accent: string; centerLabel: string }
> = {
  proposal: {
    title: "An adoption proposal",
    subtitle: "A family may be about to grow",
    accent: "#66c7ff",
    centerLabel: "+",
  },
  adopted: {
    title: "Welcome to the family",
    subtitle: "A new family bond begins",
    accent: "#72e0a8",
    centerLabel: "✓",
  },
  declined: {
    title: "Adoption declined",
    subtitle: "The proposal was not accepted",
    accent: "#8b8fa3",
    centerLabel: "×",
  },
  separate: {
    title: "Remove this family bond?",
    subtitle: "This decision requires confirmation",
    accent: "#ff6b6b",
    centerLabel: "?",
  },
  removed: {
    title: "Family bond removed",
    subtitle: "They are no longer parent and child",
    accent: "#ff6b6b",
    centerLabel: "×",
  },
  kept: {
    title: "Still family",
    subtitle: "The removal was cancelled",
    accent: "#8b8fa3",
    centerLabel: "✓",
  },
};

export function renderAdoptionCard(
  parent: CardUser,
  child: CardUser,
  state: AdoptionCardState,
) {
  return renderPairCard({ left: parent, right: child, ...copy[state] });
}

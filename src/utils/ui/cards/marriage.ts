import { renderPairCard, type CardUser } from "./pair";

export type MarriageCardState =
  "proposal" | "married" | "declined" | "divorce" | "divorced" | "cancelled";

const copy: Record<
  MarriageCardState,
  { title: string; subtitle: string; accent: string; centerLabel: string }
> = {
  proposal: {
    title: "A marriage proposal",
    subtitle: "Will you say yes?",
    accent: "#ff6b9d",
    centerLabel: "♥",
  },
  married: {
    title: "Just married",
    subtitle: "A new chapter begins",
    accent: "#ffd166",
    centerLabel: "∞",
  },
  declined: {
    title: "Proposal declined",
    subtitle: "Perhaps in another timeline",
    accent: "#8b8fa3",
    centerLabel: "×",
  },
  divorce: {
    title: "End this marriage?",
    subtitle: "This decision requires confirmation",
    accent: "#ff6b6b",
    centerLabel: "?",
  },
  divorced: {
    title: "Marriage ended",
    subtitle: "Their paths now go separate ways",
    accent: "#ff6b6b",
    centerLabel: "×",
  },
  cancelled: {
    title: "Marriage preserved",
    subtitle: "The divorce was cancelled",
    accent: "#8b8fa3",
    centerLabel: "♥",
  },
};

export function renderMarriageCard(
  left: CardUser,
  right: CardUser,
  state: MarriageCardState,
) {
  return renderPairCard({ left, right, ...copy[state] });
}

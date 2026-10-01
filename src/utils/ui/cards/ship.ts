import { renderPairCard, type CardUser } from "./pair";

export function renderShipCard(left: CardUser, right: CardUser, score: number) {
  const accent =
    score >= 80
      ? "#ff5c93"
      : score >= 55
        ? "#d878ff"
        : score >= 30
          ? "#7c8cff"
          : "#7f8490";

  return renderPairCard({
    left,
    right,
    title: `${score}% compatible`,
    subtitle:
      score >= 80
        ? "A match written in the stars"
        : score >= 55
          ? "There could be something here"
          : score >= 30
            ? "Opposites might attract"
            : "The chemistry needs some work",
    accent,
    centerLabel: `${score}%`,
  });
}

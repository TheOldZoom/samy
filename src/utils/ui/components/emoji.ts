export function parseEmoji(emoji: string) {
  const custom = /^<(a?):(\w+):(\d+)>$/.exec(emoji);

  if (custom) {
    return {
      animated: custom[1] === "a",
      name: custom[2]!,
      id: custom[3]!,
    };
  }

  return { name: emoji };
}

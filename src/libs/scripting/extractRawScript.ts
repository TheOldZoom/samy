export function extractRawScript(content: string, prefix: string): string {
  if (!content.startsWith(prefix)) {
    return content.trim();
  }

  const withoutPrefix = content.slice(prefix.length).trimStart();
  const match = withoutPrefix.match(/^\S+(?:\s+)?([\s\S]*)$/);
  return (match?.[1] ?? "").trim();
}

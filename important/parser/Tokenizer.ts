export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;

    if (char === "\\" && input[i + 1] === '"') {
      current += '"';
      hasToken = true;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      hasToken = true;
      continue;
    }

    if (!inQuotes && /\s/.test(char)) {
      if (hasToken) {
        tokens.push(current);
        current = "";
        hasToken = false;
      }
      continue;
    }

    if (current.length === 0 && /[,;]/.test(char)) {
      continue;
    }

    current += char;
    hasToken = true;
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
}

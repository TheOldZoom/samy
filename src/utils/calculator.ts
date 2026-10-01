const CONSTANTS: Record<string, number> = {
  e: Math.E,
  pi: Math.PI,
  tau: Math.PI * 2,
};

const FUNCTIONS: Record<string, (...values: number[]) => number> = {
  abs: Math.abs,
  acos: Math.acos,
  asin: Math.asin,
  atan: Math.atan,
  ceil: Math.ceil,
  cos: Math.cos,
  exp: Math.exp,
  floor: Math.floor,
  ln: Math.log,
  log: Math.log10,
  max: Math.max,
  min: Math.min,
  pow: Math.pow,
  round: Math.round,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
};

type Token =
  | { type: "number"; value: number }
  | { type: "name"; value: string }
  | { type: "operator"; value: string }
  | { type: "left" | "right" | "comma" | "end" };

function tokenize(expression: string): Token[] {
  const input = expression.replaceAll("×", "*").replaceAll("÷", "/");
  const tokens: Token[] = [];
  let position = 0;

  while (position < input.length) {
    const rest = input.slice(position);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      position += whitespace[0].length;
      continue;
    }

    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
    if (number) {
      tokens.push({ type: "number", value: Number(number[0]) });
      position += number[0].length;
      continue;
    }

    const name = rest.match(/^[a-z]+/i);
    if (name) {
      tokens.push({ type: "name", value: name[0]!.toLowerCase() });
      position += name[0].length;
      continue;
    }

    const character = input[position]!;
    if (character === "(" || character === ")" || character === ",") {
      tokens.push({
        type:
          character === "(" ? "left" : character === ")" ? "right" : "comma",
      });
      position++;
      continue;
    }

    if ("+-*/%^".includes(character)) {
      const operator = input.startsWith("**", position) ? "**" : character;
      tokens.push({ type: "operator", value: operator });
      position += operator.length;
      continue;
    }

    throw new Error(`Unexpected character “${character}”`);
  }

  tokens.push({ type: "end" });
  return tokens;
}

export function calculate(expression: string) {
  const tokens = tokenize(expression);
  let position = 0;
  const peek = () => tokens[position]!;
  const take = () => tokens[position++]!;

  const primary = (): number => {
    const token = take();

    if (token.type === "number") return token.value;

    if (token.type === "left") {
      const value = addition();
      if (take().type !== "right")
        throw new Error("Missing closing parenthesis");
      return value;
    }

    if (token.type === "name") {
      if (peek().type !== "left") {
        const value = CONSTANTS[token.value];
        if (value === undefined)
          throw new Error(`Unknown value “${token.value}”`);
        return value;
      }

      take();
      const values: number[] = [];

      if (peek().type !== "right") {
        while (true) {
          values.push(addition());
          if (peek().type !== "comma") break;
          take();
        }
      }

      if (take().type !== "right")
        throw new Error("Missing closing parenthesis");
      const fn = FUNCTIONS[token.value];
      if (!fn) throw new Error(`Unknown function “${token.value}”`);
      if (!values.length)
        throw new Error(`Function “${token.value}” needs a value`);
      return fn(...values);
    }

    throw new Error("Expected a number or parenthesis");
  };

  const power = (): number => {
    const left = primary();
    const token = peek();

    if (
      token.type === "operator" &&
      (token.value === "^" || token.value === "**")
    ) {
      take();
      return left ** unary();
    }

    return left;
  };

  const unary = (): number => {
    const token = peek();
    if (
      token.type === "operator" &&
      (token.value === "+" || token.value === "-")
    ) {
      take();
      const value = unary();
      return token.value === "-" ? -value : value;
    }
    return power();
  };

  const multiplication = (): number => {
    let value = unary();

    while (true) {
      const token = peek();
      if (token.type !== "operator" || !["*", "/", "%"].includes(token.value))
        break;
      take();
      const right = unary();
      if (token.value === "*") value *= right;
      else if (token.value === "/") value /= right;
      else value %= right;
    }

    return value;
  };

  function addition(): number {
    let value = multiplication();

    while (true) {
      const token = peek();
      if (token.type !== "operator" || !["+", "-"].includes(token.value)) break;
      take();
      const right = multiplication();
      value = token.value === "+" ? value + right : value - right;
    }

    return value;
  }

  const result = addition();
  if (peek().type !== "end")
    throw new Error("Unexpected value after the expression");
  if (!Number.isFinite(result))
    throw new Error("The result is not a finite number");
  return Object.is(result, -0) ? 0 : result;
}

export function formatCalculation(value: number) {
  if (Number.isInteger(value) && Math.abs(value) < 1e21)
    return value.toString();
  if ((Math.abs(value) >= 1e12 || Math.abs(value) < 1e-8) && value !== 0) {
    return value.toExponential(10).replace(/\.?0+e/, "e");
  }
  return Number(value.toPrecision(12)).toString();
}

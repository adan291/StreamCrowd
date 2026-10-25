/**
 * Safe arithmetic evaluator (no eval / new Function).
 *
 * Grammar (whitespace ignored):
 *   expr    := term (('+' | '-') term)*
 *   term    := power (('*' | '/' | '%') power)*
 *   power   := unary ('**' power)?          (right-associative)
 *   unary   := ('+' | '-') unary | primary
 *   primary := number | '(' expr ')'
 *   number  := digits ['.' digits] | '.' digits     (always decimal)
 *
 * Returns null for any syntax error. Division by zero follows JS semantics
 * (Infinity / NaN); callers decide how to display that.
 */

const MAX_EXPRESSION_LENGTH = 500;
const MAX_DEPTH = 50;

export function evaluateArithmetic(expression: string): number | null {
  const src = expression.replace(/\s+/g, '');
  if (!src || src.length > MAX_EXPRESSION_LENGTH) return null;

  let pos = 0;
  let depth = 0;

  const peek = (s: string) => src.startsWith(s, pos);

  const parseNumber = (): number | null => {
    const match = /^(\d+(\.\d*)?|\.\d+)/.exec(src.slice(pos));
    if (!match) return null;
    pos += match[0].length;
    return parseFloat(match[0]);
  };

  const parsePrimary = (): number | null => {
    if (peek('(')) {
      if (++depth > MAX_DEPTH) return null;
      pos++;
      const value = parseExpr();
      if (value === null || !peek(')')) return null;
      pos++;
      depth--;
      return value;
    }
    return parseNumber();
  };

  const parseUnary = (): number | null => {
    if (peek('-') || peek('+')) {
      const negative = src[pos] === '-';
      pos++;
      if (++depth > MAX_DEPTH) return null;
      const value = parseUnary();
      depth--;
      return value === null ? null : negative ? -value : value;
    }
    return parsePrimary();
  };

  const parsePower = (): number | null => {
    const base = parseUnary();
    if (base === null) return null;
    if (peek('**')) {
      pos += 2;
      if (++depth > MAX_DEPTH) return null;
      const exponent = parsePower();
      depth--;
      return exponent === null ? null : Math.pow(base, exponent);
    }
    return base;
  };

  const parseTerm = (): number | null => {
    let left = parsePower();
    while (left !== null && (peek('*') || peek('/') || peek('%')) && !peek('**')) {
      const op = src[pos++];
      const right = parsePower();
      if (right === null) return null;
      left = op === '*' ? left * right : op === '/' ? left / right : left % right;
    }
    return left;
  };

  function parseExpr(): number | null {
    let left = parseTerm();
    while (left !== null && (peek('+') || peek('-'))) {
      const op = src[pos++];
      const right = parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  const result = parseExpr();
  return result !== null && pos === src.length ? result : null;
}

/**
 * PowerShell-style command-line tokenizer for the GRC Range terminal.
 *
 * The terminal layer accepts free-form command lines typed by the student and
 * needs to turn them into a structured shape the dispatcher can route. This
 * module implements a small parser that understands the subset of PowerShell
 * syntax the lab exercises rely on:
 *
 *   - Cmdlet names with hyphens (`Get-LocalUser`, `Get-NetFirewallRule`) and
 *     legacy Windows binaries (`net accounts`, `icacls`, `auditpol`).
 *   - Named parameters in the form `-Name value` or `-Name "quoted value"`.
 *   - Positional arguments (everything that is not a named parameter).
 *   - Quoted strings using either single or double quotes.
 *
 * The parser is deliberately permissive: it never throws on malformed input.
 * Anything it cannot make sense of is left as a positional token so the
 * dispatcher can surface a realistic "not recognized" error rather than a
 * parser stack trace.
 */

/**
 * Structured representation of a single PowerShell command line (no pipes).
 *
 * `cmdlet` is always lower-cased so dispatchers can compare case-insensitively
 * without re-normalising. Named-parameter keys keep their leading `-` stripped
 * and are also lower-cased; values preserve their original case.
 */
export interface TokenizedCommand {
  /** The command / cmdlet name, lower-cased (e.g. `get-localuser`). */
  cmdlet: string;
  /** Named parameters keyed by lower-cased name without the leading dash. */
  args: Record<string, string>;
  /** Positional arguments in the order they appeared. */
  positional: string[];
}

/**
 * A raw token pulled out of the line, tagged so the parser can tell named
 * parameters apart from values and bare words.
 */
interface RawToken {
  /** The literal text of the token. */
  text: string;
  /** True when the token started with `-` and is therefore a parameter name. */
  isParam: boolean;
}

/**
 * Split a command line into raw tokens, honouring single and double quotes.
 *
 * Quotes are stripped from the returned token text. A quoted value may contain
 * spaces; an unquoted value is broken on whitespace. A `-` at the start of a
 * token marks it as a parameter name (unless it is a bare `-` on its own, which
 * PowerShell treats as a positional placeholder but the lab does not use).
 */
function lex(line: string): RawToken[] {
  const tokens: RawToken[] = [];
  let i = 0;
  const n = line.length;

  while (i < n) {
    // Skip leading whitespace between tokens.
    while (i < n && /\s/.test(line[i]!)) i++;
    if (i >= n) break;

    const start = i;
    let text = '';
    let quoted = false;

    // Walk a single token, consuming quoted runs that may contain spaces.
    while (i < n) {
      const ch = line[i]!;

      if (ch === '"' || ch === "'") {
        // Entering a quoted run — consume until the matching close quote.
        quoted = true;
        const quote = ch;
        i++; // skip opening quote
        while (i < n && line[i] !== quote) {
          text += line[i];
          i++;
        }
        if (i < n) i++; // skip closing quote (tolerant if missing)
        continue;
      }

      if (!quoted && /\s/.test(ch)) break;

      text += ch;
      i++;
    }

    // A token is a parameter name when it begins with `-` followed by a letter
    // (so negative numbers / bare dashes stay positional).
    const isParam = !quoted && start < line.length && line[start] === '-' && /[A-Za-z]/.test(text[1] ?? '');

    tokens.push({ text, isParam });
  }

  return tokens;
}

/**
 * Tokenize a PowerShell-style command line into a {@link TokenizedCommand}.
 *
 * The function is pure: it does not touch the shell state and never throws.
 * An empty or whitespace-only line yields a command with an empty `cmdlet`,
 * which the dispatcher treats as a no-op.
 *
 * @example
 * tokenize('Get-LocalUser -Name "svc_backup"')
 * // => { cmdlet: 'get-localuser', args: { name: 'svc_backup' }, positional: [] }
 *
 * @example
 * tokenize('net accounts /minpwlen:14')
 * // => { cmdlet: 'net', args: {}, positional: ['accounts', '/minpwlen:14'] }
 */
export function tokenize(line: string): TokenizedCommand {
  const trimmed = line.trim();
  if (trimmed === '') {
    return { cmdlet: '', args: {}, positional: [] };
  }

  const tokens = lex(trimmed);
  if (tokens.length === 0) {
    return { cmdlet: '', args: {}, positional: [] };
  }

  const cmdlet = tokens[0]!.text.toLowerCase();
  const args: Record<string, string> = {};
  const positional: string[] = [];

  // Walk the remaining tokens. A parameter name consumes the next token as its
  // value; if no value follows, the parameter is recorded as the empty string
  // (PowerShell switches such as `-Enabled $true` always carry a value here).
  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i]!;

    if (tok.isParam) {
      const key = tok.text.replace(/^-+/, '').toLowerCase();
      const next = tokens[i + 1];
      if (next !== undefined && !next.isParam) {
        args[key] = next.text;
        i++; // consume the value
      } else {
        // Flag-style parameter with no value — record as boolean-ish "true".
        args[key] = 'true';
      }
    } else {
      positional.push(tok.text);
    }
  }

  return { cmdlet, args, positional };
}

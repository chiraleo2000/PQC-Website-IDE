/** Coerce unknown AST prop values to a safe string (avoids "[object Object]"). */
export function asPropString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asRequiredId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

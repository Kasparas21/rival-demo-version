/**
 * Supabase PostgREST often returns schema-cache errors when a column exists in codegen
 * but the hosted database migration has not been applied (or cache is stale).
 */
export function isMissingDbColumnError(message: string | undefined, columnSnakeCase: string): boolean {
  const m = String(message ?? "").toLowerCase();
  const col = columnSnakeCase.toLowerCase();
  if (!m.includes(col)) return false;
  return (
    m.includes("schema cache") ||
    m.includes("could not find") ||
    m.includes("does not exist") ||
    m.includes("column does not exist")
  );
}

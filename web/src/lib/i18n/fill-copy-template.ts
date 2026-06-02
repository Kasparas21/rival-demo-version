/** Replace `{key}` placeholders in landing copy strings (keeps copy JSON-serializable for client components). */
export function fillCopyTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

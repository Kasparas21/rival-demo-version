export function parseFromField(raw: string | null | undefined): {
  from_email: string | null;
  from_name: string | null;
} {
  const s = raw?.trim() ?? "";
  if (!s) return { from_email: null, from_name: null };

  const angle = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    const name = angle[1]?.replace(/^["']|["']$/g, "").trim() || null;
    const email = angle[2]?.trim() || null;
    return { from_email: email, from_name: name };
  }

  if (s.includes("@")) {
    return { from_email: s, from_name: null };
  }

  return { from_email: null, from_name: s };
}

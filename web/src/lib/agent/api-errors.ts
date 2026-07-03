/** True when Supabase agent tables have not been migrated yet. */
export function isAgentSchemaMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("agent_settings") ||
    m.includes("agent_messages") ||
    m.includes("agent_signals") ||
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table")
  );
}

export function friendlyAgentApiError(message: string): string {
  if (isAgentSchemaMissingError(message)) {
    return "Rival Agent database tables are not set up yet. Apply the latest Supabase migration (20260703120000_rival_agent.sql).";
  }
  return message;
}

export async function readApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty response from server (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON from server (${res.status})`);
  }
}

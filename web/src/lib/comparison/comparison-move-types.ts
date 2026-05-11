/** Shared types for Comparison tab API + UI (move detector timeline). */
export type ComparisonMoveRow = {
  id: string;
  event_type: string;
  significance: string;
  detected_at: string;
  platform: string | null;
  before_state: unknown;
  after_state: unknown;
  narrative: string | null;
};

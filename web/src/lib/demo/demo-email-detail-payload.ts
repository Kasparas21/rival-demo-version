import type { CompetitorEmailRow } from "@/lib/email-intelligence/types";
import {
  FROZEN_EMAIL_DETAIL_COMPETITOR_ID,
  getFrozenEmailDetail,
} from "@/lib/demo/frozen/frozen-adidas-emails";

export function buildDemoEmailDetail(emailId: string): CompetitorEmailRow | null {
  return getFrozenEmailDetail(emailId);
}

export const DEMO_EMAIL_DETAIL_COMPETITOR_ID = FROZEN_EMAIL_DETAIL_COMPETITOR_ID;

export { analyzeCompetitorEmail, stripHtmlToPlainText } from "./email-intelligence/analyze";
export { detectEspFromHtml, type DetectedEsp } from "./email-intelligence/esp-detect";
export { parseFromField } from "./email-intelligence/parse-from";
export {
  buildTrackingAddress,
  buildTrackingCode,
  parseTrackingCodeFromAddress,
  sanitizeSlugForTracking,
} from "./email-intelligence/tracking-code";
export {
  emailIntelligenceAnalysisSchema,
  emailIntelligenceOfferSchema,
  type CompetitorEmailRow,
  type EmailIntelligenceAnalysis,
} from "./email-intelligence/types";

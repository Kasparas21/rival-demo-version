export type DigestHeroStat = {
  value: string;
  label: string;
};

export type DigestHeadlineStat = {
  value: string;
  label: string;
};

export type DigestPlatformChip = {
  id: string;
  label: string;
  active: boolean;
};

export type DigestActivityBar = {
  score: number;
  label: string;
};

export type WeeklyDigestCompetitor = {
  competitorId: string;
  name: string;
  changes: string[];
  url: string;
  heroStat: DigestHeroStat;
  platforms: DigestPlatformChip[];
  activityBar: DigestActivityBar;
};

export type WeeklyDigestPayload = {
  userId: string;
  userEmail: string;
  userName: string;
  dateRange: { start: string; end: string; label: string };
  headlineStats: DigestHeadlineStat[];
  summaryTakeaway: string;
  competitors: WeeklyDigestCompetitor[];
  actionItems: string[];
  unsubscribeUrl: string;
};

export type WeeklyDigestEmailInput = {
  userName: string;
  dateRange: string;
  headlineStats: DigestHeadlineStat[];
  summaryTakeaway: string;
  competitors: Array<{
    name: string;
    changes: string[];
    url: string;
    heroStat: DigestHeroStat;
    platforms: DigestPlatformChip[];
    activityBar: DigestActivityBar;
  }>;
  actionItems: string[];
  unsubscribeUrl: string;
  appOrigin: string;
};

export const DIGEST_PLATFORM_ORDER: DigestPlatformChip[] = [
  { id: "meta", label: "Meta", active: false },
  { id: "google", label: "Google", active: false },
  { id: "tiktok", label: "TikTok", active: false },
  { id: "linkedin", label: "LinkedIn", active: false },
  { id: "pinterest", label: "Pinterest", active: false },
  { id: "snapchat", label: "Snapchat", active: false },
];

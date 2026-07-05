/** Client brand context passed into watch recommendations for personalization. */
export type UserBrandContext = {
  brandName: string;
  brandContext: string | null;
  brandDomain: string | null;
};

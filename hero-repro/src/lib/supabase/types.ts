export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_competitors: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          name: string;
          logo_url: string | null;
          brand_name: string | null;
          brand_domain: string | null;
          brand_logo_url: string | null;
          pending: boolean;
          created_at: string;
          updated_at: string;
          last_scraped_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          slug: string;
          name: string;
          logo_url?: string | null;
          brand_name?: string | null;
          brand_domain?: string | null;
          brand_logo_url?: string | null;
          pending?: boolean;
          created_at?: string;
          updated_at?: string;
          last_scraped_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          slug?: string;
          name?: string;
          logo_url?: string | null;
          brand_name?: string | null;
          brand_domain?: string | null;
          brand_logo_url?: string | null;
          pending?: boolean;
          created_at?: string;
          updated_at?: string;
          last_scraped_at?: string | null;
        };
        Relationships: [];
      };
      ads_cache: {
        Row: {
          id: string;
          user_id: string;
          competitor_domain: string;
          platform: string;
          ads_data: Json;
          scraped_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_domain: string;
          platform: string;
          ads_data: Json;
          scraped_at?: string;
          expires_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_domain?: string;
          platform?: string;
          ads_data?: Json;
          scraped_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          terms: Json;
          channels: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          terms?: Json;
          channels?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          query?: string;
          terms?: Json;
          channels?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      strategy_overview_cache: {
        Row: {
          id: string;
          user_id: string;
          competitor_domain: string;
          competitor_name: string;
          cards: Json;
          snapshot: string;
          ads_hash: string;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_domain: string;
          competitor_name: string;
          cards: Json;
          snapshot?: string;
          ads_hash: string;
          generated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_domain?: string;
          competitor_name?: string;
          cards?: Json;
          snapshot?: string;
          ads_hash?: string;
          generated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

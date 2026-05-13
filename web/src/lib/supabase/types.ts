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
          company_name: string | null;
          company_url: string | null;
          company_role: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company_name?: string | null;
          company_url?: string | null;
          company_role?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company_name?: string | null;
          company_url?: string | null;
          company_role?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brands: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          domain: string | null;
          logo_url: string | null;
          color: string | null;
          is_primary: boolean;
          /** Short “about” copy from onboarding scrape or edited in settings — used as brand context for AI/features. */
          brand_context: string | null;
          ads_profile_setup: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          domain?: string | null;
          logo_url?: string | null;
          color?: string | null;
          is_primary?: boolean;
          brand_context?: string | null;
          ads_profile_setup?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          domain?: string | null;
          logo_url?: string | null;
          color?: string | null;
          is_primary?: boolean;
          brand_context?: string | null;
          ads_profile_setup?: Json | null;
          created_at?: string;
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
          is_workspace_brand: boolean;
          created_at: string;
          updated_at: string;
          last_scraped_at: string | null;
          last_move_detection_at: string | null;
          ads_library_context?: Json | null;
          is_followed: boolean;
          followed_at: string | null;
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
          is_workspace_brand?: boolean;
          created_at?: string;
          updated_at?: string;
          last_scraped_at?: string | null;
          last_move_detection_at?: string | null;
          ads_library_context?: Json | null;
          is_followed?: boolean;
          followed_at?: string | null;
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
          is_workspace_brand?: boolean;
          created_at?: string;
          updated_at?: string;
          last_scraped_at?: string | null;
          last_move_detection_at?: string | null;
          ads_library_context?: Json | null;
          is_followed?: boolean;
          followed_at?: string | null;
        };
        Relationships: [];
      };
      saved_ads: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          source_scraped_ad_id: string | null;
          platform: string;
          ad_text: string;
          ad_creative_url: string | null;
          format: string;
          ai_extracted_angle: string | null;
          funnel_stage: string | null;
          raw_payload: Json;
          source_first_seen_at: string | null;
          source_last_seen_at: string | null;
          notes: string | null;
          saved_by_user_id: string;
          saved_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          source_scraped_ad_id?: string | null;
          platform: string;
          ad_text?: string;
          ad_creative_url?: string | null;
          format?: string;
          ai_extracted_angle?: string | null;
          funnel_stage?: string | null;
          raw_payload?: Json;
          source_first_seen_at?: string | null;
          source_last_seen_at?: string | null;
          notes?: string | null;
          saved_by_user_id: string;
          saved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          source_scraped_ad_id?: string | null;
          platform?: string;
          ad_text?: string;
          ad_creative_url?: string | null;
          format?: string;
          ai_extracted_angle?: string | null;
          funnel_stage?: string | null;
          raw_payload?: Json;
          source_first_seen_at?: string | null;
          source_last_seen_at?: string | null;
          notes?: string | null;
          saved_by_user_id?: string;
          saved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      weekly_scrape_jobs: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          week_start: string;
          status: string;
          scrape_batch_id: string | null;
          error_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          week_start: string;
          status?: string;
          scrape_batch_id?: string | null;
          error_text?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          week_start?: string;
          status?: string;
          scrape_batch_id?: string | null;
          error_text?: string | null;
          created_at?: string;
          updated_at?: string;
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
      scrape_batches: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          created_at: string;
          label: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          created_at?: string;
          label?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          created_at?: string;
          label?: string | null;
        };
        Relationships: [];
      };
      scraped_ads: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          platform: string;
          stable_ad_key: string;
          ad_text: string;
          ad_creative_url: string | null;
          format: string;
          first_seen_at: string;
          last_seen_at: string;
          is_active: boolean;
          scrape_batch_id: string | null;
          raw_payload: Json;
          ai_extracted_angle: string | null;
          funnel_stage: string | null;
          ai_enrichment_status: string;
          ai_extracted_voice_tone: Json | null;
          ai_extracted_launch_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          platform: string;
          stable_ad_key: string;
          ad_text: string;
          ad_creative_url?: string | null;
          format: string;
          first_seen_at: string;
          last_seen_at: string;
          is_active?: boolean;
          scrape_batch_id?: string | null;
          raw_payload?: Json;
          ai_extracted_angle?: string | null;
          funnel_stage?: string | null;
          ai_enrichment_status?: string | null;
          ai_extracted_voice_tone?: Json | null;
          ai_extracted_launch_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          platform?: string;
          stable_ad_key?: string;
          ad_text?: string;
          ad_creative_url?: string | null;
          format?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          is_active?: boolean;
          scrape_batch_id?: string | null;
          raw_payload?: Json;
          ai_extracted_angle?: string | null;
          funnel_stage?: string | null;
          ai_enrichment_status?: string | null;
          ai_extracted_voice_tone?: Json | null;
          ai_extracted_launch_date?: string | null;
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
      competitor_strategy_overview: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          payload: Json;
          source_scrape_batch_id: string | null;
          ai_model_version: string;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          payload?: Json;
          source_scrape_batch_id?: string | null;
          ai_model_version?: string;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          payload?: Json;
          source_scrape_batch_id?: string | null;
          ai_model_version?: string;
          computed_at?: string;
        };
        Relationships: [];
      };
      ad_copy_structure_cache: {
        Row: {
          ad_id: string;
          user_id: string;
          structure: Json;
          computed_at: string;
          ai_model_version: string;
        };
        Insert: {
          ad_id: string;
          user_id: string;
          structure: Json;
          computed_at?: string;
          ai_model_version: string;
        };
        Update: {
          ad_id?: string;
          user_id?: string;
          structure?: Json;
          computed_at?: string;
          ai_model_version?: string;
        };
        Relationships: [];
      };
      competitor_strategy_overview_snapshots: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          payload: Json;
          source_scrape_batch_id: string | null;
          ai_model_version: string;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          payload: Json;
          source_scrape_batch_id?: string | null;
          ai_model_version: string;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          payload?: Json;
          source_scrape_batch_id?: string | null;
          ai_model_version?: string;
          computed_at?: string;
        };
        Relationships: [];
      };
      competitor_moves: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          event_type: string;
          significance: string;
          detected_at: string;
          platform: string | null;
          before_state: Json | null;
          after_state: Json | null;
          narrative: string | null;
          ai_model_version: string | null;
          source_snapshot_id_before: string | null;
          source_snapshot_id_after: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          event_type: string;
          significance: string;
          detected_at?: string;
          platform?: string | null;
          before_state?: Json | null;
          after_state?: Json | null;
          narrative?: string | null;
          ai_model_version?: string | null;
          source_snapshot_id_before?: string | null;
          source_snapshot_id_after?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          event_type?: string;
          significance?: string;
          detected_at?: string;
          platform?: string | null;
          before_state?: Json | null;
          after_state?: Json | null;
          narrative?: string | null;
          ai_model_version?: string | null;
          source_snapshot_id_before?: string | null;
          source_snapshot_id_after?: string | null;
        };
        Relationships: [];
      };
      creative_tests: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          launch_date: string;
          platform: string;
          ad_ids: string[];
          winner_ad_id: string | null;
          test_status: string;
          median_lifespan_days: number;
          max_lifespan_days: number;
          winner_lifespan_days: number | null;
          ad_count: number;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          launch_date: string;
          platform: string;
          ad_ids: string[];
          winner_ad_id?: string | null;
          test_status: string;
          median_lifespan_days?: number;
          max_lifespan_days?: number;
          winner_lifespan_days?: number | null;
          ad_count: number;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          launch_date?: string;
          platform?: string;
          ad_ids?: string[];
          winner_ad_id?: string | null;
          test_status?: string;
          median_lifespan_days?: number;
          max_lifespan_days?: number;
          winner_lifespan_days?: number | null;
          ad_count?: number;
          computed_at?: string;
        };
        Relationships: [];
      };
      funnel_flow_edges: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          from_platform: string;
          to_platform: string;
          confidence_score: number;
          reasoning: string | null;
          edge_style: string;
          detected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          from_platform: string;
          to_platform: string;
          confidence_score: number;
          reasoning?: string | null;
          edge_style?: string;
          detected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          from_platform?: string;
          to_platform?: string;
          confidence_score?: number;
          reasoning?: string | null;
          edge_style?: string;
          detected_at?: string;
        };
        Relationships: [];
      };
      strategy_insights_cards: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          card_type: string;
          payload: Json;
          generated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          card_type: string;
          payload?: Json;
          generated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          card_type?: string;
          payload?: Json;
          generated_at?: string;
        };
        Relationships: [];
      };
      ad_enrichment_log: {
        Row: {
          id: string;
          user_id: string;
          scraped_ad_id: string;
          content_hash: string;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scraped_ad_id: string;
          content_hash: string;
          model: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scraped_ad_id?: string;
          content_hash?: string;
          model?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      strategy_recompute_locks: {
        Row: {
          competitor_id: string;
          locked_until: string;
          owner_token: string | null;
          locked_at: string | null;
          status: string | null;
          completed_at: string | null;
          last_error: string | null;
          enriched_ads: number | null;
          total_ads: number | null;
        };
        Insert: {
          competitor_id: string;
          locked_until: string;
          owner_token?: string | null;
          locked_at?: string | null;
          status?: string | null;
          completed_at?: string | null;
          last_error?: string | null;
          enriched_ads?: number | null;
          total_ads?: number | null;
        };
        Update: {
          competitor_id?: string;
          locked_until?: string;
          owner_token?: string | null;
          locked_at?: string | null;
          status?: string | null;
          completed_at?: string | null;
          last_error?: string | null;
          enriched_ads?: number | null;
          total_ads?: number | null;
        };
        Relationships: [];
      };
      monthly_scrape_usage: {
        Row: {
          user_id: string;
          year_month: string;
          ads_scraped: number;
          scrape_operations: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          year_month: string;
          ads_scraped?: number;
          scrape_operations?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          year_month?: string;
          ads_scraped?: number;
          scrape_operations?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      billing_subscriptions: {
        Row: {
          user_id: string;
          polar_customer_id: string | null;
          polar_subscription_id: string | null;
          polar_product_id: string;
          polar_product_name: string | null;
          status: string;
          trial_start: string | null;
          trial_end: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          started_at: string | null;
          ends_at: string | null;
          ended_at: string | null;
          checkout_id: string | null;
          last_webhook_event_id: string | null;
          raw_payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          polar_customer_id?: string | null;
          polar_subscription_id?: string | null;
          polar_product_id: string;
          polar_product_name?: string | null;
          status?: string;
          trial_start?: string | null;
          trial_end?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          started_at?: string | null;
          ends_at?: string | null;
          ended_at?: string | null;
          checkout_id?: string | null;
          last_webhook_event_id?: string | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          polar_customer_id?: string | null;
          polar_subscription_id?: string | null;
          polar_product_id?: string;
          polar_product_name?: string | null;
          status?: string;
          trial_start?: string | null;
          trial_end?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          started_at?: string | null;
          ends_at?: string | null;
          ended_at?: string | null;
          checkout_id?: string | null;
          last_webhook_event_id?: string | null;
          raw_payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      billing_webhook_events: {
        Row: {
          event_id: string;
          event_type: string;
          processed_at: string;
          raw_payload: Json;
        };
        Insert: {
          event_id: string;
          event_type: string;
          processed_at?: string;
          raw_payload?: Json;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          processed_at?: string;
          raw_payload?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_monthly_scrape_usage: {
        Args: { p_ads_count: number; p_ops_count: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

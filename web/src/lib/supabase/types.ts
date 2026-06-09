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
          weekly_digest_opted_out: boolean;
          last_weekly_digest_sent_at: string | null;
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
          weekly_digest_opted_out?: boolean;
          last_weekly_digest_sent_at?: string | null;
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
          weekly_digest_opted_out?: boolean;
          last_weekly_digest_sent_at?: string | null;
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
          workspace_competitor_id: string | null;
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
          workspace_competitor_id?: string | null;
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
          workspace_competitor_id?: string | null;
          brand_context?: string | null;
          ads_profile_setup?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      brand_competitors: {
        Row: {
          id: string;
          user_id: string;
          brand_id: string;
          competitor_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          brand_id: string;
          competitor_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          brand_id?: string;
          competitor_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brand_comparison_results: {
        Row: {
          id: string;
          user_id: string;
          your_brand_id: string;
          competitor_id: string;
          your_brand_scraped_at: string;
          competitor_scraped_at: string;
          result_payload: Json;
          ai_model_version: string;
          ai_cost_usd: number;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          your_brand_id: string;
          competitor_id: string;
          your_brand_scraped_at: string;
          competitor_scraped_at: string;
          result_payload: Json;
          ai_model_version?: string;
          ai_cost_usd?: number;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          your_brand_id?: string;
          competitor_id?: string;
          your_brand_scraped_at?: string;
          competitor_scraped_at?: string;
          result_payload?: Json;
          ai_model_version?: string;
          ai_cost_usd?: number;
          computed_at?: string;
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
          platform_high_coverage_applied: boolean;
          first_scrape_completed_at: string | null;
          smart_prioritization_disabled: boolean;
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
          platform_high_coverage_applied?: boolean;
          first_scrape_completed_at?: string | null;
          smart_prioritization_disabled?: boolean;
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
          platform_high_coverage_applied?: boolean;
          first_scrape_completed_at?: string | null;
          smart_prioritization_disabled?: boolean;
        };
        Relationships: [];
      };
      competitor_platform_tracking: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          platform: string;
          classification: string;
          active_ad_count: number;
          high_coverage_demoted: boolean;
          classified_at: string;
          last_classification_review_at: string;
          next_scrape_at: string | null;
          last_scrape_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          platform: string;
          classification: string;
          active_ad_count?: number;
          high_coverage_demoted?: boolean;
          classified_at?: string;
          last_classification_review_at?: string;
          next_scrape_at?: string | null;
          last_scrape_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          platform?: string;
          classification?: string;
          active_ad_count?: number;
          high_coverage_demoted?: boolean;
          classified_at?: string;
          last_classification_review_at?: string;
          next_scrape_at?: string | null;
          last_scrape_at?: string | null;
          created_at?: string;
          updated_at?: string;
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
      weekly_digest_sends: {
        Row: {
          id: string;
          user_id: string;
          sent_at: string;
          competitor_count: number;
          change_count: number;
          resend_batch_id: string | null;
          test_send: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          sent_at?: string;
          competitor_count?: number;
          change_count?: number;
          resend_batch_id?: string | null;
          test_send?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          sent_at?: string;
          competitor_count?: number;
          change_count?: number;
          resend_batch_id?: string | null;
          test_send?: boolean;
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
          archived_at: string | null;
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
          archived_at?: string | null;
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
          archived_at?: string | null;
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
          ads_fingerprint: string | null;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          payload?: Json;
          source_scrape_batch_id?: string | null;
          ai_model_version?: string;
          ads_fingerprint?: string | null;
          computed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          payload?: Json;
          source_scrape_batch_id?: string | null;
          ai_model_version?: string;
          ads_fingerprint?: string | null;
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
      ad_preview_analysis_cache: {
        Row: {
          ad_id: string;
          user_id: string;
          analysis: Json;
          computed_at: string;
          ai_model_version: string;
        };
        Insert: {
          ad_id: string;
          user_id: string;
          analysis: Json;
          computed_at?: string;
          ai_model_version: string;
        };
        Update: {
          ad_id?: string;
          user_id?: string;
          analysis?: Json;
          computed_at?: string;
          ai_model_version?: string;
        };
        Relationships: [];
      };
      ad_preview_analysis_usage: {
        Row: {
          user_id: string;
          year_month: string;
          analysis_count: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          year_month: string;
          analysis_count?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          year_month?: string;
          analysis_count?: number;
          updated_at?: string;
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
      competitor_activity_scores: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          score: number;
          tier: number;
          tier_label: string;
          spend_range_min: number;
          spend_range_max: number | null;
          signal_production_value: number;
          signal_creative_diversity: number;
          signal_refresh_velocity: number;
          signal_format_sophistication: number;
          signal_landing_infra: number;
          signal_copy_sophistication: number;
          signal_product_depth: number;
          signal_activity_duration: number;
          reasons_top: Json;
          raw_metrics: Json;
          ads_count_at_calc: number;
          confidence: string;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          score: number;
          tier: number;
          tier_label: string;
          spend_range_min: number;
          spend_range_max?: number | null;
          signal_production_value: number;
          signal_creative_diversity: number;
          signal_refresh_velocity: number;
          signal_format_sophistication: number;
          signal_landing_infra: number;
          signal_copy_sophistication: number;
          signal_product_depth: number;
          signal_activity_duration: number;
          reasons_top?: Json;
          raw_metrics?: Json;
          ads_count_at_calc: number;
          confidence: string;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          score?: number;
          tier?: number;
          tier_label?: string;
          spend_range_min?: number;
          spend_range_max?: number | null;
          signal_production_value?: number;
          signal_creative_diversity?: number;
          signal_refresh_velocity?: number;
          signal_format_sophistication?: number;
          signal_landing_infra?: number;
          signal_copy_sophistication?: number;
          signal_product_depth?: number;
          signal_activity_duration?: number;
          reasons_top?: Json;
          raw_metrics?: Json;
          ads_count_at_calc?: number;
          confidence?: string;
          calculated_at?: string;
        };
        Relationships: [];
      };
      competitor_alerts: {
        Row: {
          id: string;
          user_id: string;
          competitor_id: string;
          alert_type: string;
          severity: string;
          title: string;
          body: string | null;
          metadata: Json;
          detected_at: string;
          source_scrape_batch_id: string | null;
          is_read: boolean;
          notified_at: string | null;
          dedupe_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          competitor_id: string;
          alert_type: string;
          severity?: string;
          title: string;
          body?: string | null;
          metadata?: Json;
          detected_at?: string;
          source_scrape_batch_id?: string | null;
          is_read?: boolean;
          notified_at?: string | null;
          dedupe_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          competitor_id?: string;
          alert_type?: string;
          severity?: string;
          title?: string;
          body?: string | null;
          metadata?: Json;
          detected_at?: string;
          source_scrape_batch_id?: string | null;
          is_read?: boolean;
          notified_at?: string | null;
          dedupe_key?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      alert_rules: {
        Row: {
          id: string;
          user_id: string;
          alert_type: string;
          enabled: boolean;
          notify_email: boolean;
          threshold: Json;
          competitor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          alert_type: string;
          enabled?: boolean;
          notify_email?: boolean;
          threshold?: Json;
          competitor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          alert_type?: string;
          enabled?: boolean;
          notify_email?: boolean;
          threshold?: Json;
          competitor_id?: string | null;
          created_at?: string;
          updated_at?: string;
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
      competitor_swap_usage: {
        Row: {
          user_id: string;
          year_month: string;
          swap_count: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          year_month: string;
          swap_count?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          year_month?: string;
          swap_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      csv_export_usage: {
        Row: {
          user_id: string;
          year_month: string;
          export_count: number;
          ads_exported: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          year_month: string;
          export_count?: number;
          ads_exported?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          year_month?: string;
          export_count?: number;
          ads_exported?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_refresh_usage: {
        Row: {
          user_id: string;
          year_month: string;
          competitor_id: string;
          refresh_count: number;
          last_refresh_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          year_month: string;
          competitor_id: string;
          refresh_count?: number;
          last_refresh_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          year_month?: string;
          competitor_id?: string;
          refresh_count?: number;
          last_refresh_at?: string | null;
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
      meta_event: {
        Row: {
          order_id: string;
          event_name: string;
          sent_at: string;
          meta_response: Json | null;
        };
        Insert: {
          order_id: string;
          event_name?: string;
          sent_at?: string;
          meta_response?: Json | null;
        };
        Update: {
          order_id?: string;
          event_name?: string;
          sent_at?: string;
          meta_response?: Json | null;
        };
        Relationships: [];
      };
      tester_invite_redemptions: {
        Row: {
          id: string;
          invite_code: string;
          user_id: string;
          polar_subscription_id: string | null;
          redeemed_at: string;
        };
        Insert: {
          id?: string;
          invite_code: string;
          user_id: string;
          polar_subscription_id?: string | null;
          redeemed_at?: string;
        };
        Update: {
          id?: string;
          invite_code?: string;
          user_id?: string;
          polar_subscription_id?: string | null;
          redeemed_at?: string;
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
      increment_competitor_swap_usage: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      increment_ad_preview_analysis_usage: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      increment_csv_export_usage: {
        Args: { p_ads_count: number };
        Returns: undefined;
      };
      record_manual_refresh_usage: {
        Args: { p_competitor_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

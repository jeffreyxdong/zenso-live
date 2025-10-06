export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      brand_prompt_responses: {
        Row: {
          brand_prompt_id: string
          created_at: string
          id: string
          model_name: string
          response_text: string
          source: string | null
          sources: Json | null
          sources_final: Json | null
        }
        Insert: {
          brand_prompt_id: string
          created_at?: string
          id?: string
          model_name: string
          response_text: string
          source?: string | null
          sources?: Json | null
          sources_final?: Json | null
        }
        Update: {
          brand_prompt_id?: string
          created_at?: string
          id?: string
          model_name?: string
          response_text?: string
          source?: string | null
          sources?: Json | null
          sources_final?: Json | null
        }
        Relationships: []
      }
      brand_prompts: {
        Row: {
          active: boolean
          brand_name: string
          content: string
          created_at: string
          id: string
          position_score: number | null
          sentiment_score: number | null
          status: string
          store_id: string
          updated_at: string
          user_id: string
          visibility_score: number | null
        }
        Insert: {
          active?: boolean
          brand_name: string
          content: string
          created_at?: string
          id?: string
          position_score?: number | null
          sentiment_score?: number | null
          status?: string
          store_id: string
          updated_at?: string
          user_id: string
          visibility_score?: number | null
        }
        Update: {
          active?: boolean
          brand_name?: string
          content?: string
          created_at?: string
          id?: string
          position_score?: number | null
          sentiment_score?: number | null
          status?: string
          store_id?: string
          updated_at?: string
          user_id?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_prompts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_recommendations: {
        Row: {
          category: string
          created_at: string
          description: string
          effort: string
          id: string
          impact: string
          site_url: string | null
          status: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          effort: string
          id?: string
          impact: string
          site_url?: string | null
          status?: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          effort?: string
          id?: string
          impact?: string
          site_url?: string | null
          status?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_recommendations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_scores: {
        Row: {
          created_at: string
          date: string
          id: string
          sentiment_score: number | null
          store_id: string
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          sentiment_score?: number | null
          store_id: string
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          sentiment_score?: number | null
          store_id?: string
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_analytics: {
        Row: {
          created_at: string
          description: string
          id: string
          key_differentiator: string | null
          market_position: string
          name: string
          store_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          key_differentiator?: string | null
          market_position: string
          name: string
          store_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          key_differentiator?: string | null
          market_position?: string
          name?: string
          store_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_recommendations: {
        Row: {
          category: string
          created_at: string
          description: string
          effort: string
          id: string
          impact: string
          pdp_url: string | null
          product_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          effort: string
          id?: string
          impact: string
          pdp_url?: string | null
          product_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          effort?: string
          id?: string
          impact?: string
          pdp_url?: string | null
          product_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_scores: {
        Row: {
          created_at: string
          id: string
          position_score: number | null
          product_id: string
          sentiment_score: number | null
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          position_score?: number | null
          product_id: string
          sentiment_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          position_score?: number | null
          product_id?: string
          sentiment_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_scores_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string
          id: string
          inventory_management: string | null
          inventory_policy: string | null
          inventory_quantity: number | null
          price: number
          product_id: string
          shopify_variant_id: string
          sku: string | null
          title: string
          updated_at: string
          weight: number | null
          weight_unit: string | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          inventory_management?: string | null
          inventory_policy?: string | null
          inventory_quantity?: number | null
          price: number
          product_id: string
          shopify_variant_id: string
          sku?: string | null
          title: string
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          inventory_management?: string | null
          inventory_policy?: string | null
          inventory_quantity?: number | null
          price?: number
          product_id?: string
          shopify_variant_id?: string
          sku?: string | null
          title?: string
          updated_at?: string
          weight?: number | null
          weight_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          handle: string
          id: string
          images: Json | null
          position_score: number | null
          product_type: string | null
          sentiment_score: number | null
          shopify_id: string
          status: string
          store_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          vendor: string | null
          visibility_score: number | null
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          images?: Json | null
          position_score?: number | null
          product_type?: string | null
          sentiment_score?: number | null
          shopify_id: string
          status?: string
          store_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          vendor?: string | null
          visibility_score?: number | null
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          images?: Json | null
          position_score?: number | null
          product_type?: string | null
          sentiment_score?: number | null
          shopify_id?: string
          status?: string
          store_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string
          company_website: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          company_website: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          company_website?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_responses: {
        Row: {
          created_at: string
          id: string
          model_name: string
          prompt_id: string
          response_text: string
          source: string | null
          sources: Json | null
          sources_final: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          model_name: string
          prompt_id: string
          response_text: string
          source?: string | null
          sources?: Json | null
          sources_final?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          model_name?: string
          prompt_id?: string
          response_text?: string
          source?: string | null
          sources?: Json | null
          sources_final?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          active: boolean
          brand_name: string | null
          content: string
          created_at: string
          id: string
          position_score: number | null
          product_id: string | null
          sentiment_score: number | null
          status: string | null
          store_id: string | null
          updated_at: string
          user_id: string
          visibility_score: number | null
        }
        Insert: {
          active?: boolean
          brand_name?: string | null
          content: string
          created_at?: string
          id?: string
          position_score?: number | null
          product_id?: string | null
          sentiment_score?: number | null
          status?: string | null
          store_id?: string | null
          updated_at?: string
          user_id: string
          visibility_score?: number | null
        }
        Update: {
          active?: boolean
          brand_name?: string | null
          content?: string
          created_at?: string
          id?: string
          position_score?: number | null
          product_id?: string | null
          sentiment_score?: number | null
          status?: string | null
          store_id?: string | null
          updated_at?: string
          user_id?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          access_token: string
          created_at: string
          id: string
          shop_domain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          shop_domain: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          shop_domain?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
          website: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
          website: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          website?: string
        }
        Relationships: []
      }
      user_generated_prompt_daily_scores: {
        Row: {
          created_at: string
          date: string
          id: string
          prompt_id: string
          sentiment_score: number | null
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          prompt_id: string
          sentiment_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          prompt_id?: string
          sentiment_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_generated_prompt_daily_scores_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "user_generated_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_generated_prompt_responses: {
        Row: {
          created_at: string
          id: string
          model_name: string
          prompt_id: string
          response_text: string
          source: string | null
          sources: Json | null
          sources_final: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          model_name: string
          prompt_id: string
          response_text: string
          source?: string | null
          sources?: Json | null
          sources_final?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          model_name?: string
          prompt_id?: string
          response_text?: string
          source?: string | null
          sources?: Json | null
          sources_final?: Json | null
        }
        Relationships: []
      }
      user_generated_prompts: {
        Row: {
          active: boolean
          brand_name: string | null
          content: string
          created_at: string
          id: string
          position_score: number | null
          product_id: string | null
          sentiment_score: number | null
          status: string | null
          store_id: string
          updated_at: string
          user_id: string
          visibility_score: number | null
        }
        Insert: {
          active?: boolean
          brand_name?: string | null
          content: string
          created_at?: string
          id?: string
          position_score?: number | null
          product_id?: string | null
          sentiment_score?: number | null
          status?: string | null
          store_id: string
          updated_at?: string
          user_id: string
          visibility_score?: number | null
        }
        Update: {
          active?: boolean
          brand_name?: string | null
          content?: string
          created_at?: string
          id?: string
          position_score?: number | null
          product_id?: string | null
          sentiment_score?: number | null
          status?: string | null
          store_id?: string
          updated_at?: string
          user_id?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_generated_prompts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      brand_prompt_responses_with_prompts: {
        Row: {
          brand_name: string | null
          model_name: string | null
          position_score: number | null
          prompt_active: boolean | null
          prompt_content: string | null
          prompt_created_at: string | null
          prompt_id: string | null
          prompt_status: string | null
          prompt_updated_at: string | null
          response_created_at: string | null
          response_id: string | null
          response_text: string | null
          sentiment_score: number | null
          source: string | null
          sources: Json | null
          sources_final: Json | null
          store_id: string | null
          user_id: string | null
          visibility_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_prompts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_scores_with_titles: {
        Row: {
          created_at: string | null
          id: string | null
          position_score: number | null
          product_handle: string | null
          product_id: string | null
          product_title: string | null
          sentiment_score: number | null
          updated_at: string | null
          visibility_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_scores_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_responses_with_prompts: {
        Row: {
          brand_name: string | null
          model_name: string | null
          position_score: number | null
          product_handle: string | null
          product_id: string | null
          product_title: string | null
          prompt_active: boolean | null
          prompt_content: string | null
          prompt_created_at: string | null
          prompt_id: string | null
          prompt_status: string | null
          prompt_updated_at: string | null
          response_created_at: string | null
          response_id: string | null
          response_text: string | null
          sentiment_score: number | null
          source: string | null
          sources: Json | null
          store_id: string | null
          user_id: string | null
          visibility_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      arc_dapps: {
        Row: {
          actions: Json
          category: string
          chain_id: number | null
          created_at: string
          description: string
          icon_url: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_verified: boolean
          name: string
          slug: string
          target_contract: string | null
          updated_at: string
          website_url: string
        }
        Insert: {
          actions?: Json
          category: string
          chain_id?: number | null
          created_at?: string
          description: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_verified?: boolean
          name: string
          slug: string
          target_contract?: string | null
          updated_at?: string
          website_url: string
        }
        Update: {
          actions?: Json
          category?: string
          chain_id?: number | null
          created_at?: string
          description?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_verified?: boolean
          name?: string
          slug?: string
          target_contract?: string | null
          updated_at?: string
          website_url?: string
        }
        Relationships: []
      }
      campaign_participations: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          joined_at: string
          template_id: string
          updated_at: string
          user_id: string
          verification_error: string | null
          verification_status: string
          verified_amount: number | null
          verified_at: string | null
          verified_tx_hash: string | null
          wallet_address: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          template_id: string
          updated_at?: string
          user_id: string
          verification_error?: string | null
          verification_status?: string
          verified_amount?: number | null
          verified_at?: string | null
          verified_tx_hash?: string | null
          wallet_address: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          joined_at?: string
          template_id?: string
          updated_at?: string
          user_id?: string
          verification_error?: string | null
          verification_status?: string
          verified_amount?: number | null
          verified_at?: string | null
          verified_tx_hash?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "campaign_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          icon_url: string | null
          id: string
          is_active: boolean | null
          min_amount_usd: number | null
          name: string
          redirect_url: string
          required_event: string
          slug: string
          target_contract: string
          target_dapp: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          min_amount_usd?: number | null
          name: string
          redirect_url: string
          required_event: string
          slug: string
          target_contract: string
          target_dapp: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          min_amount_usd?: number | null
          name?: string
          redirect_url?: string
          required_event?: string
          slug?: string
          target_contract?: string
          target_dapp?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          arc_context: string[]
          campaign_type: string
          caption: string
          caption_hash: string
          created_at: string
          custom_input: string | null
          generation_metadata: Json | null
          id: string
          image_prompt: string | null
          image_status: string
          image_style: string
          image_url: string | null
          status: string
          tones: string[]
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          arc_context?: string[]
          campaign_type: string
          caption: string
          caption_hash: string
          created_at?: string
          custom_input?: string | null
          generation_metadata?: Json | null
          id?: string
          image_prompt?: string | null
          image_status?: string
          image_style: string
          image_url?: string | null
          status?: string
          tones?: string[]
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          arc_context?: string[]
          campaign_type?: string
          caption?: string
          caption_hash?: string
          created_at?: string
          custom_input?: string | null
          generation_metadata?: Json | null
          id?: string
          image_prompt?: string | null
          image_status?: string
          image_style?: string
          image_url?: string | null
          status?: string
          tones?: string[]
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      nfts: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          intent_category: number | null
          intent_fingerprint: string | null
          metadata_hash: string | null
          minted_at: string | null
          proof_cost: number | null
          status: string
          token_id: string | null
          tx_hash: string | null
          user_id: string
          verified_at: string | null
          wallet_address: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          intent_category?: number | null
          intent_fingerprint?: string | null
          metadata_hash?: string | null
          minted_at?: string | null
          proof_cost?: number | null
          status?: string
          token_id?: string | null
          tx_hash?: string | null
          user_id: string
          verified_at?: string | null
          wallet_address: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          intent_category?: number | null
          intent_fingerprint?: string | null
          metadata_hash?: string | null
          minted_at?: string | null
          proof_cost?: number | null
          status?: string
          token_id?: string | null
          tx_hash?: string | null
          user_id?: string
          verified_at?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          campaigns_created: number
          created_at: string
          id: string
          nfts_minted: number
          updated_at: string
          user_id: string
          username: string | null
          wallet_address: string
        }
        Insert: {
          campaigns_created?: number
          created_at?: string
          id?: string
          nfts_minted?: number
          updated_at?: string
          user_id: string
          username?: string | null
          wallet_address: string
        }
        Update: {
          campaigns_created?: number
          created_at?: string
          id?: string
          nfts_minted?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      profiles_auth_secrets: {
        Row: {
          auth_salt: string
          created_at: string
          user_id: string
        }
        Insert: {
          auth_salt: string
          created_at?: string
          user_id: string
        }
        Update: {
          auth_salt?: string
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      siwe_nonces: {
        Row: {
          expires_at: string
          nonce: string
          used_at: string
          wallet_address: string
        }
        Insert: {
          expires_at: string
          nonce: string
          used_at?: string
          wallet_address: string
        }
        Update: {
          expires_at?: string
          nonce?: string
          used_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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

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
      campaigns: {
        Row: {
          arc_context: string[]
          campaign_type: string
          caption: string
          caption_hash: string
          created_at: string
          custom_input: string | null
          id: string
          image_status: string
          image_style: string
          image_url: string | null
          status: string
          tones: string[]
          updated_at: string
          wallet_address: string
        }
        Insert: {
          arc_context?: string[]
          campaign_type: string
          caption: string
          caption_hash: string
          created_at?: string
          custom_input?: string | null
          id?: string
          image_status?: string
          image_style: string
          image_url?: string | null
          status?: string
          tones?: string[]
          updated_at?: string
          wallet_address: string
        }
        Update: {
          arc_context?: string[]
          campaign_type?: string
          caption?: string
          caption_hash?: string
          created_at?: string
          custom_input?: string | null
          id?: string
          image_status?: string
          image_style?: string
          image_url?: string | null
          status?: string
          tones?: string[]
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      marketplace_stats: {
        Row: {
          avg_price: number | null
          floor_price: number | null
          id: string
          total_listed: number | null
          total_sales: number | null
          total_volume: number | null
          updated_at: string | null
        }
        Insert: {
          avg_price?: number | null
          floor_price?: number | null
          id?: string
          total_listed?: number | null
          total_sales?: number | null
          total_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_price?: number | null
          floor_price?: number | null
          id?: string
          total_listed?: number | null
          total_sales?: number | null
          total_volume?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_transactions: {
        Row: {
          buyer_address: string
          created_at: string | null
          id: string
          nft_id: string
          price: number
          seller_address: string
          tx_hash: string | null
        }
        Insert: {
          buyer_address: string
          created_at?: string | null
          id?: string
          nft_id: string
          price: number
          seller_address: string
          tx_hash?: string | null
        }
        Update: {
          buyer_address?: string
          created_at?: string | null
          id?: string
          nft_id?: string
          price?: number
          seller_address?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_likes: {
        Row: {
          created_at: string | null
          id: string
          nft_id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nft_id: string
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nft_id?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "nft_likes_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
      nfts: {
        Row: {
          buyer_address: string | null
          campaign_id: string
          created_at: string
          id: string
          is_listed: boolean | null
          likes_count: number | null
          listed_at: string | null
          listing_price: number | null
          metadata_hash: string | null
          mint_cost: number | null
          minted_at: string | null
          seller_address: string | null
          sold_at: string | null
          status: string
          token_id: string | null
          tx_hash: string | null
          views_count: number | null
          wallet_address: string
        }
        Insert: {
          buyer_address?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          is_listed?: boolean | null
          likes_count?: number | null
          listed_at?: string | null
          listing_price?: number | null
          metadata_hash?: string | null
          mint_cost?: number | null
          minted_at?: string | null
          seller_address?: string | null
          sold_at?: string | null
          status?: string
          token_id?: string | null
          tx_hash?: string | null
          views_count?: number | null
          wallet_address: string
        }
        Update: {
          buyer_address?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          is_listed?: boolean | null
          likes_count?: number | null
          listed_at?: string | null
          listing_price?: number | null
          metadata_hash?: string | null
          mint_cost?: number | null
          minted_at?: string | null
          seller_address?: string | null
          sold_at?: string | null
          status?: string
          token_id?: string | null
          tx_hash?: string | null
          views_count?: number | null
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
          username: string | null
          wallet_address: string
        }
        Insert: {
          campaigns_created?: number
          created_at?: string
          id?: string
          nfts_minted?: number
          updated_at?: string
          username?: string | null
          wallet_address: string
        }
        Update: {
          campaigns_created?: number
          created_at?: string
          id?: string
          nfts_minted?: number
          updated_at?: string
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      marketplace_transactions_public: {
        Row: {
          buyer_masked: string | null
          created_at: string | null
          id: string | null
          nft_id: string | null
          price: number | null
          seller_masked: string | null
          tx_hash: string | null
        }
        Insert: {
          buyer_masked?: never
          created_at?: string | null
          id?: string | null
          nft_id?: string | null
          price?: number | null
          seller_masked?: never
          tx_hash?: string | null
        }
        Update: {
          buyer_masked?: never
          created_at?: string | null
          id?: string | null
          nft_id?: string | null
          price?: number | null
          seller_masked?: never
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_nft_id_fkey"
            columns: ["nft_id"]
            isOneToOne: false
            referencedRelation: "nfts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      validate_campaign_ownership: {
        Args: { _campaign_id: string; _wallet_address: string }
        Returns: boolean
      }
      validate_nft_ownership: {
        Args: { _nft_id: string; _wallet_address: string }
        Returns: boolean
      }
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

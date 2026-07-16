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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          address: string | null
          city: string | null
          company_size: string | null
          company_type: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          current_supplier: string | null
          description: string | null
          employees_count: number | null
          expected_volume: string | null
          id: string
          industry: string | null
          language: string | null
          last_contact_at: string | null
          linkedin: string | null
          logo_url: string | null
          name_ar: string | null
          name_en: string
          next_followup_at: string | null
          notes: string | null
          owner_id: string | null
          priority: string | null
          products_needed: string | null
          products_offered: string | null
          rating: string | null
          source: string | null
          status: Database["public"]["Enums"]["company_status"]
          tags: string[] | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_size?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_supplier?: string | null
          description?: string | null
          employees_count?: number | null
          expected_volume?: string | null
          id?: string
          industry?: string | null
          language?: string | null
          last_contact_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name_ar?: string | null
          name_en: string
          next_followup_at?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          products_needed?: string | null
          products_offered?: string | null
          rating?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_size?: string | null
          company_type?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_supplier?: string | null
          description?: string | null
          employees_count?: number | null
          expected_volume?: string | null
          id?: string
          industry?: string | null
          language?: string | null
          last_contact_at?: string | null
          linkedin?: string | null
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string
          next_followup_at?: string | null
          notes?: string | null
          owner_id?: string | null
          priority?: string | null
          products_needed?: string | null
          products_offered?: string | null
          rating?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["company_status"]
          tags?: string[] | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          avatar_url: string | null
          best_time_to_contact: string | null
          birthday: string | null
          city: string | null
          company_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          full_name: string
          id: string
          influence_level: string | null
          is_decision_maker: boolean | null
          is_influencer: boolean | null
          job_title: string | null
          language: string | null
          last_contact_at: string | null
          linkedin: string | null
          next_followup_at: string | null
          notes: string | null
          phone: string | null
          preferred_channel: string | null
          timezone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          best_time_to_contact?: string | null
          birthday?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name: string
          id?: string
          influence_level?: string | null
          is_decision_maker?: boolean | null
          is_influencer?: boolean | null
          job_title?: string | null
          language?: string | null
          last_contact_at?: string | null
          linkedin?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          best_time_to_contact?: string | null
          birthday?: string | null
          city?: string | null
          company_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name?: string
          id?: string
          influence_level?: string | null
          is_decision_maker?: boolean | null
          is_influencer?: boolean | null
          job_title?: string | null
          language?: string | null
          last_contact_at?: string | null
          linkedin?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_channel?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          company_id: string | null
          company_name: string | null
          contact_id: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          exhibition_id: string | null
          expected_order_date: string | null
          expected_quantity: string | null
          expected_value: number | null
          finishes: string | null
          id: string
          industry: string | null
          lead_score: number | null
          material: string | null
          next_followup_at: string | null
          next_step: string | null
          notes: string | null
          owner_id: string | null
          print_type: string | null
          priority: string | null
          probability: number | null
          product_requested: string | null
          size: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exhibition_id?: string | null
          expected_order_date?: string | null
          expected_quantity?: string | null
          expected_value?: number | null
          finishes?: string | null
          id?: string
          industry?: string | null
          lead_score?: number | null
          material?: string | null
          next_followup_at?: string | null
          next_step?: string | null
          notes?: string | null
          owner_id?: string | null
          print_type?: string | null
          priority?: string | null
          probability?: number | null
          product_requested?: string | null
          size?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          company_id?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          exhibition_id?: string | null
          expected_order_date?: string | null
          expected_quantity?: string | null
          expected_value?: number | null
          finishes?: string | null
          id?: string
          industry?: string | null
          lead_score?: number | null
          material?: string | null
          next_followup_at?: string | null
          next_step?: string | null
          notes?: string | null
          owner_id?: string | null
          print_type?: string | null
          priority?: string | null
          probability?: number | null
          product_requested?: string | null
          size?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          job_title: string | null
          language: string | null
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          job_title?: string | null
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          language?: string | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "system_owner"
        | "export_manager"
        | "sales_specialist"
        | "sales_coordinator"
        | "pricing"
        | "production"
        | "logistics"
        | "accounting"
        | "viewer"
      company_status:
        | "active"
        | "inactive"
        | "prospect"
        | "customer"
        | "archived"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "nurturing"
        | "proposal"
        | "won"
        | "lost"
      lead_temperature: "hot" | "warm" | "cold"
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
    Enums: {
      app_role: [
        "system_owner",
        "export_manager",
        "sales_specialist",
        "sales_coordinator",
        "pricing",
        "production",
        "logistics",
        "accounting",
        "viewer",
      ],
      company_status: [
        "active",
        "inactive",
        "prospect",
        "customer",
        "archived",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "nurturing",
        "proposal",
        "won",
        "lost",
      ],
      lead_temperature: ["hot", "warm", "cold"],
    },
  },
} as const

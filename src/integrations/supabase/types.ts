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
      activities: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          occurred_at: string
          opportunity_id: string | null
          related_id: string | null
          related_type: string | null
          subject: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          related_id?: string | null
          related_type?: string | null
          subject: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          occurred_at?: string
          opportunity_id?: string | null
          related_id?: string | null
          related_type?: string | null
          subject?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
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
      exhibitions: {
        Row: {
          booth_cost: number | null
          booth_number: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          leads_collected: number | null
          name: string
          notes: string | null
          start_date: string | null
          status: string | null
          total_cost: number | null
          updated_at: string
          venue: string | null
          website: string | null
        }
        Insert: {
          booth_cost?: number | null
          booth_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          leads_collected?: number | null
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string
          venue?: string | null
          website?: string | null
        }
        Update: {
          booth_cost?: number | null
          booth_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          leads_collected?: number | null
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string
          venue?: string | null
          website?: string | null
        }
        Relationships: []
      }
      export_documents: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          doc_number: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          notes: string | null
          order_id: string | null
          shipment_id: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_number: string
          doc_type: Database["public"]["Enums"]["doc_type"]
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          order_id?: string | null
          shipment_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_number?: string
          doc_type?: Database["public"]["Enums"]["doc_type"]
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          order_id?: string | null
          shipment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          amount: number | null
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          name: string
          owner_id: string | null
          probability: number | null
          product_category: string | null
          stage: Database["public"]["Enums"]["opportunity_stage"]
          updated_at: string
        }
        Insert: {
          amount?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name: string
          owner_id?: string | null
          probability?: number | null
          product_category?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
        }
        Update: {
          amount?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          name?: string
          owner_id?: string | null
          probability?: number | null
          product_category?: string | null
          stage?: Database["public"]["Enums"]["opportunity_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_stage: Database["public"]["Enums"]["opportunity_stage"] | null
          id: string
          notes: string | null
          opportunity_id: string
          to_stage: Database["public"]["Enums"]["opportunity_stage"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["opportunity_stage"] | null
          id?: string
          notes?: string | null
          opportunity_id: string
          to_stage: Database["public"]["Enums"]["opportunity_stage"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_stage?: Database["public"]["Enums"]["opportunity_stage"] | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          to_stage?: Database["public"]["Enums"]["opportunity_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_stage_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          line_total: number
          order_id: string
          position: number | null
          product_id: string | null
          product_name: string
          quantity: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          line_total?: number
          order_id: string
          position?: number | null
          product_id?: string | null
          product_name: string
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          line_total?: number
          order_id?: string
          position?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          delivered_at: string | null
          discount: number | null
          expected_delivery: string | null
          id: string
          incoterms: string | null
          notes: string | null
          opportunity_id: string | null
          order_date: string | null
          order_number: string
          owner_id: string | null
          paid_amount: number | null
          payment_terms: string | null
          production_progress: number
          production_status: string
          quotation_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivered_at?: string | null
          discount?: number | null
          expected_delivery?: string | null
          id?: string
          incoterms?: string | null
          notes?: string | null
          opportunity_id?: string | null
          order_date?: string | null
          order_number: string
          owner_id?: string | null
          paid_amount?: number | null
          payment_terms?: string | null
          production_progress?: number
          production_status?: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivered_at?: string | null
          discount?: number | null
          expected_delivery?: string | null
          id?: string
          incoterms?: string | null
          notes?: string | null
          opportunity_id?: string | null
          order_date?: string | null
          order_number?: string
          owner_id?: string | null
          paid_amount?: number | null
          payment_terms?: string | null
          production_progress?: number
          production_status?: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          due_date: string | null
          id: string
          method: string | null
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_number: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_number: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_number?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          code: string
          created_at: string
          description: string | null
          label_ar: string
          label_en: string
          module: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          description?: string | null
          label_ar: string
          label_en: string
          module: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          description?: string | null
          label_ar?: string
          label_en?: string
          module?: string
        }
        Relationships: []
      }
      production_stages: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          position: number
          progress_pct: number
          stage_name: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          position?: number
          progress_pct?: number
          stage_name: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          position?: number
          progress_pct?: number
          stage_name?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number | null
          category: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          hs_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_order_qty: number | null
          name_ar: string
          name_en: string | null
          notes: string | null
          sku: string
          stock_qty: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          hs_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_order_qty?: number | null
          name_ar: string
          name_en?: string | null
          notes?: string | null
          sku: string
          stock_qty?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          hs_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_order_qty?: number | null
          name_ar?: string
          name_en?: string | null
          notes?: string | null
          sku?: string
          stock_qty?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
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
      quotation_items: {
        Row: {
          created_at: string
          description: string | null
          discount_pct: number | null
          id: string
          line_total: number
          position: number | null
          product_id: string | null
          product_name: string
          quantity: number
          quotation_id: string
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          id?: string
          line_total?: number
          position?: number | null
          product_id?: string | null
          product_name: string
          quantity?: number
          quotation_id: string
          unit?: string | null
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          id?: string
          line_total?: number
          position?: number | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          quotation_id?: string
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          contact_id: string | null
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          delivery_terms: string | null
          discount: number | null
          id: string
          incoterms: string | null
          notes: string | null
          opportunity_id: string | null
          owner_id: string | null
          parent_quotation_id: string | null
          payment_terms: string | null
          pdf_url: string | null
          quote_number: string
          revision: number
          sent_at: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_terms?: string | null
          discount?: number | null
          id?: string
          incoterms?: string | null
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          quote_number: string
          revision?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          contact_id?: string | null
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          delivery_terms?: string | null
          discount?: number | null
          id?: string
          incoterms?: string | null
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          parent_quotation_id?: string | null
          payment_terms?: string | null
          pdf_url?: string | null
          quote_number?: string
          revision?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_parent_quotation_id_fkey"
            columns: ["parent_quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_code?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      samples: {
        Row: {
          company_id: string | null
          contact_id: string | null
          cost: number | null
          courier: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          feedback_at: string | null
          feedback_notes: string | null
          id: string
          notes: string | null
          opportunity_id: string | null
          owner_id: string | null
          product_name: string
          quantity: number | null
          sample_number: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["sample_status"]
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          cost?: number | null
          courier?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          feedback_at?: string | null
          feedback_notes?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          product_name: string
          quantity?: number | null
          sample_number: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["sample_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          cost?: number | null
          courier?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          feedback_at?: string | null
          feedback_notes?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string | null
          product_name?: string
          quantity?: number | null
          sample_number?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["sample_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "samples_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "samples_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          company_id: string | null
          container_number: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          destination_country: string | null
          destination_port: string | null
          eta: string | null
          freight_cost: number | null
          id: string
          insurance_cost: number | null
          mode: string | null
          notes: string | null
          order_id: string | null
          origin_port: string | null
          owner_id: string | null
          shipment_number: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string | null
          updated_at: string
          volume_cbm: number | null
          weight_kg: number | null
        }
        Insert: {
          carrier?: string | null
          company_id?: string | null
          container_number?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          destination_country?: string | null
          destination_port?: string | null
          eta?: string | null
          freight_cost?: number | null
          id?: string
          insurance_cost?: number | null
          mode?: string | null
          notes?: string | null
          order_id?: string | null
          origin_port?: string | null
          owner_id?: string | null
          shipment_number: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          updated_at?: string
          volume_cbm?: number | null
          weight_kg?: number | null
        }
        Update: {
          carrier?: string | null
          company_id?: string | null
          container_number?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          destination_country?: string | null
          destination_port?: string | null
          eta?: string | null
          freight_cost?: number | null
          id?: string
          insurance_cost?: number | null
          mode?: string | null
          notes?: string | null
          order_id?: string | null
          origin_port?: string | null
          owner_id?: string | null
          shipment_number?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          updated_at?: string
          volume_cbm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          address: string | null
          company_name: string
          company_name_ar: string
          created_at: string
          default_currency: string
          default_language: string
          email: string | null
          id: string
          invoice_footer: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          tax_id: string | null
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          company_name_ar?: string
          created_at?: string
          default_currency?: string
          default_language?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          company_name_ar?: string
          created_at?: string
          default_currency?: string
          default_language?: string
          email?: string | null
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          related_id: string | null
          related_type: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_id?: string | null
          related_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_id?: string | null
          related_type?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
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
      compute_lead_score: {
        Args: { _lead: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: number
      }
      convert_quotation_to_order: {
        Args: { _quotation_id: string }
        Returns: string
      }
      has_permission: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      notify_user: {
        Args: {
          _body?: string
          _entity_id?: string
          _entity_type?: string
          _link?: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      activity_type:
        | "call"
        | "email"
        | "meeting"
        | "whatsapp"
        | "note"
        | "sample"
        | "visit"
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
      doc_type:
        | "commercial_invoice"
        | "packing_list"
        | "bill_of_lading"
        | "certificate_of_origin"
        | "coa"
        | "insurance"
        | "customs"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "nurturing"
        | "proposal"
        | "won"
        | "lost"
      lead_temperature: "hot" | "warm" | "cold"
      opportunity_stage:
        | "new"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
      order_status:
        | "draft"
        | "confirmed"
        | "in_production"
        | "ready"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled"
      payment_status: "pending" | "partial" | "paid" | "overdue" | "refunded"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      sample_status:
        | "requested"
        | "preparing"
        | "shipped"
        | "delivered"
        | "feedback_positive"
        | "feedback_negative"
        | "cancelled"
      shipment_status:
        | "pending"
        | "booked"
        | "in_transit"
        | "delivered"
        | "delayed"
        | "cancelled"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "open" | "in_progress" | "done" | "cancelled"
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
      activity_type: [
        "call",
        "email",
        "meeting",
        "whatsapp",
        "note",
        "sample",
        "visit",
      ],
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
      doc_type: [
        "commercial_invoice",
        "packing_list",
        "bill_of_lading",
        "certificate_of_origin",
        "coa",
        "insurance",
        "customs",
        "other",
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
      opportunity_stage: [
        "new",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
      ],
      order_status: [
        "draft",
        "confirmed",
        "in_production",
        "ready",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
      ],
      payment_status: ["pending", "partial", "paid", "overdue", "refunded"],
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      sample_status: [
        "requested",
        "preparing",
        "shipped",
        "delivered",
        "feedback_positive",
        "feedback_negative",
        "cancelled",
      ],
      shipment_status: [
        "pending",
        "booked",
        "in_transit",
        "delivered",
        "delayed",
        "cancelled",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["open", "in_progress", "done", "cancelled"],
    },
  },
} as const

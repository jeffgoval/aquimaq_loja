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
      alerts: {
        Row: {
          created_at: string
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          impact: string | null
          origin: string
          priority: string
          reason: string
          resolved_at: string | null
          responsible_user_id: string | null
          status: string
          suggested_action: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          impact?: string | null
          origin?: string
          priority: string
          reason: string
          resolved_at?: string | null
          responsible_user_id?: string | null
          status?: string
          suggested_action?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          impact?: string | null
          origin?: string
          priority?: string
          reason?: string
          resolved_at?: string | null
          responsible_user_id?: string | null
          status?: string
          suggested_action?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      /** Fase 1 — após `supabase db push`, rode `npm run types:gen` para alinhar com o remoto. */
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_row: Json | null
          old_row: Json | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_row?: Json | null
          old_row?: Json | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_row?: Json | null
          old_row?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      erp_customers: {
        Row: {
          city: string | null
          document: string | null
          email: string | null
          erp_code: string
          id: string
          imported_at: string
          is_active: boolean
          name: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          document?: string | null
          email?: string | null
          erp_code: string
          id?: string
          imported_at?: string
          is_active?: boolean
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          document?: string | null
          email?: string | null
          erp_code?: string
          id?: string
          imported_at?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      erp_inventory: {
        Row: {
          id: string
          imported_at: string
          last_movement: string | null
          location: string | null
          product_code: string
          quantity: number
          reserved: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          imported_at?: string
          last_movement?: string | null
          location?: string | null
          product_code: string
          quantity?: number
          reserved?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          imported_at?: string
          last_movement?: string | null
          location?: string | null
          product_code?: string
          quantity?: number
          reserved?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      erp_products: {
        Row: {
          abc_class: string | null
          barcode: string | null
          brand: string | null
          commercial_priority: string | null
          cost: number | null
          coverage_days: number | null
          description: string
          erp_code: string
          fiscal_stock: number | null
          giro_status: string | null
          id: string
          imported_at: string
          is_active: boolean
          margin_pct: number | null
          min_stock: number | null
          min_stock_intelligent: number | null
          profit_amount: number | null
          qty_sold: number | null
          raw_category: string | null
          revenue_amount: number | null
          sale_price: number | null
          stock_class: string | null
          stock_quantity: number | null
          stock_rank: number | null
          stock_value: number | null
          supplier_name: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          abc_class?: string | null
          barcode?: string | null
          brand?: string | null
          commercial_priority?: string | null
          cost?: number | null
          coverage_days?: number | null
          description: string
          erp_code: string
          fiscal_stock?: number | null
          giro_status?: string | null
          id?: string
          imported_at?: string
          is_active?: boolean
          margin_pct?: number | null
          min_stock?: number | null
          min_stock_intelligent?: number | null
          profit_amount?: number | null
          qty_sold?: number | null
          raw_category?: string | null
          revenue_amount?: number | null
          sale_price?: number | null
          stock_class?: string | null
          stock_quantity?: number | null
          stock_rank?: number | null
          stock_value?: number | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          abc_class?: string | null
          barcode?: string | null
          brand?: string | null
          commercial_priority?: string | null
          cost?: number | null
          coverage_days?: number | null
          description?: string
          erp_code?: string
          fiscal_stock?: number | null
          giro_status?: string | null
          id?: string
          imported_at?: string
          is_active?: boolean
          margin_pct?: number | null
          min_stock?: number | null
          min_stock_intelligent?: number | null
          profit_amount?: number | null
          qty_sold?: number | null
          raw_category?: string | null
          revenue_amount?: number | null
          sale_price?: number | null
          stock_class?: string | null
          stock_quantity?: number | null
          stock_rank?: number | null
          stock_value?: number | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      erp_sale_items: {
        Row: {
          discount: number | null
          id: string
          imported_at: string
          product_code: string
          quantity: number
          sale_code: string
          total_amount: number | null
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          discount?: number | null
          id?: string
          imported_at?: string
          product_code: string
          quantity: number
          sale_code: string
          total_amount?: number | null
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          discount?: number | null
          id?: string
          imported_at?: string
          product_code?: string
          quantity?: number
          sale_code?: string
          total_amount?: number | null
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "erp_sale_items_sale_code_fkey"
            columns: ["sale_code"]
            isOneToOne: false
            referencedRelation: "erp_sales"
            referencedColumns: ["erp_code"]
          },
        ]
      }
      erp_sales: {
        Row: {
          channel: string | null
          customer_code: string | null
          discount: number | null
          erp_code: string
          id: string
          imported_at: string
          is_cancelled: boolean
          payment_type: string | null
          sale_date: string
          seller_name: string | null
          total_amount: number | null
        }
        Insert: {
          channel?: string | null
          customer_code?: string | null
          discount?: number | null
          erp_code: string
          id?: string
          imported_at?: string
          is_cancelled?: boolean
          payment_type?: string | null
          sale_date: string
          seller_name?: string | null
          total_amount?: number | null
        }
        Update: {
          channel?: string | null
          customer_code?: string | null
          discount?: number | null
          erp_code?: string
          id?: string
          imported_at?: string
          is_cancelled?: boolean
          payment_type?: string | null
          sale_date?: string
          seller_name?: string | null
          total_amount?: number | null
        }
        Relationships: []
      }
      erp_suppliers: {
        Row: {
          document: string | null
          email: string | null
          erp_code: string
          id: string
          imported_at: string
          is_active: boolean
          lead_time_days: number
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          document?: string | null
          email?: string | null
          erp_code: string
          id?: string
          imported_at?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          document?: string | null
          email?: string | null
          erp_code?: string
          id?: string
          imported_at?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gestao_import_snapshots: {
        Row: {
          captured_at: string
          entity: string
          id: string
          import_job_id: string
          job_finished_at: string | null
          product_count: number
          rupture_count: number
          source_filename: string | null
          sum_profit: number
          sum_qty_sold: number
          sum_revenue: number
          sum_stock_value: number
        }
        Insert: {
          captured_at?: string
          entity: string
          id?: string
          import_job_id: string
          job_finished_at?: string | null
          product_count?: number
          rupture_count?: number
          source_filename?: string | null
          sum_profit?: number
          sum_qty_sold?: number
          sum_revenue?: number
          sum_stock_value?: number
        }
        Update: {
          captured_at?: string
          entity?: string
          id?: string
          import_job_id?: string
          job_finished_at?: string | null
          product_count?: number
          rupture_count?: number
          source_filename?: string | null
          sum_profit?: number
          sum_qty_sold?: number
          sum_revenue?: number
          sum_stock_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "gestao_import_snapshots_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: true
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          created_at: string
          error_msg: string
          id: string
          job_id: string
          raw_data: Json | null
          row_number: number | null
        }
        Insert: {
          created_at?: string
          error_msg: string
          id?: string
          job_id: string
          raw_data?: Json | null
          row_number?: number | null
        }
        Update: {
          created_at?: string
          error_msg?: string
          id?: string
          job_id?: string
          raw_data?: Json | null
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          entity: string
          error_rows: number | null
          filename: string | null
          finished_at: string | null
          id: string
          inserted_rows: number | null
          skipped_rows: number | null
          source: string
          started_at: string | null
          status: string
          total_rows: number | null
          triggered_by: string | null
          updated_rows: number | null
        }
        Insert: {
          created_at?: string
          entity: string
          error_rows?: number | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          inserted_rows?: number | null
          skipped_rows?: number | null
          source: string
          started_at?: string | null
          status?: string
          total_rows?: number | null
          triggered_by?: string | null
          updated_rows?: number | null
        }
        Update: {
          created_at?: string
          entity?: string
          error_rows?: number | null
          filename?: string | null
          finished_at?: string | null
          id?: string
          inserted_rows?: number | null
          skipped_rows?: number | null
          source?: string
          started_at?: string | null
          status?: string
          total_rows?: number | null
          triggered_by?: string | null
          updated_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      management_products: {
        Row: {
          abc_class: string | null
          erp_product_id: string
          id: string
          location: string | null
          management_category: string | null
          margin_minimum: number | null
          max_stock: number | null
          min_stock: number | null
          notes: string | null
          responsible_user_id: string | null
          result_center: string | null
          status: string
          updated_at: string
        }
        Insert: {
          abc_class?: string | null
          erp_product_id: string
          id?: string
          location?: string | null
          management_category?: string | null
          margin_minimum?: number | null
          max_stock?: number | null
          min_stock?: number | null
          notes?: string | null
          responsible_user_id?: string | null
          result_center?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          abc_class?: string | null
          erp_product_id?: string
          id?: string
          location?: string | null
          management_category?: string | null
          margin_minimum?: number | null
          max_stock?: number | null
          min_stock?: number | null
          notes?: string | null
          responsible_user_id?: string | null
          result_center?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_products_erp_product_id_fkey"
            columns: ["erp_product_id"]
            isOneToOne: true
            referencedRelation: "erp_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "management_products_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      management_rules: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "management_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string
          full_name: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          full_name: string
          id: string
          is_active?: boolean
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          full_name?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      result_centers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      seasonal_factors: {
        Row: {
          category: string
          created_at: string
          factor: number
          id: string
          month: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          factor?: number
          id?: string
          month: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          factor?: number
          id?: string
          month?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_permission_overrides: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          allowed: boolean
          created_at?: string
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_actions: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          origin: string
          priority: string
          related_alert_id: string | null
          related_indicator: string | null
          responsible_user_id: string
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          origin: string
          priority: string
          related_alert_id?: string | null
          related_indicator?: string | null
          responsible_user_id: string
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          origin?: string
          priority?: string
          related_alert_id?: string | null
          related_indicator?: string | null
          responsible_user_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_actions_related_alert_id_fkey"
            columns: ["related_alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_actions_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_meetings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          meeting_date: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_product_alerts: { Args: never; Returns: number }
      get_purchase_suggestions: {
        Args: { p_priority_filter?: string }
        Returns: {
          abc_class: string
          commercial_priority: string
          coverage_days: number
          description: string
          erp_code: string
          giro_status: string
          min_stock: number
          raw_category: string
          short_qty: number
          stock_quantity: number
          stock_value: number
          unit_cost: number
          urgency: string
        }[]
      }
      has_role: { Args: { p_roles: string[] }; Returns: boolean }
      is_admin_or_gestor: { Args: never; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      record_gestao_import_snapshot: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      sales_period_by_category: {
        Args: { p_end: string; p_start: string }
        Returns: {
          line_count: number
          margin: number
          qty: number
          raw_category: string
          revenue: number
        }[]
      }
      sales_period_metrics: {
        Args: { p_end: string; p_start: string }
        Returns: {
          line_count: number
          margin: number
          qty: number
          revenue: number
          sale_count: number
        }[]
      }
      sales_top_skus_in_period:
        | {
            Args: { p_end: string; p_limit: number; p_start: string }
            Returns: {
              description: string
              margin: number
              product_code: string
              qty: number
              raw_category: string
              revenue: number
            }[]
          }
        | {
            Args: {
              p_end: string
              p_limit?: number
              p_order?: string
              p_start: string
            }
            Returns: {
              description: string
              margin: number
              product_code: string
              qty: number
              raw_category: string
              revenue: number
            }[]
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

/** Canonical role vocabulary (mirrors profiles.role CHECK constraint). */
export const ROLES = [
  'admin',
  'gestor',
  'cadastro',
  'compras',
  'estoque',
  'recebimento',
  'oficina',
  'financeiro',
  'consulta',
] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  cadastro: 'Cadastro',
  compras: 'Compras',
  estoque: 'Estoque',
  recebimento: 'Recebimento',
  oficina: 'Oficina',
  financeiro: 'Financeiro',
  consulta: 'Consulta',
}

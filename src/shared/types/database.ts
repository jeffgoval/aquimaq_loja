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
      improvements: {
        Row: {
          act_notes: string | null
          check_notes: string | null
          created_at: string
          do_notes: string | null
          id: string
          owner_id: string
          plan_notes: string | null
          problem_statement: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          act_notes?: string | null
          check_notes?: string | null
          created_at?: string
          do_notes?: string | null
          id?: string
          owner_id: string
          plan_notes?: string | null
          problem_statement?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          act_notes?: string | null
          check_notes?: string | null
          created_at?: string
          do_notes?: string | null
          id?: string
          owner_id?: string
          plan_notes?: string | null
          problem_statement?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'improvements_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      management_sales_import_batches: {
        Row: {
          committed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          row_count: number
          source_filename: string | null
          status: string
          updated_at: string
        }
        Insert: {
          committed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          row_count?: number
          source_filename?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          committed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          row_count?: number
          source_filename?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'management_sales_import_batches_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      management_sales_import_rows: {
        Row: {
          batch_id: string
          channel: string | null
          created_at: string
          customer_code: string | null
          discount: number | null
          id: string
          is_cancelled: boolean
          line_total: number | null
          payment_type: string | null
          product_code: string
          quantity: number
          row_no: number
          sale_code: string
          sale_date: string
          seller_name: string | null
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          batch_id: string
          channel?: string | null
          created_at?: string
          customer_code?: string | null
          discount?: number | null
          id?: string
          is_cancelled?: boolean
          line_total?: number | null
          payment_type?: string | null
          product_code: string
          quantity: number
          row_no: number
          sale_code: string
          sale_date: string
          seller_name?: string | null
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          batch_id?: string
          channel?: string | null
          created_at?: string
          customer_code?: string | null
          discount?: number | null
          id?: string
          is_cancelled?: boolean
          line_total?: number | null
          payment_type?: string | null
          product_code?: string
          quantity?: number
          row_no?: number
          sale_code?: string
          sale_date?: string
          seller_name?: string | null
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: 'management_sales_import_rows_batch_id_fkey'
            columns: ['batch_id']
            isOneToOne: false
            referencedRelation: 'management_sales_import_batches'
            referencedColumns: ['id']
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
      product_cost_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_cost: number | null
          previous_cost: number | null
          product_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_cost?: number | null
          previous_cost?: number | null
          product_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_cost?: number | null
          previous_cost?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_cost_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_cost_history_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_price_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_cost_snapshot: number | null
          new_margin_pct: number | null
          new_price: number | null
          previous_cost_snapshot: number | null
          previous_margin_pct: number | null
          previous_price: number | null
          product_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_cost_snapshot?: number | null
          new_margin_pct?: number | null
          new_price?: number | null
          previous_cost_snapshot?: number | null
          previous_margin_pct?: number | null
          previous_price?: number | null
          product_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_cost_snapshot?: number | null
          new_margin_pct?: number | null
          new_price?: number | null
          previous_cost_snapshot?: number | null
          previous_margin_pct?: number | null
          previous_price?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_price_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_price_history_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_quoted_cost_history: {
        Row: {
          id: string
          product_id: string
          supplier_id: string
          unit_price: number
          quantity: number | null
          purchase_quote_id: string | null
          purchase_suggestion_id: string | null
          recorded_at: string
          recorded_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          supplier_id: string
          unit_price: number
          quantity?: number | null
          purchase_quote_id?: string | null
          purchase_suggestion_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          supplier_id?: string
          unit_price?: number
          quantity?: number | null
          purchase_quote_id?: string | null
          purchase_suggestion_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'product_quoted_cost_history_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_quoted_cost_history_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_quoted_cost_history_purchase_quote_id_fkey'
            columns: ['purchase_quote_id']
            isOneToOne: false
            referencedRelation: 'purchase_quotes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_quoted_cost_history_purchase_suggestion_id_fkey'
            columns: ['purchase_suggestion_id']
            isOneToOne: false
            referencedRelation: 'purchase_suggestions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_quoted_cost_history_recorded_by_fkey'
            columns: ['recorded_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      product_score_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_score: number | null
          pendencies_snapshot: string[] | null
          previous_score: number | null
          product_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_score?: number | null
          pendencies_snapshot?: string[] | null
          previous_score?: number | null
          product_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_score?: number | null
          pendencies_snapshot?: string[] | null
          previous_score?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_score_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_score_history_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string
          is_alternate: boolean
          product_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string
          is_alternate?: boolean
          product_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string
          is_alternate?: boolean
          product_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_suppliers_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_suppliers_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
        ]
      }
      product_stock_balances: {
        Row: {
          product_id: string
          quantity: number
          stock_location_id: string
          stock_type_id: string
          updated_at: string
        }
        Insert: {
          product_id: string
          quantity?: number
          stock_location_id: string
          stock_type_id: string
          updated_at?: string
        }
        Update: {
          product_id?: string
          quantity?: number
          stock_location_id?: string
          stock_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_stock_balances_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_stock_balances_stock_location_id_fkey'
            columns: ['stock_location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_stock_balances_stock_type_id_fkey'
            columns: ['stock_type_id']
            isOneToOne: false
            referencedRelation: 'stock_types'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          abc_class: string | null
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          default_location: string | null
          description: string
          erp_code: string | null
          erp_product_id: string | null
          factory_code: string | null
          id: string
          internal_code: string
          is_active: boolean
          is_new_standard: boolean
          last_reviewed_at: string | null
          management_cost: number | null
          management_price: number | null
          margin_minimum_pct: number | null
          margin_target_pct: number | null
          max_discount_pct: number | null
          max_stock: number | null
          min_stock: number | null
          notes: string | null
          pendencies: string[]
          primary_supplier_id: string | null
          registration_score: number
          registration_status: string
          responsible_user_id: string | null
          result_center_id: string | null
          subcategory_id: string | null
          unit_conversion_factor: number
          unit_purchase_id: string | null
          unit_sale_id: string | null
          updated_at: string
        }
        Insert: {
          abc_class?: string | null
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          default_location?: string | null
          description: string
          erp_code?: string | null
          erp_product_id?: string | null
          factory_code?: string | null
          id?: string
          internal_code: string
          is_active?: boolean
          is_new_standard?: boolean
          last_reviewed_at?: string | null
          management_cost?: number | null
          management_price?: number | null
          margin_minimum_pct?: number | null
          margin_target_pct?: number | null
          max_discount_pct?: number | null
          max_stock?: number | null
          min_stock?: number | null
          notes?: string | null
          pendencies?: string[]
          primary_supplier_id?: string | null
          registration_score?: number
          registration_status?: string
          responsible_user_id?: string | null
          result_center_id?: string | null
          subcategory_id?: string | null
          unit_conversion_factor?: number
          unit_purchase_id?: string | null
          unit_sale_id?: string | null
          updated_at?: string
        }
        Update: {
          abc_class?: string | null
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          default_location?: string | null
          description?: string
          erp_code?: string | null
          erp_product_id?: string | null
          factory_code?: string | null
          id?: string
          internal_code?: string
          is_active?: boolean
          is_new_standard?: boolean
          last_reviewed_at?: string | null
          management_cost?: number | null
          management_price?: number | null
          margin_minimum_pct?: number | null
          margin_target_pct?: number | null
          max_discount_pct?: number | null
          max_stock?: number | null
          min_stock?: number | null
          notes?: string | null
          pendencies?: string[]
          primary_supplier_id?: string | null
          registration_score?: number
          registration_status?: string
          responsible_user_id?: string | null
          result_center_id?: string | null
          subcategory_id?: string | null
          unit_conversion_factor?: number
          unit_purchase_id?: string | null
          unit_sale_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_erp_product_id_fkey'
            columns: ['erp_product_id']
            isOneToOne: false
            referencedRelation: 'erp_products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_primary_supplier_id_fkey'
            columns: ['primary_supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_result_center_id_fkey'
            columns: ['result_center_id']
            isOneToOne: false
            referencedRelation: 'result_centers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_subcategory_id_fkey'
            columns: ['subcategory_id']
            isOneToOne: false
            referencedRelation: 'subcategories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_unit_purchase_id_fkey'
            columns: ['unit_purchase_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_unit_sale_id_fkey'
            columns: ['unit_sale_id']
            isOneToOne: false
            referencedRelation: 'units'
            referencedColumns: ['id']
          },
        ]
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
      purchase_quotes: {
        Row: {
          id: string
          suggestion_id: string
          supplier_id: string
          quantity: number
          unit_price: number
          lead_time_days: number | null
          payment_terms: string | null
          notes: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          suggestion_id: string
          supplier_id: string
          quantity: number
          unit_price: number
          lead_time_days?: number | null
          payment_terms?: string | null
          notes?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          suggestion_id?: string
          supplier_id?: string
          quantity?: number
          unit_price?: number
          lead_time_days?: number | null
          payment_terms?: string | null
          notes?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_quotes_suggestion_id_fkey'
            columns: ['suggestion_id']
            isOneToOne: false
            referencedRelation: 'purchase_suggestions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_quotes_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_quotes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      purchase_suggestions: {
        Row: {
          id: string
          product_id: string
          quantity_suggested: number
          gerencial_qty_snapshot: number
          min_stock_snapshot: number | null
          priority: string
          origin: string
          source_alert_id: string | null
          status: string
          responsible_user_id: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          approved_by: string | null
          approved_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity_suggested: number
          gerencial_qty_snapshot?: number
          min_stock_snapshot?: number | null
          priority?: string
          origin?: string
          source_alert_id?: string | null
          status?: string
          responsible_user_id: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity_suggested?: number
          gerencial_qty_snapshot?: number
          min_stock_snapshot?: number | null
          priority?: string
          origin?: string
          source_alert_id?: string | null
          status?: string
          responsible_user_id?: string
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'purchase_suggestions_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_suggestions_source_alert_id_fkey'
            columns: ['source_alert_id']
            isOneToOne: false
            referencedRelation: 'alerts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_suggestions_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_suggestions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'purchase_suggestions_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      receipt_items: {
        Row: {
          id: string
          receipt_id: string
          product_id: string
          expected_qty: number | null
          received_qty: number
          unit_cost_expected: number | null
          unit_cost_received: number
          batch_code: string | null
          expiry_date: string | null
          damage_notes: string | null
          divergence_notes: string | null
          divergence_resolved: boolean
          chk_product: boolean
          chk_qty: boolean
          chk_unit: boolean
          chk_cost: boolean
          chk_batch_expiry: boolean
          chk_damage: boolean
          chk_divergence: boolean
          chk_location: boolean
          stock_location_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          receipt_id: string
          product_id: string
          expected_qty?: number | null
          received_qty?: number
          unit_cost_expected?: number | null
          unit_cost_received?: number
          batch_code?: string | null
          expiry_date?: string | null
          damage_notes?: string | null
          divergence_notes?: string | null
          divergence_resolved?: boolean
          chk_product?: boolean
          chk_qty?: boolean
          chk_unit?: boolean
          chk_cost?: boolean
          chk_batch_expiry?: boolean
          chk_damage?: boolean
          chk_divergence?: boolean
          chk_location?: boolean
          stock_location_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          receipt_id?: string
          product_id?: string
          expected_qty?: number | null
          received_qty?: number
          unit_cost_expected?: number | null
          unit_cost_received?: number
          batch_code?: string | null
          expiry_date?: string | null
          damage_notes?: string | null
          divergence_notes?: string | null
          divergence_resolved?: boolean
          chk_product?: boolean
          chk_qty?: boolean
          chk_unit?: boolean
          chk_cost?: boolean
          chk_batch_expiry?: boolean
          chk_damage?: boolean
          chk_divergence?: boolean
          chk_location?: boolean
          stock_location_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receipt_items_receipt_id_fkey'
            columns: ['receipt_id']
            isOneToOne: false
            referencedRelation: 'receipts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipt_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipt_items_stock_location_id_fkey'
            columns: ['stock_location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
        ]
      }
      receipts: {
        Row: {
          id: string
          supplier_id: string
          purchase_suggestion_id: string | null
          invoice_ref: string | null
          arrived_at: string
          responsible_user_id: string
          status: string
          chk_supplier: boolean
          chk_invoice: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          purchase_suggestion_id?: string | null
          invoice_ref?: string | null
          arrived_at?: string
          responsible_user_id: string
          status?: string
          chk_supplier?: boolean
          chk_invoice?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          purchase_suggestion_id?: string | null
          invoice_ref?: string | null
          arrived_at?: string
          responsible_user_id?: string
          status?: string
          chk_supplier?: boolean
          chk_invoice?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receipts_supplier_id_fkey'
            columns: ['supplier_id']
            isOneToOne: false
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_purchase_suggestion_id_fkey'
            columns: ['purchase_suggestion_id']
            isOneToOne: false
            referencedRelation: 'purchase_suggestions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'receipts_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
      stock_locations: {
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
      stock_movements: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string | null
          delta_qty: number
          id: string
          justification: string
          movement_kind: string
          product_id: string
          stock_location_id: string
          stock_type_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by?: string | null
          delta_qty: number
          id?: string
          justification: string
          movement_kind?: string
          product_id: string
          stock_location_id: string
          stock_type_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string | null
          delta_qty?: number
          id?: string
          justification?: string
          movement_kind?: string
          product_id?: string
          stock_location_id?: string
          stock_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stock_movements_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_stock_location_id_fkey'
            columns: ['stock_location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'stock_movements_stock_type_id_fkey'
            columns: ['stock_type_id']
            isOneToOne: false
            referencedRelation: 'stock_types'
            referencedColumns: ['id']
          },
        ]
      }
      stock_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          entity_id: string | null
          entity_type: string | null
          id: string
          module: string | null
          notes: string | null
          origin: string
          priority: string
          responsible_user_id: string
          source_key: string | null
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module?: string | null
          notes?: string | null
          origin?: string
          priority?: string
          responsible_user_id: string
          source_key?: string | null
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module?: string | null
          notes?: string | null
          origin?: string
          priority?: string
          responsible_user_id?: string
          source_key?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
      work_order_items: {
        Row: {
          id: string
          work_order_id: string
          product_id: string
          quantity: number
          stock_location_id: string
          stock_consumed: boolean
          consumed_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          product_id: string
          quantity: number
          stock_location_id: string
          stock_consumed?: boolean
          consumed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          product_id?: string
          quantity?: number
          stock_location_id?: string
          stock_consumed?: boolean
          consumed_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'work_order_items_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_order_items_stock_location_id_fkey'
            columns: ['stock_location_id']
            isOneToOne: false
            referencedRelation: 'stock_locations'
            referencedColumns: ['id']
          },
        ]
      }
      work_order_photos: {
        Row: {
          id: string
          work_order_id: string
          storage_path: string
          caption: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          storage_path: string
          caption?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          storage_path?: string
          caption?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'work_order_photos_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_order_photos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      work_order_status_history: {
        Row: {
          id: string
          work_order_id: string
          from_status: string | null
          to_status: string
          note: string | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          from_status?: string | null
          to_status: string
          note?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          from_status?: string | null
          to_status?: string
          note?: string | null
          changed_by?: string | null
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'work_order_status_history_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_order_status_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      work_order_warranties: {
        Row: {
          id: string
          work_order_id: string
          warranty_end_date: string | null
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          warranty_end_date?: string | null
          notes: string
          created_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          warranty_end_date?: string | null
          notes?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'work_order_warranties_work_order_id_fkey'
            columns: ['work_order_id']
            isOneToOne: false
            referencedRelation: 'work_orders'
            referencedColumns: ['id']
          },
        ]
      }
      work_orders: {
        Row: {
          id: string
          internal_code: string
          equipment_label: string
          defect_description: string | null
          diagnosis: string | null
          technician_id: string | null
          responsible_user_id: string
          customer_name: string | null
          status: string
          priority: string
          opened_at: string
          last_activity_at: string
          closed_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          internal_code?: string
          equipment_label: string
          defect_description?: string | null
          diagnosis?: string | null
          technician_id?: string | null
          responsible_user_id: string
          customer_name?: string | null
          status?: string
          priority?: string
          opened_at?: string
          last_activity_at?: string
          closed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          internal_code?: string
          equipment_label?: string
          defect_description?: string | null
          diagnosis?: string | null
          technician_id?: string | null
          responsible_user_id?: string
          customer_name?: string | null
          status?: string
          priority?: string
          opened_at?: string
          last_activity_at?: string
          closed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'work_orders_technician_id_fkey'
            columns: ['technician_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_orders_responsible_user_id_fkey'
            columns: ['responsible_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'work_orders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
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
          related_task_id: string | null
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
          related_task_id?: string | null
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
          related_task_id?: string | null
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
          {
            foreignKeyName: 'weekly_actions_related_task_id_fkey'
            columns: ['related_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
        ]
      }
      weekly_routine_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          related_task_id: string | null
          template_id: string | null
          title: string
          updated_at: string
          week_start_monday: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          related_task_id?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          week_start_monday: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          related_task_id?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          week_start_monday?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weekly_routine_logs_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weekly_routine_logs_related_task_id_fkey'
            columns: ['related_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'weekly_routine_logs_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'weekly_routine_templates'
            referencedColumns: ['id']
          },
        ]
      }
      weekly_routine_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          weekday: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: []
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
      can_approve_purchases: { Args: never; Returns: boolean }
      can_manage_inventory: { Args: never; Returns: boolean }
      can_manage_management_panel: { Args: never; Returns: boolean }
      can_manage_product_catalog: { Args: never; Returns: boolean }
      can_manage_purchases: { Args: never; Returns: boolean }
      can_manage_receiving: { Args: never; Returns: boolean }
      can_manage_weekly_and_improvements: { Args: never; Returns: boolean }
      can_manage_workshop: { Args: never; Returns: boolean }
      dashboard_new_standard_pct: { Args: never; Returns: number }
      /** Linha `products` (trigger); uso típico só no SQL. */
      eval_product_registration: {
        Args: { p: Record<string, unknown> }
        Returns: { pendencies: string[]; score: number }[]
      }
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
      purchase_suggestion_approve: {
        Args: { p_quote_id: string; p_suggestion_id: string }
        Returns: undefined
      }
      purchase_suggestion_request_approval: {
        Args: { p_suggestion_id: string }
        Returns: undefined
      }
      purchase_sync_suggestions_from_min_stock: { Args: never; Returns: number }
      receipt_release_for_sale: { Args: { p_receipt_id: string }; Returns: undefined }
      workshop_consume_part_stock: {
        Args: { p_item_id: string; p_justification: string }
        Returns: number
      }
      workshop_sync_stalled_os_alerts: { Args: { p_days?: number }; Returns: number }
      is_current_user_admin: { Args: never; Returns: boolean }
      management_commit_sales_import: { Args: { p_batch_id: string }; Returns: Json }
      management_dre_basic: {
        Args: { p_end: string; p_result_center_id?: string | null; p_start: string }
        Returns: {
          amount: number
          code: string
          label: string
          sort_order: number
        }[]
      }
      management_margin_breakdown: {
        Args: { p_dimension: string; p_end: string; p_start: string }
        Returns: {
          dimension_key: string
          dimension_label: string
          line_count: number
          margin_value: number
          qty: number
          revenue: number
        }[]
      }
      management_sync_margin_alerts: { Args: { p_end: string; p_start: string }; Returns: number }
      record_gestao_import_snapshot: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      stock_apply_movement: {
        Args: {
          p_delta: number
          p_justification: string
          p_kind?: string
          p_product_id: string
          p_stock_location_id: string
          p_stock_type_id: string
        }
        Returns: number
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

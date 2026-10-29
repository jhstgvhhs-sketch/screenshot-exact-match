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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string
          district: string
          id: string
          label: string | null
          number: string
          state: string
          street: string
          user_id: string
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          district: string
          id?: string
          label?: string | null
          number: string
          state: string
          street: string
          user_id: string
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          district?: string
          id?: string
          label?: string | null
          number?: string
          state?: string
          street?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_preferences: {
        Row: {
          id: string
          low_stock_limit: number
        }
        Insert: {
          id: string
          low_stock_limit?: number
        }
        Update: {
          id?: string
          low_stock_limit?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          description: string | null
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          amount_off: number | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          percent_off: number | null
        }
        Insert: {
          active?: boolean
          amount_off?: number | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          percent_off?: number | null
        }
        Update: {
          active?: boolean
          amount_off?: number | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          percent_off?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string
          id: string
          material_snapshot: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          reserved_stock: number | null
          sku: string
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          color: string
          id?: string
          material_snapshot?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          reserved_stock?: number | null
          sku: string
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          color?: string
          id?: string
          material_snapshot?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          reserved_stock?: number | null
          sku?: string
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          archived_at: string | null
          coupon_code: string | null
          created_at: string
          customer_cpf: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          discount: number
          gift_items: Json
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          ship_cep: string
          ship_city: string
          ship_complement: string | null
          ship_district: string
          ship_number: string
          ship_state: string
          ship_street: string
          shipping: number
          status: string
          subtotal: number
          total: number
          tracking_carrier: string | null
          tracking_code: string | null
          tracking_url: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          discount?: number
          gift_items?: Json
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          ship_cep: string
          ship_city: string
          ship_complement?: string | null
          ship_district: string
          ship_number: string
          ship_state: string
          ship_street: string
          shipping: number
          status?: string
          subtotal: number
          total: number
          tracking_carrier?: string | null
          tracking_code?: string | null
          tracking_url?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount?: number
          gift_items?: Json
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          ship_cep?: string
          ship_city?: string
          ship_complement?: string | null
          ship_district?: string
          ship_number?: string
          ship_state?: string
          ship_street?: string
          shipping?: number
          status?: string
          subtotal?: number
          total?: number
          tracking_carrier?: string | null
          tracking_code?: string | null
          tracking_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_gateway_settings: {
        Row: {
          environment: string
          id: string
          pix_enabled: boolean
          provider: string
          updated_at: string
        }
        Insert: {
          environment?: string
          id?: string
          pix_enabled?: boolean
          provider?: string
          updated_at?: string
        }
        Update: {
          environment?: string
          id?: string
          pix_enabled?: boolean
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      pix_transactions: {
        Row: {
          amount_cents: number
          copy_paste: string | null
          created_at: string
          order_id: string
          qr_code_base64: string | null
          status: string
          transaction_id: string
        }
        Insert: {
          amount_cents: number
          copy_paste?: string | null
          created_at?: string
          order_id: string
          qr_code_base64?: string | null
          status?: string
          transaction_id: string
        }
        Update: {
          amount_cents?: number
          copy_paste?: string | null
          created_at?: string
          order_id?: string
          qr_code_base64?: string | null
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          approved: boolean
          author_name: string
          comment: string
          created_at: string
          id: string
          product_id: string | null
          rating: number
          source: string
        }
        Insert: {
          approved?: boolean
          author_name: string
          comment: string
          created_at?: string
          id?: string
          product_id?: string | null
          rating: number
          source?: string
        }
        Update: {
          approved?: boolean
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          color_hex: string | null
          id: string
          product_id: string
          sku: string
          sort: number
          stock: number
        }
        Insert: {
          color: string
          color_hex?: string | null
          id?: string
          product_id: string
          sku: string
          sort?: number
          stock?: number
        }
        Update: {
          color?: string
          color_hex?: string | null
          id?: string
          product_id?: string
          sku?: string
          sort?: number
          stock?: number
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
          active: boolean
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          diameter: string | null
          featured: boolean
          id: string
          images: string[]
          material: string | null
          name: string
          price: number
          slug: string
          weight: string | null
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          diameter?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          material?: string | null
          name: string
          price: number
          slug: string
          weight?: string | null
        }
        Update: {
          active?: boolean
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          diameter?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          material?: string | null
          name?: string
          price?: number
          slug?: string
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      purchase_notification_settings: {
        Row: {
          display_seconds: number
          enabled: boolean
          id: string
          interval_seconds: number
          messages: Json
          title: string
          updated_at: string
        }
        Insert: {
          display_seconds?: number
          enabled?: boolean
          id?: string
          interval_seconds?: number
          messages?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          display_seconds?: number
          enabled?: boolean
          id?: string
          interval_seconds?: number
          messages?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      recovery_attempts: {
        Row: {
          cart_id: string
          channel: string
          created_at: string
          http_status: number | null
          id: number
          job_id: string | null
          result_code: string
        }
        Insert: {
          cart_id: string
          channel: string
          created_at?: string
          http_status?: number | null
          id?: never
          job_id?: string | null
          result_code: string
        }
        Update: {
          cart_id?: string
          channel?: string
          created_at?: string
          http_status?: number | null
          id?: never
          job_id?: string | null
          result_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_attempts_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "recovery_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "recovery_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_carts: {
        Row: {
          abandoned_at: string | null
          created_at: string
          customer_name: string
          email: string
          email_consent: boolean
          estimated_value: number
          expires_at: string
          id: string
          items: Json
          last_activity_at: string
          linked_order_id: string | null
          owner_id: string | null
          parent_id: string | null
          phone: string
          recovered_at: string | null
          recovered_order_id: string | null
          recovered_value: number
          sequence_cancelled: boolean
          session_hash: string
          status: string
          whatsapp_consent: boolean
        }
        Insert: {
          abandoned_at?: string | null
          created_at?: string
          customer_name?: string
          email?: string
          email_consent?: boolean
          estimated_value?: number
          expires_at?: string
          id?: string
          items?: Json
          last_activity_at?: string
          linked_order_id?: string | null
          owner_id?: string | null
          parent_id?: string | null
          phone?: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          recovered_value?: number
          sequence_cancelled?: boolean
          session_hash: string
          status?: string
          whatsapp_consent?: boolean
        }
        Update: {
          abandoned_at?: string | null
          created_at?: string
          customer_name?: string
          email?: string
          email_consent?: boolean
          estimated_value?: number
          expires_at?: string
          id?: string
          items?: Json
          last_activity_at?: string
          linked_order_id?: string | null
          owner_id?: string | null
          parent_id?: string | null
          phone?: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          recovered_value?: number
          sequence_cancelled?: boolean
          session_hash?: string
          status?: string
          whatsapp_consent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recovery_carts_linked_order_id_fkey"
            columns: ["linked_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_carts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_carts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "recovery_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_carts_recovered_order_id_fkey"
            columns: ["recovered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_consents: {
        Row: {
          cart_id: string
          channel: string
          contact_hash: string
          created_at: string
          granted: boolean
          id: number
          purpose: string
          version: string
        }
        Insert: {
          cart_id: string
          channel: string
          contact_hash: string
          created_at?: string
          granted: boolean
          id?: never
          purpose?: string
          version?: string
        }
        Update: {
          cart_id?: string
          channel?: string
          contact_hash?: string
          created_at?: string
          granted?: boolean
          id?: never
          purpose?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_consents_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "recovery_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_jobs: {
        Row: {
          attempts: number
          cart_id: string
          channel: string
          claim_id: string | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          dry_run: boolean
          due_at: string
          id: string
          provider_id: string | null
          result_code: string | null
          state: string
          step: number
        }
        Insert: {
          attempts?: number
          cart_id: string
          channel: string
          claim_id?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          dry_run: boolean
          due_at: string
          id?: string
          provider_id?: string | null
          result_code?: string | null
          state?: string
          step: number
        }
        Update: {
          attempts?: number
          cart_id?: string
          channel?: string
          claim_id?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string
          dry_run?: boolean
          due_at?: string
          id?: string
          provider_id?: string | null
          result_code?: string | null
          state?: string
          step?: number
        }
        Relationships: [
          {
            foreignKeyName: "recovery_jobs_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "recovery_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_links: {
        Row: {
          cart_id: string
          channel: string | null
          contact_hash: string | null
          created_at: string
          expires_at: string
          kind: string
          token_hash: string
        }
        Insert: {
          cart_id: string
          channel?: string | null
          contact_hash?: string | null
          created_at?: string
          expires_at: string
          kind: string
          token_hash: string
        }
        Update: {
          cart_id?: string
          channel?: string | null
          contact_hash?: string | null
          created_at?: string
          expires_at?: string
          kind?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_links_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "recovery_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_rate_limits: {
        Row: {
          key: string
          minute: string
          requests: number
        }
        Insert: {
          key: string
          minute: string
          requests: number
        }
        Update: {
          key?: string
          minute?: string
          requests?: number
        }
        Relationships: []
      }
      recovery_runtime: {
        Row: {
          dispatch_registered: boolean
          id: boolean
          last_sweep_at: string | null
          registered_at: string | null
          sweep_registered: boolean
        }
        Insert: {
          dispatch_registered?: boolean
          id?: boolean
          last_sweep_at?: string | null
          registered_at?: string | null
          sweep_registered?: boolean
        }
        Update: {
          dispatch_registered?: boolean
          id?: boolean
          last_sweep_at?: string | null
          registered_at?: string | null
          sweep_registered?: boolean
        }
        Relationships: []
      }
      recovery_settings: {
        Row: {
          config: Json
          id: boolean
          updated_at: string
        }
        Insert: {
          config: Json
          id?: boolean
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      recovery_suppressions: {
        Row: {
          channel: string
          contact_hash: string
          created_at: string
        }
        Insert: {
          channel: string
          contact_hash: string
          created_at?: string
        }
        Update: {
          channel?: string
          contact_hash?: string
          created_at?: string
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          fixed_shipping_brl: number
          free_pix_shipping_enabled: boolean
          free_pix_shipping_threshold_brl: number
          id: string
          updated_at: string
        }
        Insert: {
          fixed_shipping_brl?: number
          free_pix_shipping_enabled?: boolean
          free_pix_shipping_threshold_brl?: number
          id?: string
          updated_at?: string
        }
        Update: {
          fixed_shipping_brl?: number
          free_pix_shipping_enabled?: boolean
          free_pix_shipping_threshold_brl?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          about: string
          address: string
          banner_url: string
          business_name: string
          cnpj: string
          email: string
          homepage_images: Json | null
          id: string
          legal_name: string
          logo_url: string
          phone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          about?: string
          address?: string
          banner_url?: string
          business_name?: string
          cnpj?: string
          email?: string
          homepage_images?: Json | null
          id?: string
          legal_name?: string
          logo_url?: string
          phone?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          about?: string
          address?: string
          banner_url?: string
          business_name?: string
          cnpj?: string
          email?: string
          homepage_images?: Json | null
          id?: string
          legal_name?: string
          logo_url?: string
          phone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      tracking_email_attempts: {
        Row: {
          actor_id: string | null
          created_at: string
          event_id: string | null
          http_status: number | null
          id: number
          notification_id: string | null
          order_id: string
          result_code: string
          state: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_id?: string | null
          http_status?: number | null
          id?: never
          notification_id?: string | null
          order_id: string
          result_code: string
          state: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_id?: string | null
          http_status?: number | null
          id?: never
          notification_id?: string | null
          order_id?: string
          result_code?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_email_attempts_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "tracking_email_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_email_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_email_notifications: {
        Row: {
          attempts: number
          created_at: string
          fingerprint: string
          http_status: number | null
          id: string
          order_id: string
          provider_id: string | null
          result_code: string
          state: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          fingerprint: string
          http_status?: number | null
          id?: string
          order_id: string
          provider_id?: string | null
          result_code: string
          state: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          fingerprint?: string
          http_status?: number | null
          id?: string
          order_id?: string
          provider_id?: string | null
          result_code?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_email_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_cart_registry: {
        Args: { p_page?: number; p_status?: string }
        Returns: Json
      }
      admin_customer_page: {
        Args: { p_page?: number; p_search?: string }
        Returns: Json
      }
      admin_delete_unused_product: {
        Args: { p_product: string }
        Returns: boolean
      }
      admin_financial_report: {
        Args: { p_end: string; p_start: string }
        Returns: Json
      }
      admin_order_page: {
        Args: {
          p_archived?: boolean
          p_filter?: string
          p_page?: number
          p_search?: string
          p_user?: string
        }
        Returns: Json
      }
      admin_save_tracking: {
        Args: {
          p_carrier: string
          p_code: string
          p_order: string
          p_url: string
        }
        Returns: boolean
      }
      archive_order_admin: { Args: { p_order_id: string }; Returns: boolean }
      check_coupon: { Args: { _code: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      kit_conservation_preview: { Args: { _items: Json }; Returns: Json }
      place_order: {
        Args: {
          _coupon: string
          _customer: Json
          _items: Json
          _method: string
        }
        Returns: string
      }
      recovery_claim: {
        Args: { p_claim: string }
        Returns: {
          attempts: number
          cart_id: string
          channel: string
          claim_id: string | null
          claimed_at: string | null
          completed_at: string | null
          created_at: string
          dry_run: boolean
          due_at: string
          id: string
          provider_id: string | null
          result_code: string | null
          state: string
          step: number
        }[]
        SetofOptions: {
          from: "*"
          to: "recovery_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recovery_eligible: { Args: { p_job: string }; Returns: boolean }
      recovery_metrics: { Args: never; Returns: Json }
      recovery_rate_allow: {
        Args: { p_key: string; p_limit: number }
        Returns: boolean
      }
      recovery_reconcile: { Args: { p_user?: string }; Returns: undefined }
      recovery_scheduler_status: { Args: never; Returns: Json }
      recovery_stop: {
        Args: { p_cart: string; p_channel?: string; p_hash?: string }
        Returns: undefined
      }
      recovery_sync: {
        Args: {
          p_consents?: Json
          p_contact?: Json
          p_hash: string
          p_items: Json
          p_parent?: string
          p_user: string
        }
        Returns: string
      }
      recovery_tick: { Args: never; Returns: undefined }
      registry_sync_cart: {
        Args: {
          p_consents?: Json
          p_contact?: Json
          p_items: Json
          p_source?: string
          p_token: string
        }
        Returns: Json
      }
      release_unpaid_order_stock: {
        Args: { p_order_id: string; p_payment_status?: string }
        Returns: boolean
      }
      settle_pix_order: {
        Args: {
          p_amount_cents: number
          p_gateway_status: string
          p_order_id: string
          p_transaction_id: string
        }
        Returns: string
      }
      tracking_email_claim: {
        Args: { p_fingerprint: string; p_order: string }
        Returns: Json
      }
      valid_homepage_images: { Args: { value: Json }; Returns: boolean }
      valid_tracking_url: { Args: { p_url: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const

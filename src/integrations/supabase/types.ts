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
          id: string
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
          tracking_code: string | null
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
          id?: string
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
          tracking_code?: string | null
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
          id?: string
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
          tracking_code?: string | null
          user_id?: string
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
      store_settings: {
        Row: {
          about: string
          address: string
          banner_url: string
          business_name: string
          cnpj: string
          email: string
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
          id?: string
          legal_name?: string
          logo_url?: string
          phone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
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
      archive_order_admin: { Args: { p_order_id: string }; Returns: boolean }
      check_coupon: { Args: { _code: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: {
        Args: {
          _coupon: string
          _customer: Json
          _items: Json
          _method: string
        }
        Returns: string
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

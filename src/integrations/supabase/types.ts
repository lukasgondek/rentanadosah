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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          created_at: string | null
          frequency: string | null
          id: string
          is_forecast: boolean | null
          is_recurring: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_forecast?: boolean | null
          is_recurring?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_forecast?: boolean | null
          is_recurring?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          business_expenses: number | null
          business_income: number | null
          business_tax_base: number | null
          category: string | null
          created_at: string | null
          expense_percentage: number | null
          expense_type: string | null
          gross_salary: number | null
          id: string
          income_amount: number | null
          is_forecast: boolean | null
          monthly_amount: number | null
          name: string
          net_salary: number | null
          other_amount: number | null
          other_frequency: string | null
          owner_type: string | null
          real_expenses: number | null
          tax_base: number | null
          type: string
          updated_at: string | null
          user_id: string
          yearly_amount: number | null
        }
        Insert: {
          business_expenses?: number | null
          business_income?: number | null
          business_tax_base?: number | null
          category?: string | null
          created_at?: string | null
          expense_percentage?: number | null
          expense_type?: string | null
          gross_salary?: number | null
          id?: string
          income_amount?: number | null
          is_forecast?: boolean | null
          monthly_amount?: number | null
          name: string
          net_salary?: number | null
          other_amount?: number | null
          other_frequency?: string | null
          owner_type?: string | null
          real_expenses?: number | null
          tax_base?: number | null
          type: string
          updated_at?: string | null
          user_id: string
          yearly_amount?: number | null
        }
        Update: {
          business_expenses?: number | null
          business_income?: number | null
          business_tax_base?: number | null
          category?: string | null
          created_at?: string | null
          expense_percentage?: number | null
          expense_type?: string | null
          gross_salary?: number | null
          id?: string
          income_amount?: number | null
          is_forecast?: boolean | null
          monthly_amount?: number | null
          name?: string
          net_salary?: number | null
          other_amount?: number | null
          other_frequency?: string | null
          owner_type?: string | null
          real_expenses?: number | null
          tax_base?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
          yearly_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          is_forecast: boolean | null
          liquidity_months: number | null
          name: string
          type: string
          updated_at: string | null
          user_id: string
          yearly_return_percent: number | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          is_forecast?: boolean | null
          liquidity_months?: number | null
          name: string
          type: string
          updated_at?: string | null
          user_id: string
          yearly_return_percent?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          is_forecast?: boolean | null
          liquidity_months?: number | null
          name?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          yearly_return_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          bank_name: string | null
          collateral_location: string | null
          created_at: string | null
          id: string
          interest_rate: number
          is_forecast: boolean | null
          ltv_percent: number | null
          monthly_payment: number
          name: string
          original_amount: number
          remaining_principal: number
          term_months: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bank_name?: string | null
          collateral_location?: string | null
          created_at?: string | null
          id?: string
          interest_rate: number
          is_forecast?: boolean | null
          ltv_percent?: number | null
          monthly_payment: number
          name: string
          original_amount: number
          remaining_principal: number
          term_months: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bank_name?: string | null
          collateral_location?: string | null
          created_at?: string | null
          id?: string
          interest_rate?: number
          is_forecast?: boolean | null
          ltv_percent?: number | null
          monthly_payment?: number
          name?: string
          original_amount?: number
          remaining_principal?: number
          term_months?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          created_at: string | null
          estimated_value: number
          id: string
          identifier: string
          is_forecast: boolean | null
          loan_id: string | null
          monthly_expenses: number | null
          monthly_rent: number | null
          purchase_price: number
          updated_at: string | null
          user_id: string
          yearly_appreciation_percent: number | null
        }
        Insert: {
          created_at?: string | null
          estimated_value: number
          id?: string
          identifier: string
          is_forecast?: boolean | null
          loan_id?: string | null
          monthly_expenses?: number | null
          monthly_rent?: number | null
          purchase_price: number
          updated_at?: string | null
          user_id: string
          yearly_appreciation_percent?: number | null
        }
        Update: {
          created_at?: string | null
          estimated_value?: number
          id?: string
          identifier?: string
          is_forecast?: boolean | null
          loan_id?: string | null
          monthly_expenses?: number | null
          monthly_rent?: number | null
          purchase_price?: number
          updated_at?: string | null
          user_id?: string
          yearly_appreciation_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      is_admin: { Args: never; Returns: boolean }
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
      app_role: ["admin", "user"],
    },
  },
} as const

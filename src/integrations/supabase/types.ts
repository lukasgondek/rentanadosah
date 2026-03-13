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
      approved_emails: {
        Row: {
          approved_by: string | null
          created_at: string | null
          email: string
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
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
      planned_investments: {
        Row: {
          appreciation_percent: number
          created_at: string
          estimated_value: number
          id: string
          interest_rate: number
          loan_amount: number
          ltv_percent: number
          monthly_expenses: number
          monthly_rent: number
          property_identifier: string
          purchase_price: number
          rent_growth_percent: number
          term_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          appreciation_percent?: number
          created_at?: string
          estimated_value: number
          id?: string
          interest_rate: number
          loan_amount: number
          ltv_percent: number
          monthly_expenses: number
          monthly_rent: number
          property_identifier: string
          purchase_price: number
          rent_growth_percent?: number
          term_months: number
          updated_at?: string
          user_id: string
        }
        Update: {
          appreciation_percent?: number
          created_at?: string
          estimated_value?: number
          id?: string
          interest_rate?: number
          loan_amount?: number
          ltv_percent?: number
          monthly_expenses?: number
          monthly_rent?: number
          property_identifier?: string
          purchase_price?: number
          rent_growth_percent?: number
          term_months?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      property_units: {
        Row: {
          id: string
          property_id: string
          name: string
          monthly_rent: number
          monthly_expenses: number
          is_cadastrally_separated: boolean
          estimated_value: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          property_id: string
          name: string
          monthly_rent?: number
          monthly_expenses?: number
          is_cadastrally_separated?: boolean
          estimated_value?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          property_id?: string
          name?: string
          monthly_rent?: number
          monthly_expenses?: number
          is_cadastrally_separated?: boolean
          estimated_value?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_collaterals: {
        Row: {
          id: string
          loan_id: string
          property_id: string | null
          property_unit_id: string | null
          collateral_amount: number
          created_at: string | null
        }
        Insert: {
          id?: string
          loan_id: string
          property_id?: string | null
          property_unit_id?: string | null
          collateral_amount: number
          created_at?: string | null
        }
        Update: {
          id?: string
          loan_id?: string
          property_id?: string | null
          property_unit_id?: string | null
          collateral_amount?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_collaterals_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_collaterals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_collaterals_property_unit_id_fkey"
            columns: ["property_unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
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
          property_type: string
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
          property_type?: string
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
          property_type?: string
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
      is_email_approved: { Args: { check_email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "prospect"
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
      app_role: ["admin", "user", "prospect"],
    },
  },
} as const

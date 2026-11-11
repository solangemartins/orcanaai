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
      chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          reply_to_sdk_id: string | null
          role: string
          sdk_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          reply_to_sdk_id?: string | null
          role: string
          sdk_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          reply_to_sdk_id?: string | null
          role?: string
          sdk_id?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_movement_proposals: {
        Row: {
          action: string
          amount: number
          created_at: string
          delta: number
          expected_balance: number
          goal_id: string
          id: string
          reason: string
          reference_id: string | null
          request_key: string
          status: string
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string
          delta: number
          expected_balance: number
          goal_id: string
          id?: string
          reason?: string
          reference_id?: string | null
          request_key: string
          status?: string
          user_id?: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string
          delta?: number
          expected_balance?: number
          goal_id?: string
          id?: string
          reason?: string
          reference_id?: string | null
          request_key?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_movement_proposals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_movement_proposals_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "goal_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_movements: {
        Row: {
          action: string
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          goal_id: string
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          goal_id: string
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Update: {
          action?: string
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          goal_id?: string
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_movements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_movements_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "goal_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          id: string
          prazo: string | null
          titulo: string
          user_id: string
          valor_atual: number
          valor_objetivo: number
        }
        Insert: {
          created_at?: string
          id?: string
          prazo?: string | null
          titulo: string
          user_id?: string
          valor_atual?: number
          valor_objetivo: number
        }
        Update: {
          created_at?: string
          id?: string
          prazo?: string | null
          titulo?: string
          user_id?: string
          valor_atual?: number
          valor_objetivo?: number
        }
        Relationships: []
      }
      insights: {
        Row: {
          created_at: string
          descricao: string
          id: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          titulo: string
          user_id?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          notificacoes: boolean
          onboarded: boolean
          orcamento_mensal: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          notificacoes?: boolean
          onboarded?: boolean
          orcamento_mensal?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          notificacoes?: boolean
          onboarded?: boolean
          orcamento_mensal?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          id: string
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          tipo: string
          user_id?: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_goal_movement: {
        Args: { p_approved: boolean; p_proposal_id: string }
        Returns: Json
      }
      prepare_goal_movement: {
        Args: {
          p_action: string
          p_amount: number
          p_goal_id: string
          p_reason: string
          p_reference_id?: string
          p_request_key: string
        }
        Returns: Json
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
    Enums: {},
  },
} as const

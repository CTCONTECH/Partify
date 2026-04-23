// Supabase Database Types
// Auto-generated from schema - update with: supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CouponStatus = 'issued' | 'opened' | 'navigation_started' | 'redeemed' | 'expired' | 'cancelled';
export type SettlementStatus = 'draft' | 'generated' | 'sent' | 'paid' | 'disputed';
export type UserRole = 'client' | 'supplier' | 'admin';
export type EventType = 'coupon_issued' | 'coupon_viewed' | 'navigation_started' | 'coupon_redeemed' | 'coupon_expired' | 'coupon_cancelled';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          name: string;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          name: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          business_name: string;
          address: string;
          suburb: string;
          coordinates: unknown; // geography type
          rating: number;
          total_parts: number;
          commission_rate: number;
          discount_percent: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          business_name: string;
          address: string;
          suburb: string;
          coordinates: unknown;
          rating?: number;
          total_parts?: number;
          commission_rate?: number;
          discount_percent?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          address?: string;
          suburb?: string;
          coordinates?: unknown;
          rating?: number;
          total_parts?: number;
          commission_rate?: number;
          discount_percent?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      parts: {
        Row: {
          id: string;
          part_number: string;
          part_name: string;
          category: string;
          description: string | null;
          compatibility: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          part_number: string;
          part_name: string;
          category: string;
          description?: string | null;
          compatibility?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          part_number?: string;
          part_name?: string;
          category?: string;
          description?: string | null;
          compatibility?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      supplier_inventory: {
        Row: {
          id: string;
          supplier_id: string;
          part_id: string;
          price: number;
          stock: number;
          low_stock_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          part_id: string;
          price: number;
          stock?: number;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          part_id?: string;
          price?: number;
          stock?: number;
          low_stock_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          engine: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          engine: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          make?: string;
          model?: string;
          year?: number;
          engine?: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupon_issues: {
        Row: {
          id: string;
          code: string;
          user_id: string;
          supplier_id: string;
          part_id: string | null;
          inventory_id: string | null;
          original_price: number;
          discount_percent: number;
          discount_amount: number;
          final_price: number;
          status: CouponStatus;
          expires_at: string;
          issued_at: string;
          opened_at: string | null;
          navigation_started_at: string | null;
          redeemed_at: string | null;
          expired_at: string | null;
          cancelled_at: string | null;
          redeemed_by: string | null;
          actual_order_amount: number | null;
          user_location: unknown | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          user_id: string;
          supplier_id: string;
          part_id?: string | null;
          inventory_id?: string | null;
          original_price: number;
          discount_percent: number;
          discount_amount: number;
          final_price: number;
          status?: CouponStatus;
          expires_at: string;
          issued_at?: string;
          opened_at?: string | null;
          navigation_started_at?: string | null;
          redeemed_at?: string | null;
          expired_at?: string | null;
          cancelled_at?: string | null;
          redeemed_by?: string | null;
          actual_order_amount?: number | null;
          user_location?: unknown | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          user_id?: string;
          supplier_id?: string;
          part_id?: string | null;
          inventory_id?: string | null;
          original_price?: number;
          discount_percent?: number;
          discount_amount?: number;
          final_price?: number;
          status?: CouponStatus;
          expires_at?: string;
          issued_at?: string;
          opened_at?: string | null;
          navigation_started_at?: string | null;
          redeemed_at?: string | null;
          expired_at?: string | null;
          cancelled_at?: string | null;
          redeemed_by?: string | null;
          actual_order_amount?: number | null;
          user_location?: unknown | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupon_events: {
        Row: {
          id: string;
          coupon_id: string;
          event_type: EventType;
          actor_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          event_type: EventType;
          actor_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          event_type?: EventType;
          actor_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      supplier_monthly_settlements: {
        Row: {
          id: string;
          supplier_id: string;
          settlement_month: string;
          total_coupons_issued: number;
          total_coupons_redeemed: number;
          gross_order_value: number;
          total_discounts_given: number;
          commission_rate: number;
          commission_amount: number;
          status: SettlementStatus;
          generated_at: string | null;
          sent_at: string | null;
          paid_at: string | null;
          disputed_at: string | null;
          dispute_reason: string | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          settlement_month: string;
          total_coupons_issued?: number;
          total_coupons_redeemed?: number;
          gross_order_value?: number;
          total_discounts_given?: number;
          commission_rate: number;
          commission_amount?: number;
          status?: SettlementStatus;
          generated_at?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          disputed_at?: string | null;
          dispute_reason?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          supplier_id?: string;
          settlement_month?: string;
          total_coupons_issued?: number;
          total_coupons_redeemed?: number;
          gross_order_value?: number;
          total_discounts_given?: number;
          commission_rate?: number;
          commission_amount?: number;
          status?: SettlementStatus;
          generated_at?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          disputed_at?: string | null;
          dispute_reason?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      settlement_line_items: {
        Row: {
          id: string;
          settlement_id: string;
          coupon_id: string;
          redeemed_at: string;
          part_number: string | null;
          part_name: string | null;
          original_price: number;
          discount_amount: number;
          actual_order_amount: number;
          commission_rate: number;
          commission_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          settlement_id: string;
          coupon_id: string;
          redeemed_at: string;
          part_number?: string | null;
          part_name?: string | null;
          original_price: number;
          discount_amount: number;
          actual_order_amount: number;
          commission_rate: number;
          commission_amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          settlement_id?: string;
          coupon_id?: string;
          redeemed_at?: string;
          part_number?: string | null;
          part_name?: string | null;
          original_price?: number;
          discount_amount?: number;
          actual_order_amount?: number;
          commission_rate?: number;
          commission_amount?: number;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      find_nearest_suppliers: {
        Args: {
          user_lat: number;
          user_lon: number;
          part_id_filter?: string;
          max_distance_km?: number;
          result_limit?: number;
        };
        Returns: Array<{
          supplier_id: string;
          business_name: string;
          address: string;
          suburb: string;
          latitude: number;
          longitude: number;
          distance_km: number;
          rating: number;
          commission_rate: number;
          discount_percent: number;
        }>;
      };
      get_part_availability: {
        Args: {
          part_id_filter: string;
          user_lat?: number;
          user_lon?: number;
        };
        Returns: Array<{
          inventory_id: string;
          part_id: string;
          part_number: string;
          part_name: string;
          supplier_id: string;
          business_name: string;
          address: string;
          suburb: string;
          price: number;
          stock: number;
          distance_km: number | null;
          fuel_cost: number;
          total_cost: number;
        }>;
      };
      issue_coupon: {
        Args: {
          p_user_id: string;
          p_supplier_id: string;
          p_part_id: string;
          p_inventory_id: string;
          p_price: number;
          p_user_lat?: number;
          p_user_lon?: number;
        };
        Returns: string;
      };
      log_coupon_event: {
        Args: {
          p_coupon_id: string;
          p_event_type: EventType;
          p_actor_id?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      generate_monthly_settlement: {
        Args: {
          p_supplier_id: string;
          p_year: number;
          p_month: number;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      coupon_status: CouponStatus;
      settlement_status: SettlementStatus;
      event_type: EventType;
    };
  };
}

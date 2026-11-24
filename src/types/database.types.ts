export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  bookfit: {
    Tables: {
      actor_roles: {
        Row: {
          actor_id: string;
          role: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          role: string;
        };
        Update: {
          actor_id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "actor_roles_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
        ];
      };
      actors: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          is_demo: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          is_demo?: boolean;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          is_demo?: boolean;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_kind: string;
          id: string;
          metadata: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_kind: string;
          id?: string;
          metadata?: NonNullable<Json>;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_kind?: string;
          id?: string;
          metadata?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_identities: {
        Row: {
          actor_id: string;
          created_at: string;
          id: string;
          provider: string;
          subject: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          id?: string;
          provider: string;
          subject: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          id?: string;
          provider?: string;
          subject?: string;
        };
        Relationships: [
          {
            foreignKeyName: "auth_identities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
        ];
      };
      booking_occurrences: {
        Row: {
          class_session_id: string | null;
          ends_at: string;
          id: string;
          location_id: string;
          order_id: string;
          service_date: string;
          starts_at: string;
          status: string;
          w_space_commission_cents: number;
          x_service_cents: number;
          y_space_cents: number;
          z_service_commission_cents: number;
        };
        ComputedFields: never;
        Insert: {
          class_session_id?: string | null;
          ends_at: string;
          id?: string;
          location_id: string;
          order_id: string;
          service_date: string;
          starts_at: string;
          status: string;
          w_space_commission_cents: number;
          x_service_cents: number;
          y_space_cents: number;
          z_service_commission_cents: number;
        };
        Update: {
          class_session_id?: string | null;
          ends_at?: string;
          id?: string;
          location_id?: string;
          order_id?: string;
          service_date?: string;
          starts_at?: string;
          status?: string;
          w_space_commission_cents?: number;
          x_service_cents?: number;
          y_space_cents?: number;
          z_service_commission_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "booking_occurrences_class_session_id_fkey";
            columns: ["class_session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_occurrences_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "booking_occurrences_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      checkout_holds: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          order_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          order_id: string;
          status: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          order_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkout_holds_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      class_sessions: {
        Row: {
          capacity: number;
          ends_at: string;
          id: string;
          professional_id: string;
          service_date: string;
          service_id: string;
          space_id: string;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          capacity: number;
          ends_at: string;
          id?: string;
          professional_id: string;
          service_date: string;
          service_id: string;
          space_id: string;
          starts_at: string;
        };
        Update: {
          capacity?: number;
          ends_at?: string;
          id?: string;
          professional_id?: string;
          service_date?: string;
          service_id?: string;
          space_id?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_sessions_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_sessions_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      dev_sessions: {
        Row: {
          actor_id: string;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
          token_hash: string;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          expires_at?: string;
          revoked_at?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dev_sessions_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
        ];
      };
      gym_entitlements: {
        Row: {
          client_actor_id: string;
          created_at: string;
          id: string;
          order_id: string;
          space_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          client_actor_id: string;
          created_at?: string;
          id?: string;
          order_id: string;
          space_id: string;
          status: string;
        };
        Update: {
          client_actor_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          space_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gym_entitlements_client_actor_id_fkey";
            columns: ["client_actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gym_entitlements_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gym_entitlements_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      idempotency_keys: {
        Row: {
          actor_id: string;
          created_at: string;
          key: string;
          operation: string;
          request_hash: string;
          response: Json | null;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          created_at?: string;
          key: string;
          operation: string;
          request_hash: string;
          response?: Json | null;
        };
        Update: {
          actor_id?: string;
          created_at?: string;
          key?: string;
          operation?: string;
          request_hash?: string;
          response?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
        ];
      };
      information_requests: {
        Row: {
          body: string;
          booking_occurrence_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_actor_id: string;
          recipient_kind: string;
          sender_actor_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          booking_occurrence_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_actor_id: string;
          recipient_kind: string;
          sender_actor_id: string;
        };
        Update: {
          body?: string;
          booking_occurrence_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_actor_id?: string;
          recipient_kind?: string;
          sender_actor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "information_requests_booking_occurrence_id_fkey";
            columns: ["booking_occurrence_id"];
            isOneToOne: false;
            referencedRelation: "booking_occurrences";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "information_requests_recipient_actor_id_fkey";
            columns: ["recipient_actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "information_requests_sender_actor_id_fkey";
            columns: ["sender_actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          id: string;
          is_online: boolean;
          name: string;
          slug: string;
          x_km: number;
          y_km: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          is_online?: boolean;
          name: string;
          slug: string;
          x_km?: number;
          y_km?: number;
        };
        Update: {
          id?: string;
          is_online?: boolean;
          name?: string;
          slug?: string;
          x_km?: number;
          y_km?: number;
        };
        Relationships: [];
      };
      order_lines: {
        Row: {
          amount_cents: number;
          currency: string;
          description: string;
          id: string;
          line_type: string;
          occurrence_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          currency?: string;
          description: string;
          id?: string;
          line_type: string;
          occurrence_id: string;
        };
        Update: {
          amount_cents?: number;
          currency?: string;
          description?: string;
          id?: string;
          line_type?: string;
          occurrence_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_lines_occurrence_id_fkey";
            columns: ["occurrence_id"];
            isOneToOne: false;
            referencedRelation: "booking_occurrences";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          client_actor_id: string;
          created_at: string;
          currency: string;
          id: string;
          mode: string;
          professional_id: string;
          seats: number;
          service_commission_cents: number;
          service_id: string;
          space_commission_cents: number;
          space_id: string | null;
          status: string;
          subtotal_service_cents: number;
          subtotal_space_cents: number;
          total_cents: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          client_actor_id: string;
          created_at?: string;
          currency?: string;
          id?: string;
          mode: string;
          professional_id: string;
          seats: number;
          service_commission_cents?: number;
          service_id: string;
          space_commission_cents?: number;
          space_id?: string | null;
          status: string;
          subtotal_service_cents?: number;
          subtotal_space_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Update: {
          client_actor_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          mode?: string;
          professional_id?: string;
          seats?: number;
          service_commission_cents?: number;
          service_id?: string;
          space_commission_cents?: number;
          space_id?: string | null;
          status?: string;
          subtotal_service_cents?: number;
          subtotal_space_cents?: number;
          total_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_client_actor_id_fkey";
            columns: ["client_actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_attempts: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: string;
          order_id: string;
          provider: string;
          provider_reference: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency?: string;
          id?: string;
          order_id: string;
          provider: string;
          provider_reference?: string | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          order_id?: string;
          provider?: string;
          provider_reference?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          event_type: string;
          id: string;
          payment_attempt_id: string;
          provider: string;
          provider_event_id: string;
          received_at: string;
        };
        ComputedFields: never;
        Insert: {
          event_type: string;
          id?: string;
          payment_attempt_id: string;
          provider: string;
          provider_event_id: string;
          received_at?: string;
        };
        Update: {
          event_type?: string;
          id?: string;
          payment_attempt_id?: string;
          provider?: string;
          provider_event_id?: string;
          received_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_attempt_id_fkey";
            columns: ["payment_attempt_id"];
            isOneToOne: false;
            referencedRelation: "payment_attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      professional_blocks: {
        Row: {
          ends_at: string;
          id: string;
          professional_id: string;
          reason: string | null;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          professional_id: string;
          reason?: string | null;
          starts_at: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          professional_id?: string;
          reason?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professional_blocks_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      professional_hours: {
        Row: {
          closes_at: string;
          id: string;
          opens_at: string;
          professional_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          closes_at: string;
          id?: string;
          opens_at: string;
          professional_id: string;
          weekday: number;
        };
        Update: {
          closes_at?: string;
          id?: string;
          opens_at?: string;
          professional_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "professional_hours_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      professional_preferences: {
        Row: {
          base_location_id: string;
          buffer_minutes: number;
          max_radius_km: number;
          max_travel_minutes: number;
          modalities: string[];
          professional_id: string;
        };
        ComputedFields: never;
        Insert: {
          base_location_id: string;
          buffer_minutes?: number;
          max_radius_km?: number;
          max_travel_minutes?: number;
          modalities?: string[];
          professional_id: string;
        };
        Update: {
          base_location_id?: string;
          buffer_minutes?: number;
          max_radius_km?: number;
          max_travel_minutes?: number;
          modalities?: string[];
          professional_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professional_preferences_base_location_id_fkey";
            columns: ["base_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professional_preferences_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: true;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      professionals: {
        Row: {
          actor_id: string;
          bio: string;
          categories: string[];
          headline: string;
          id: string;
          public_location_id: string;
          public_zone: string;
          rating: number;
          review_count: number;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          bio: string;
          categories?: string[];
          headline: string;
          id?: string;
          public_location_id: string;
          public_zone: string;
          rating: number;
          review_count?: number;
          slug: string;
        };
        Update: {
          actor_id?: string;
          bio?: string;
          categories?: string[];
          headline?: string;
          id?: string;
          public_location_id?: string;
          public_zone?: string;
          rating?: number;
          review_count?: number;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "professionals_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: true;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "professionals_public_location_id_fkey";
            columns: ["public_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      resource_allocations: {
        Row: {
          class_session_id: string | null;
          ends_at: string;
          id: string;
          location_id: string;
          order_id: string | null;
          resource_id: string;
          resource_kind: string;
          service_date: string;
          starts_at: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          class_session_id?: string | null;
          ends_at: string;
          id?: string;
          location_id: string;
          order_id?: string | null;
          resource_id: string;
          resource_kind: string;
          service_date: string;
          starts_at: string;
          status: string;
        };
        Update: {
          class_session_id?: string | null;
          ends_at?: string;
          id?: string;
          location_id?: string;
          order_id?: string | null;
          resource_id?: string;
          resource_kind?: string;
          service_date?: string;
          starts_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_allocations_class_session_id_fkey";
            columns: ["class_session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_allocations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_allocations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      resource_day_locks: {
        Row: {
          resource_id: string;
          resource_kind: string;
          service_date: string;
        };
        ComputedFields: never;
        Insert: {
          resource_id: string;
          resource_kind: string;
          service_date: string;
        };
        Update: {
          resource_id?: string;
          resource_kind?: string;
          service_date?: string;
        };
        Relationships: [];
      };
      seat_allocations: {
        Row: {
          class_session_id: string;
          client_actor_id: string;
          id: string;
          order_id: string;
          seats: number;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          class_session_id: string;
          client_actor_id: string;
          id?: string;
          order_id: string;
          seats: number;
          status: string;
        };
        Update: {
          class_session_id?: string;
          client_actor_id?: string;
          id?: string;
          order_id?: string;
          seats?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seat_allocations_class_session_id_fkey";
            columns: ["class_session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seat_allocations_client_actor_id_fkey";
            columns: ["client_actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seat_allocations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          category: string;
          class_activity: string | null;
          description: string;
          duration_minutes: number;
          group_capacity: number | null;
          id: string;
          modalities: string[];
          name: string;
          price_cents: number;
          professional_id: string;
          required_equipment: string[];
          service_format: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          class_activity?: string | null;
          description: string;
          duration_minutes: number;
          group_capacity?: number | null;
          id?: string;
          modalities: string[];
          name: string;
          price_cents: number;
          professional_id: string;
          required_equipment?: string[];
          service_format: string;
          slug: string;
        };
        Update: {
          category?: string;
          class_activity?: string | null;
          description?: string;
          duration_minutes?: number;
          group_capacity?: number | null;
          id?: string;
          modalities?: string[];
          name?: string;
          price_cents?: number;
          professional_id?: string;
          required_equipment?: string[];
          service_format?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_professional_id_fkey";
            columns: ["professional_id"];
            isOneToOne: false;
            referencedRelation: "professionals";
            referencedColumns: ["id"];
          },
        ];
      };
      space_blocks: {
        Row: {
          ends_at: string;
          id: string;
          reason: string | null;
          space_id: string;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          ends_at: string;
          id?: string;
          reason?: string | null;
          space_id: string;
          starts_at: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          reason?: string | null;
          space_id?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_blocks_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      space_memberships: {
        Row: {
          actor_id: string;
          membership_role: string;
          space_id: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          membership_role?: string;
          space_id: string;
        };
        Update: {
          actor_id?: string;
          membership_role?: string;
          space_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_memberships_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_memberships_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      space_opening_hours: {
        Row: {
          closes_at: string;
          id: string;
          opens_at: string;
          space_id: string;
          weekday: number;
        };
        ComputedFields: never;
        Insert: {
          closes_at: string;
          id?: string;
          opens_at: string;
          space_id: string;
          weekday: number;
        };
        Update: {
          closes_at?: string;
          id?: string;
          opens_at?: string;
          space_id?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "space_opening_hours_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          access_instructions: string;
          amenities: string[];
          capacity: number;
          description: string;
          equipment: string[];
          id: string;
          kind: string;
          location_id: string;
          name: string;
          price_per_occurrence_cents: number;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          access_instructions: string;
          amenities?: string[];
          capacity: number;
          description: string;
          equipment?: string[];
          id?: string;
          kind: string;
          location_id: string;
          name: string;
          price_per_occurrence_cents: number;
          slug: string;
        };
        Update: {
          access_instructions?: string;
          amenities?: string[];
          capacity?: number;
          description?: string;
          equipment?: string[];
          id?: string;
          kind?: string;
          location_id?: string;
          name?: string;
          price_per_occurrence_cents?: number;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spaces_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          class_session_id: string;
          client_actor_id: string;
          created_at: string;
          id: string;
          seats: number;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          class_session_id: string;
          client_actor_id: string;
          created_at?: string;
          id?: string;
          seats?: number;
          status: string;
        };
        Update: {
          class_session_id?: string;
          client_actor_id?: string;
          created_at?: string;
          id?: string;
          seats?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_class_session_id_fkey";
            columns: ["class_session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_client_actor_id_fkey";
            columns: ["client_actor_id"];
            isOneToOne: false;
            referencedRelation: "actors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "bookfit"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  bookfit: {
    Enums: {},
  },
} as const;

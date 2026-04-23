-- Partify Database Schema - Initial Setup
-- This migration creates enums, extensions, and base configuration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries

-- Create enums
CREATE TYPE user_role AS ENUM ('client', 'supplier', 'admin');
CREATE TYPE coupon_status AS ENUM (
  'issued',
  'opened',
  'navigation_started',
  'redeemed',
  'expired',
  'cancelled'
);
CREATE TYPE settlement_status AS ENUM (
  'draft',
  'generated',
  'sent',
  'paid',
  'disputed'
);
CREATE TYPE event_type AS ENUM (
  'coupon_issued',
  'coupon_viewed',
  'navigation_started',
  'coupon_redeemed',
  'coupon_expired',
  'coupon_cancelled'
);

-- Create function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON EXTENSION postgis IS 'PostGIS extension for geospatial queries';

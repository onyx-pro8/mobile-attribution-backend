/**
 * Mobile Attribution System - PostgreSQL Schema
 * Optimized for high-volume click and event tracking
 */

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Campaign table
CREATE TABLE campaigns (
  campaign_id SERIAL PRIMARY KEY,
  campaign_name VARCHAR(255) NOT NULL UNIQUE,
  utm_campaign VARCHAR(255) NOT NULL,
  advertiser_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  daily_budget DECIMAL(10, 2),
  total_budget DECIMAL(10, 2),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  updated_by UUID,
  CONSTRAINT valid_dates CHECK (end_date >= start_date OR end_date IS NULL)
);

-- Click table - Core attribution tracking
CREATE TABLE clicks (
  click_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  utm_source VARCHAR(100) NOT NULL,
  utm_campaign VARCHAR(100) NOT NULL,
  utm_adgroup VARCHAR(100),
  utm_creative VARCHAR(100),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'unknown')),
  ip_address INET,
  user_agent TEXT,
  device_model VARCHAR(255),
  os_version VARCHAR(50),
  country VARCHAR(2),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  idfa VARCHAR(255),
  aaid VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Install Event table - Post-click events
CREATE TABLE install_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  click_id UUID NOT NULL REFERENCES clicks(click_id) ON DELETE CASCADE,
  app_id VARCHAR(255) NOT NULL,
  event_name VARCHAR(100) NOT NULL CHECK (event_name IN ('install', 'first_open', 'app_open', 'purchase', 'custom_event')),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('android', 'ios', 'unknown')),
  revenue DECIMAL(10, 2),
  currency VARCHAR(3),
  event_properties JSONB,
  user_id VARCHAR(255),
  session_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Attribution Mapping table - Links clicks to installs
CREATE TABLE attribution_mapping (
  mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  click_id UUID NOT NULL REFERENCES clicks(click_id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES install_events(event_id) ON DELETE CASCADE,
  attribution_window_days INTEGER DEFAULT 7,
  is_attributed BOOLEAN DEFAULT TRUE,
  attribution_type VARCHAR(50) DEFAULT 'first_click' CHECK (attribution_type IN ('first_click', 'last_click', 'linear', 'time_decay')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(click_id, event_id)
);

-- Aggregated Statistics table - For fast reporting
CREATE TABLE daily_statistics (
  stat_id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  total_clicks INTEGER DEFAULT 0,
  total_installs INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  android_clicks INTEGER DEFAULT 0,
  ios_clicks INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 4),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(campaign_id, stat_date)
);

-- Create indexes for optimal query performance
CREATE INDEX idx_clicks_campaign_created ON clicks(campaign_id, created_at DESC);
CREATE INDEX idx_clicks_platform_created ON clicks(platform, created_at DESC);
CREATE INDEX idx_clicks_utm_source_created ON clicks(utm_source, created_at DESC);
CREATE INDEX idx_clicks_created_at ON clicks(created_at DESC);
CREATE INDEX idx_clicks_idfa ON clicks(idfa) WHERE idfa IS NOT NULL;
CREATE INDEX idx_clicks_aaid ON clicks(aaid) WHERE aaid IS NOT NULL;
CREATE INDEX idx_clicks_device_model ON clicks(device_model);

CREATE INDEX idx_install_events_click_id ON install_events(click_id);
CREATE INDEX idx_install_events_app_id_event ON install_events(app_id, event_name);
CREATE INDEX idx_install_events_created_at ON install_events(created_at DESC);
CREATE INDEX idx_install_events_platform ON install_events(platform);
CREATE INDEX idx_install_events_user_id ON install_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_install_events_session_id ON install_events(session_id);

CREATE INDEX idx_attribution_click_id ON attribution_mapping(click_id);
CREATE INDEX idx_attribution_event_id ON attribution_mapping(event_id);
CREATE INDEX idx_attribution_campaign ON attribution_mapping USING HASH (attribution_type);

CREATE INDEX idx_daily_stats_campaign_date ON daily_statistics(campaign_id, stat_date DESC);
CREATE INDEX idx_daily_stats_date ON daily_statistics(stat_date DESC);

-- Partial indexes for active campaigns
CREATE INDEX idx_active_campaigns ON campaigns(campaign_id) WHERE status = 'active';

-- Text search index for campaign names
CREATE INDEX idx_campaign_search ON campaigns USING GIN (to_tsvector('english', campaign_name));

-- Update trigger for campaigns
CREATE OR REPLACE FUNCTION update_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated BEFORE UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION update_campaigns_timestamp();

-- Update trigger for clicks
CREATE OR REPLACE FUNCTION update_clicks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clicks_updated BEFORE UPDATE ON clicks
FOR EACH ROW EXECUTE FUNCTION update_clicks_timestamp();

-- Update trigger for install_events
CREATE OR REPLACE FUNCTION update_install_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER install_events_updated BEFORE UPDATE ON install_events
FOR EACH ROW EXECUTE FUNCTION update_install_events_timestamp();

-- Views for common queries

-- View: Get clicks with campaign info
CREATE VIEW clicks_with_campaign AS
SELECT
  c.click_id,
  c.campaign_id,
  ca.campaign_name,
  ca.utm_campaign,
  c.utm_source,
  c.utm_adgroup,
  c.utm_creative,
  c.platform,
  c.device_model,
  c.country,
  c.created_at
FROM clicks c
JOIN campaigns ca ON c.campaign_id = ca.campaign_id;

-- View: Get events with click info
CREATE VIEW events_with_click_info AS
SELECT
  ie.event_id,
  ie.click_id,
  ie.app_id,
  ie.event_name,
  ie.platform,
  ie.revenue,
  ie.currency,
  c.utm_source,
  c.utm_campaign,
  c.utm_adgroup,
  c.device_model,
  ie.created_at
FROM install_events ie
JOIN clicks c ON ie.click_id = c.click_id;

-- View: Attribution summary
CREATE VIEW attribution_summary AS
SELECT
  am.click_id,
  am.event_id,
  c.campaign_id,
  ca.campaign_name,
  c.utm_source,
  c.utm_campaign,
  c.platform,
  ie.app_id,
  ie.event_name,
  ie.revenue,
  am.attribution_type,
  (EXTRACT(EPOCH FROM (ie.created_at - c.created_at)) / 3600) AS hours_to_event,
  c.created_at AS click_time,
  ie.created_at AS event_time
FROM attribution_mapping am
JOIN clicks c ON am.click_id = c.click_id
JOIN campaigns ca ON c.campaign_id = ca.campaign_id
JOIN install_events ie ON am.event_id = ie.event_id;

-- Sample data for testing
INSERT INTO campaigns (campaign_name, utm_campaign, advertiser_id, status, start_date, daily_budget)
VALUES ('Summer 2024 Campaign', 'summer_2024', uuid_generate_v4(), 'active', NOW(), 1000.00);

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

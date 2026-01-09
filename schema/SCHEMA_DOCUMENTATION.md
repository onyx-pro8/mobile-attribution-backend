/**
 * Database Schema Documentation
 * Mobile Attribution System
 */

# Database Schema Design - Mobile Attribution System

## Overview

This document describes the database schema for a high-performance mobile attribution tracking system. Two implementations are provided: PostgreSQL (SQL) and MongoDB (Mongoose).

---

## Entity Relationship Diagram

```
┌─────────────┐
│  Campaigns  │
└──────┬──────┘
       │
       │ (1:N)
       │
       ▼
┌─────────────┐         ┌──────────────────┐
│   Clicks    ├────────►│ AttributionMapping│
└──────┬──────┘         └────────┬──────────┘
       │ (1:N)                   │
       │                         │ (1:N)
       │                         │
       └────────┬────────────────┘
                │
                ▼
        ┌──────────────────┐
        │ InstallEvents    │
        └──────────────────┘
```

---

## Entity Details

### 1. Campaigns

**Purpose**: Store advertising campaign information

**PostgreSQL Table**: `campaigns`
**MongoDB Collection**: `campaigns`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| campaign_id | SERIAL / ObjectId | PRIMARY KEY | Unique campaign identifier |
| campaign_name | VARCHAR(255) | UNIQUE, NOT NULL | Campaign display name |
| utm_campaign | VARCHAR(255) | NOT NULL | UTM parameter value |
| advertiser_id | UUID / String | NOT NULL, INDEX | Link to advertiser |
| status | VARCHAR(50) | ENUM: active, paused, archived | Campaign status |
| start_date | TIMESTAMP | - | Campaign start date |
| end_date | TIMESTAMP | - | Campaign end date |
| daily_budget | DECIMAL(10,2) | - | Daily spending limit |
| total_budget | DECIMAL(10,2) | - | Total spending limit |
| description | TEXT | - | Campaign notes |
| created_at | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| created_by | UUID / String | - | Creator user ID |
| updated_by | UUID / String | - | Last updater user ID |

---

### 2. Clicks

**Purpose**: Core tracking table for all mobile attribution clicks

**PostgreSQL Table**: `clicks`
**MongoDB Collection**: `clicks`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| click_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique click identifier |
| campaign_id | INTEGER / ObjectId | FK → campaigns, INDEX | Link to campaign |
| utm_source | VARCHAR(100) | NOT NULL, INDEX | UTM source parameter |
| utm_campaign | VARCHAR(100) | NOT NULL, INDEX | UTM campaign parameter |
| utm_adgroup | VARCHAR(100) | - | UTM ad group parameter |
| utm_creative | VARCHAR(100) | - | UTM creative parameter |
| platform | VARCHAR(20) | ENUM: android, ios, unknown | Mobile OS platform |
| ip_address | INET / String | - | User IP address |
| user_agent | TEXT | - | Browser user agent string |
| device_model | VARCHAR(255) | INDEX | Device model name |
| os_version | VARCHAR(50) | - | Operating system version |
| country | VARCHAR(2) | - | Country code (ISO 3166-1 alpha-2) |
| city | VARCHAR(100) | - | City name |
| latitude | DECIMAL(10,8) | - | Geographic latitude |
| longitude | DECIMAL(11,8) | - | Geographic longitude |
| idfa | VARCHAR(255) | SPARSE INDEX | Apple ID for Advertisers |
| aaid | VARCHAR(255) | SPARSE INDEX | Android Advertising ID |
| created_at | TIMESTAMP | DEFAULT NOW(), INDEX | Click timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Key Considerations**:
- Click data is high-volume and write-heavy
- IDFA and AAID are sparse (not all records have values)
- Temporal queries are common (created_at is heavily indexed)
- Platform split (Android vs iOS) is critical for analysis

---

### 3. InstallEvents

**Purpose**: Post-click events like installs, first opens, purchases

**PostgreSQL Table**: `install_events`
**MongoDB Collection**: `install_events`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| event_id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique event identifier |
| click_id | UUID | FK → clicks, INDEX | Link to originating click |
| app_id | VARCHAR(255) | NOT NULL, INDEX | Application identifier |
| event_name | VARCHAR(100) | ENUM: install, first_open, app_open, purchase, custom_event | Event type |
| platform | VARCHAR(20) | ENUM: android, ios, unknown | Mobile OS platform |
| revenue | DECIMAL(10,2) | - | Transaction revenue (if applicable) |
| currency | VARCHAR(3) | - | Currency code (ISO 4217) |
| event_properties | JSONB / Mixed | - | Flexible event metadata |
| user_id | VARCHAR(255) | SPARSE INDEX | App user identifier |
| session_id | UUID | INDEX | User session identifier |
| created_at | TIMESTAMP | DEFAULT NOW(), INDEX | Event timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| processed_at | TIMESTAMP | - | When event was processed |

**Key Considerations**:
- Receives events post-click, potentially with delays
- JSONB (PostgreSQL) or Mixed (MongoDB) allows flexible event properties
- Multiple events can link to same click
- Revenue tracking for ROI calculation

---

### 4. AttributionMapping

**Purpose**: Links clicks to install events and defines attribution rules

**PostgreSQL Table**: `attribution_mapping`
**MongoDB Collection**: `attribution_mapping`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| mapping_id | UUID | PRIMARY KEY | Unique mapping identifier |
| click_id | UUID | FK → clicks, INDEX | Associated click |
| event_id | UUID | FK → install_events, INDEX | Associated event |
| attribution_window_days | INTEGER | DEFAULT 7, 0-365 | Days within which event can be attributed to click |
| is_attributed | BOOLEAN | DEFAULT TRUE, INDEX | Whether attribution is confirmed |
| attribution_type | VARCHAR(50) | ENUM: first_click, last_click, linear, time_decay | Attribution model |
| created_at | TIMESTAMP | DEFAULT NOW() | Mapping creation time |
| UNIQUE(click_id, event_id) | - | - | One mapping per click-event pair |

**Key Considerations**:
- Supports multiple attribution models
- Configurable attribution windows (default 7 days)
- Can soft-delete by setting is_attributed = FALSE

---

### 5. DailyStatistics

**Purpose**: Pre-aggregated statistics for fast reporting

**PostgreSQL Table**: `daily_statistics`
**MongoDB Collection**: `daily_statistics`

| Field | Type | Constraints | Purpose |
|-------|------|-------------|---------|
| stat_id | SERIAL / ObjectId | PRIMARY KEY | Unique stat identifier |
| campaign_id | INTEGER / ObjectId | FK → campaigns, INDEX | Associated campaign |
| stat_date | DATE | NOT NULL, INDEX | Statistics date |
| total_clicks | INTEGER | DEFAULT 0 | Total clicks for day |
| total_installs | INTEGER | DEFAULT 0 | Total installs for day |
| total_revenue | DECIMAL(12,2) | DEFAULT 0 | Total revenue for day |
| android_clicks | INTEGER | DEFAULT 0 | Android platform clicks |
| ios_clicks | INTEGER | DEFAULT 0 | iOS platform clicks |
| conversion_rate | DECIMAL(5,4) | - | Calculated install/click ratio |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last aggregation time |
| UNIQUE(campaign_id, stat_date) | - | - | One record per campaign per day |

---

## Indexing Strategy

### PostgreSQL Indexing

#### Clicks Table Indexes
```sql
-- Most important for filtering and sorting
CREATE INDEX idx_clicks_campaign_created ON clicks(campaign_id, created_at DESC);
CREATE INDEX idx_clicks_platform_created ON clicks(platform, created_at DESC);
CREATE INDEX idx_clicks_utm_source_created ON clicks(utm_source, created_at DESC);
CREATE INDEX idx_clicks_created_at ON clicks(created_at DESC);

-- IDFA/AAID lookups (sparse index)
CREATE INDEX idx_clicks_idfa ON clicks(idfa) WHERE idfa IS NOT NULL;
CREATE INDEX idx_clicks_aaid ON clicks(aaid) WHERE aaid IS NOT NULL;

-- Device analytics
CREATE INDEX idx_clicks_device_model ON clicks(device_model);
```

#### InstallEvents Table Indexes
```sql
-- Join with clicks
CREATE INDEX idx_install_events_click_id ON install_events(click_id);

-- Event type filtering
CREATE INDEX idx_install_events_app_id_event ON install_events(app_id, event_name);

-- Time-based queries
CREATE INDEX idx_install_events_created_at ON install_events(created_at DESC);

-- Platform analytics
CREATE INDEX idx_install_events_platform ON install_events(platform);

-- User tracking
CREATE INDEX idx_install_events_user_id ON install_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_install_events_session_id ON install_events(session_id);
```

#### AttributionMapping Table Indexes
```sql
-- Lookups from clicks
CREATE INDEX idx_attribution_click_id ON attribution_mapping(click_id);

-- Lookups from events
CREATE INDEX idx_attribution_event_id ON attribution_mapping(event_id);

-- Model filtering
CREATE INDEX idx_attribution_model ON attribution_mapping(attribution_type);
```

#### DailyStatistics Table Indexes
```sql
-- Most common query pattern
CREATE INDEX idx_daily_stats_campaign_date ON daily_statistics(campaign_id, stat_date DESC);

-- Cross-campaign trending
CREATE INDEX idx_daily_stats_date ON daily_statistics(stat_date DESC);
```

### MongoDB Indexing

```javascript
// Clicks Collection
db.clicks.createIndex({ campaignId: 1, createdAt: -1 });
db.clicks.createIndex({ platform: 1, createdAt: -1 });
db.clicks.createIndex({ utmSource: 1, createdAt: -1 });
db.clicks.createIndex({ createdAt: -1 });
db.clicks.createIndex({ idfa: 1 }, { sparse: true });
db.clicks.createIndex({ aaid: 1 }, { sparse: true });
db.clicks.createIndex({ deviceModel: 1 });

// TTL Index - Auto-delete clicks after 90 days (optional)
db.clicks.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// InstallEvents Collection
db.install_events.createIndex({ clickId: 1, createdAt: -1 });
db.install_events.createIndex({ appId: 1, eventName: 1 });
db.install_events.createIndex({ createdAt: -1 });
db.install_events.createIndex({ platform: 1 });
db.install_events.createIndex({ userId: 1 }, { sparse: true });
db.install_events.createIndex({ sessionId: 1 });

// AttributionMapping Collection
db.attribution_mapping.createIndex({ clickId: 1 });
db.attribution_mapping.createIndex({ eventId: 1 });

// DailyStatistics Collection
db.daily_statistics.createIndex({ campaignId: 1, statDate: -1 }, { unique: true });
db.daily_statistics.createIndex({ statDate: -1 });
```

---

## Common Query Patterns

### 1. Get clicks for a campaign on a specific date
```sql
SELECT * FROM clicks 
WHERE campaign_id = $1 
  AND DATE(created_at) = $2 
ORDER BY created_at DESC 
LIMIT 100;
```

### 2. Get conversion rate by platform
```sql
SELECT 
  c.platform,
  COUNT(DISTINCT c.click_id) as total_clicks,
  COUNT(DISTINCT ie.event_id) as total_installs,
  COUNT(DISTINCT ie.event_id)::float / COUNT(DISTINCT c.click_id) as conversion_rate
FROM clicks c
LEFT JOIN install_events ie ON c.click_id = ie.click_id
WHERE c.campaign_id = $1
  AND c.created_at >= $2
GROUP BY c.platform;
```

### 3. Attribution analysis
```sql
SELECT 
  c.utm_source,
  c.utm_campaign,
  COUNT(*) as attributed_events,
  SUM(ie.revenue) as total_revenue
FROM attribution_mapping am
JOIN clicks c ON am.click_id = c.click_id
JOIN install_events ie ON am.event_id = ie.event_id
WHERE am.attribution_type = 'first_click'
  AND am.is_attributed = true
  AND ie.created_at >= $1
GROUP BY c.utm_source, c.utm_campaign
ORDER BY total_revenue DESC;
```

---

## Performance Optimization Tips

1. **Partitioning (PostgreSQL)**:
   - Consider partitioning `clicks` table by date for very high volume
   - Partition `install_events` by platform or date

2. **Sharding (MongoDB)**:
   - Shard on `campaignId` for horizontal scaling
   - Consider compound shard key: `{ campaignId: 1, createdAt: -1 }`

3. **Materialized Views (PostgreSQL)**:
   - Use for complex aggregations run frequently
   - Refresh on schedule using pg_cron

4. **Data Retention**:
   - Archive old click data (>90 days) to separate tables/collections
   - Keep event data longer for LTV analysis
   - Use TTL indexes in MongoDB for auto-cleanup

5. **Caching**:
   - Cache daily_statistics in Redis
   - Cache campaign configurations
   - Pre-calculate common metrics

---

## Migration from Legacy System

If migrating from an existing system:

1. Map old schema to new schema
2. Backfill historical data with correct timestamps
3. Validate attribution counts match
4. Run parallel systems during transition
5. Cutover during low-traffic period


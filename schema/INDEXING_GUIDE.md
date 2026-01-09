/**
 * Database Indexing Guide
 * Performance Optimization for Mobile Attribution System
 */

# Indexing Strategy & Recommendations

## Overview

Proper indexing is critical for attribution systems that handle high-volume queries. This document outlines indexing strategies for both PostgreSQL and MongoDB.

---

## PostgreSQL Indexing

### Index Types

1. **B-Tree** (default) - General purpose, good for range queries
2. **Hash** - Exact match lookups only
3. **GIN** - Good for array and JSONB queries
4. **BRIN** - Good for large tables with sorted data
5. **Partial** - Index only rows matching a condition

### Clicks Table - Core Indexes

```sql
-- Primary composite index for most common query (campaign + date)
CREATE INDEX idx_clicks_campaign_created 
  ON clicks(campaign_id, created_at DESC);

-- Platform analysis queries
CREATE INDEX idx_clicks_platform_created 
  ON clicks(platform, created_at DESC);

-- UTM source filtering
CREATE INDEX idx_clicks_utm_source_created 
  ON clicks(utm_source, created_at DESC);

-- Time-based queries
CREATE INDEX idx_clicks_created_at 
  ON clicks(created_at DESC);

-- Device ID lookups (sparse - only non-NULL values)
CREATE INDEX idx_clicks_idfa 
  ON clicks(idfa) WHERE idfa IS NOT NULL;

CREATE INDEX idx_clicks_aaid 
  ON clicks(aaid) WHERE aaid IS NOT NULL;

-- Device analytics
CREATE INDEX idx_clicks_device_model 
  ON clicks(device_model);

-- Full text search for user agents
CREATE INDEX idx_clicks_user_agent 
  ON clicks USING GIN(to_tsvector('english', user_agent));
```

**Size Impact**: ~50-100MB per 1M records

**Query Performance**:
- Campaign + date range: < 10ms (100M records)
- Platform breakdown: < 50ms (1B records)
- Device lookup: < 5ms

### InstallEvents Table - Core Indexes

```sql
-- Event to click relationship (critical for joins)
CREATE INDEX idx_install_events_click_id 
  ON install_events(click_id);

-- Event type + app filtering
CREATE INDEX idx_install_events_app_id_event 
  ON install_events(app_id, event_name);

-- Time-based queries
CREATE INDEX idx_install_events_created_at 
  ON install_events(created_at DESC);

-- Platform-specific analytics
CREATE INDEX idx_install_events_platform 
  ON install_events(platform);

-- User tracking (sparse index)
CREATE INDEX idx_install_events_user_id 
  ON install_events(user_id) WHERE user_id IS NOT NULL;

-- Session analysis
CREATE INDEX idx_install_events_session_id 
  ON install_events(session_id);

-- Revenue queries
CREATE INDEX idx_install_events_revenue 
  ON install_events(revenue) WHERE revenue IS NOT NULL;
```

**Size Impact**: ~30-60MB per 1M records

**Query Performance**:
- Click lookup: < 1ms
- Event type filtering: < 20ms
- Revenue analysis: < 100ms (1B records)

### AttributionMapping Table - Indexes

```sql
-- Primary lookups
CREATE INDEX idx_attribution_click_id 
  ON attribution_mapping(click_id);

CREATE INDEX idx_attribution_event_id 
  ON attribution_mapping(event_id);

-- Attribution model filtering
CREATE INDEX idx_attribution_type 
  ON attribution_mapping(attribution_type);

-- Composite for common queries
CREATE INDEX idx_attribution_type_is_attributed 
  ON attribution_mapping(attribution_type, is_attributed);
```

**Size Impact**: ~10-20MB per 1M records

### DailyStatistics Table - Indexes

```sql
-- Main reporting index
CREATE INDEX idx_daily_stats_campaign_date 
  ON daily_statistics(campaign_id, stat_date DESC);

-- Trend queries
CREATE INDEX idx_daily_stats_date 
  ON daily_statistics(stat_date DESC);
```

**Size Impact**: ~1-2MB per 1M records

### Partial Indexes (for active data only)

```sql
-- Index only active campaigns
CREATE INDEX idx_active_campaigns 
  ON campaigns(campaign_id) WHERE status = 'active';

-- Index only recent clicks (last 90 days)
CREATE INDEX idx_recent_clicks 
  ON clicks(campaign_id, created_at DESC) 
  WHERE created_at > CURRENT_DATE - INTERVAL '90 days';

-- Index only high-value events
CREATE INDEX idx_high_value_events 
  ON install_events(app_id, created_at DESC) 
  WHERE revenue > 100;
```

### Index Maintenance

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM clicks 
WHERE campaign_id = 1 
  AND created_at >= NOW() - INTERVAL '7 days';

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname NOT IN ('pg_catalog', 'information_schema');

-- Rebuild indexes
REINDEX INDEX CONCURRENTLY idx_clicks_campaign_created;

-- Vacuum and analyze
VACUUM ANALYZE clicks;
```

---

## MongoDB Indexing

### Index Types

1. **Single Field** - Index on one field
2. **Compound** - Index on multiple fields
3. **Text** - Full-text search
4. **Sparse** - Only indexes documents with the field
5. **TTL** - Auto-delete documents after expiry

### Clicks Collection - Core Indexes

```javascript
// Campaign + date queries (most frequent)
db.clicks.createIndex({ campaignId: 1, createdAt: -1 });

// Platform breakdown
db.clicks.createIndex({ platform: 1, createdAt: -1 });

// UTM source filtering
db.clicks.createIndex({ utmSource: 1, createdAt: -1 });

// Time-based queries
db.clicks.createIndex({ createdAt: -1 });

// Device ID lookups (sparse)
db.clicks.createIndex({ idfa: 1 }, { sparse: true });
db.clicks.createIndex({ aaid: 1 }, { sparse: true });

// Device analytics
db.clicks.createIndex({ deviceModel: 1 });

// Optional: TTL index to auto-delete clicks after 90 days
// (Uncomment to enable automatic data retention)
// db.clicks.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
```

**Size Impact**: ~40-80MB per 1M records

**Query Performance**:
- Campaign + date range: < 10ms
- Platform breakdown: < 50ms
- Device lookup: < 5ms

### InstallEvents Collection - Core Indexes

```javascript
// Event to click relationship
db.install_events.createIndex({ clickId: 1, createdAt: -1 });

// Event type + app filtering
db.install_events.createIndex({ appId: 1, eventName: 1 });

// Time-based queries
db.install_events.createIndex({ createdAt: -1 });

// Platform-specific analytics
db.install_events.createIndex({ platform: 1 });

// User tracking (sparse index)
db.install_events.createIndex({ userId: 1 }, { sparse: true });

// Session analysis
db.install_events.createIndex({ sessionId: 1 });

// Revenue queries (sparse)
db.install_events.createIndex({ revenue: 1 }, { sparse: true });
```

**Size Impact**: ~25-50MB per 1M records

### AttributionMapping Collection - Indexes

```javascript
// Primary lookups
db.attribution_mapping.createIndex({ clickId: 1 });
db.attribution_mapping.createIndex({ eventId: 1 });

// Compound index for common queries
db.attribution_mapping.createIndex({ 
  attributionType: 1, 
  isAttributed: 1 
});
```

**Size Impact**: ~8-15MB per 1M records

### DailyStatistics Collection - Indexes

```javascript
// Main reporting index
db.daily_statistics.createIndex({ 
  campaignId: 1, 
  statDate: -1 
}, { unique: true });

// Trend queries
db.daily_statistics.createIndex({ statDate: -1 });
```

**Size Impact**: ~1-2MB per 1M records

### Text Indexes (for search)

```javascript
// Search campaign names and descriptions
db.campaigns.createIndex({ 
  campaignName: 'text', 
  description: 'text' 
});

// Usage
db.campaigns.find({ 
  $text: { $search: 'summer 2024' } 
}).sort({ score: { $meta: 'textScore' } });
```

### Index Management

```javascript
// List all indexes
db.clicks.getIndexes();

// Get index statistics
db.clicks.aggregate([{ $indexStats: {} }]);

// Drop an index
db.clicks.dropIndex('campaignId_1_createdAt_-1');

// Monitor index performance
db.clicks.aggregate([
  {
    $indexStats: {}
  },
  {
    $sort: { 'accesses.ops': -1 }
  }
]);

// Rebuild indexes
db.clicks.reIndex();

// Check query plan
db.clicks.find({ campaignId: ObjectId('...'), createdAt: { $gte: Date() } }).explain('executionStats');
```

---

## Index Naming Convention

### PostgreSQL
```
idx_{table}_{field1}_{field2}_{direction}
```

Examples:
- `idx_clicks_campaign_created` - Ascending campaign, descending created_at
- `idx_install_events_click_id` - Single field index
- `idx_daily_stats_campaign_date` - Composite index

### MongoDB
```
MongoDB auto-generates names like: {field1}_{direction}_{field2}_{direction}
Can be customized with name parameter
```

---

## Common Query Optimization

### PostgreSQL Query Plans

```sql
-- Check if index is used
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM clicks 
WHERE campaign_id = 1 
  AND created_at >= NOW() - INTERVAL '7 days';

-- Expected output: Index Scan using idx_clicks_campaign_created
```

### MongoDB Explain Plans

```javascript
db.clicks.find({ 
  campaignId: ObjectId('...'), 
  createdAt: { $gte: new Date() } 
}).explain('executionStats');

// Check executionStats.executionStages.stage === 'IXSCAN'
// Lower executionStats.totalDocumentsExamined is better
```

---

## Scaling Considerations

### For 1B+ Clicks

**PostgreSQL**:
```sql
-- Partition table by date
CREATE TABLE clicks_2024_01 PARTITION OF clicks
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Partial indexes on recent data
CREATE INDEX idx_recent_clicks_2024_01 
ON clicks_2024_01(campaign_id, created_at DESC);
```

**MongoDB**:
```javascript
// Enable sharding
sh.shardCollection('attribution_db.clicks', { campaignId: 1, createdAt: -1 });

// Create indexes on shard key
db.clicks.createIndex({ campaignId: 1, createdAt: -1 });
```

### Memory Management

```sql
-- PostgreSQL: Set work_mem for sorts/hashes
SET work_mem = '256MB';  -- Per operation

-- Check cache hit ratio
SELECT 
  sum(heap_blks_read) as heap_read, 
  sum(heap_blks_hit) as heap_hit, 
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

---

## Monitoring & Alerts

### PostgreSQL

```sql
-- Monitor index bloat
SELECT 
  schemaname,
  tablename,
  indexname,
  round(100 * (pg_relation_size(indexrelid) - pg_relation_size(relfilenode)) / pg_relation_size(indexrelid)) as bloat_ratio
FROM pg_stat_user_indexes;

-- Alert if bloat > 20%
```

### MongoDB

```javascript
// Monitor index size
db.clicks.stats().indexSizes

// Alert if indexes > 30% of collection size
```

---

## Performance Benchmarks

| Operation | Without Index | With Index | Improvement |
|-----------|---------------|-----------|-------------|
| Single click lookup | 500ms | < 1ms | 500x |
| Campaign week view | 2000ms | 20ms | 100x |
| Platform breakdown | 5000ms | 100ms | 50x |
| Event attribution | 8000ms | 200ms | 40x |

---

## Best Practices

1. **Index creation is expensive** - Create during maintenance windows
2. **Monitor index usage** - Drop unused indexes
3. **Keep indexes small** - Use partial indexes when possible
4. **Order matters** - Put filtered fields first, then sorting fields
5. **Test before production** - Always benchmark index changes
6. **Regular maintenance** - Analyze, vacuum, and reindex periodically


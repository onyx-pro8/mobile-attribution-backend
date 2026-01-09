/**
 * PostgreSQL Database Access Layer
 * Handles queries for attribution system
 */

const pool = require('../config/database');

class ClickRepository {
  /**
   * Create a new click record
   */
  async createClick(clickData) {
    const {
      campaignId,
      utmSource,
      utmCampaign,
      utmAdgroup,
      utmCreative,
      platform,
      ipAddress,
      userAgent,
      deviceModel,
      osVersion,
      country,
      city,
      latitude,
      longitude,
      idfa,
      aaid
    } = clickData;

    const query = `
      INSERT INTO clicks (
        campaign_id, utm_source, utm_campaign, utm_adgroup, utm_creative,
        platform, ip_address, user_agent, device_model, os_version,
        country, city, latitude, longitude, idfa, aaid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const values = [
      campaignId, utmSource, utmCampaign, utmAdgroup, utmCreative,
      platform, ipAddress, userAgent, deviceModel, osVersion,
      country, city, latitude, longitude, idfa, aaid
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get clicks by campaign and date range
   */
  async getClicksByCampaign(campaignId, startDate, endDate, limit = 100, offset = 0) {
    const query = `
      SELECT *
      FROM clicks
      WHERE campaign_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5;
    `;

    const result = await pool.query(query, [campaignId, startDate, endDate, limit, offset]);
    return result.rows;
  }

  /**
   * Get conversion rate by platform
   */
  async getConversionRateByPlatform(campaignId, startDate, endDate) {
    const query = `
      SELECT 
        c.platform,
        COUNT(DISTINCT c.click_id) as total_clicks,
        COUNT(DISTINCT ie.event_id) as total_installs,
        ROUND(COUNT(DISTINCT ie.event_id)::float / NULLIF(COUNT(DISTINCT c.click_id), 0) * 100, 2) as conversion_rate
      FROM clicks c
      LEFT JOIN install_events ie ON c.click_id = ie.click_id
      WHERE c.campaign_id = $1
        AND c.created_at >= $2
        AND c.created_at <= $3
      GROUP BY c.platform;
    `;

    const result = await pool.query(query, [campaignId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get clicks by UTM source
   */
  async getClicksByUtmSource(campaignId, startDate, endDate) {
    const query = `
      SELECT 
        utm_source,
        COUNT(*) as click_count,
        COUNT(DISTINCT platform) as platform_count
      FROM clicks
      WHERE campaign_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY utm_source
      ORDER BY click_count DESC;
    `;

    const result = await pool.query(query, [campaignId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get device analytics
   */
  async getDeviceAnalytics(campaignId, startDate, endDate) {
    const query = `
      SELECT 
        device_model,
        os_version,
        platform,
        COUNT(*) as click_count,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM clicks
      WHERE campaign_id = $1
        AND created_at >= $2
        AND created_at <= $3
        AND device_model IS NOT NULL
      GROUP BY device_model, os_version, platform
      ORDER BY click_count DESC
      LIMIT 50;
    `;

    const result = await pool.query(query, [campaignId, startDate, endDate]);
    return result.rows;
  }
}

class InstallEventRepository {
  /**
   * Create a new install event
   */
  async createEvent(eventData) {
    const {
      clickId,
      appId,
      eventName,
      platform,
      revenue,
      currency,
      eventProperties,
      userId,
      sessionId
    } = eventData;

    const query = `
      INSERT INTO install_events (
        click_id, app_id, event_name, platform, revenue, currency,
        event_properties, user_id, session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      clickId, appId, eventName, platform, revenue, currency,
      JSON.stringify(eventProperties), userId, sessionId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get events by click ID
   */
  async getEventsByClickId(clickId) {
    const query = `
      SELECT *
      FROM install_events
      WHERE click_id = $1
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [clickId]);
    return result.rows;
  }

  /**
   * Get revenue by event type
   */
  async getRevenueByEventType(appId, startDate, endDate) {
    const query = `
      SELECT 
        event_name,
        currency,
        COUNT(*) as event_count,
        SUM(revenue) as total_revenue,
        AVG(revenue) as avg_revenue
      FROM install_events
      WHERE app_id = $1
        AND created_at >= $2
        AND created_at <= $3
        AND revenue IS NOT NULL
      GROUP BY event_name, currency
      ORDER BY total_revenue DESC;
    `;

    const result = await pool.query(query, [appId, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get LTV analysis (User Lifetime Value)
   */
  async getLtvAnalysis(appId, minDaysActive = 30) {
    const query = `
      SELECT 
        user_id,
        COUNT(DISTINCT session_id) as session_count,
        SUM(revenue) as total_revenue,
        AVG(revenue) as avg_revenue_per_event,
        MAX(created_at) - MIN(created_at) as days_active
      FROM install_events
      WHERE app_id = $1
        AND user_id IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
      GROUP BY user_id
      HAVING (MAX(created_at) - MIN(created_at)) >= $2 * INTERVAL '1 day'
      ORDER BY total_revenue DESC;
    `;

    const result = await pool.query(query, [appId, minDaysActive]);
    return result.rows;
  }
}

class AttributionRepository {
  /**
   * Create attribution mapping
   */
  async createMapping(mappingData) {
    const {
      clickId,
      eventId,
      attributionWindowDays,
      attributionType,
      isAttributed
    } = mappingData;

    const query = `
      INSERT INTO attribution_mapping (
        click_id, event_id, attribution_window_days, attribution_type, is_attributed
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (click_id, event_id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const values = [clickId, eventId, attributionWindowDays, attributionType, isAttributed];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get attribution summary by source
   */
  async getAttributionSummary(startDate, endDate, attributionType = 'first_click') {
    const query = `
      SELECT 
        c.utm_source,
        c.utm_campaign,
        COUNT(*) as attributed_events,
        SUM(ie.revenue) as total_revenue,
        COUNT(DISTINCT c.campaign_id) as campaign_count
      FROM attribution_mapping am
      JOIN clicks c ON am.click_id = c.click_id
      JOIN install_events ie ON am.event_id = ie.event_id
      WHERE am.attribution_type = $1
        AND am.is_attributed = true
        AND ie.created_at >= $2
        AND ie.created_at <= $3
      GROUP BY c.utm_source, c.utm_campaign
      ORDER BY total_revenue DESC;
    `;

    const result = await pool.query(query, [attributionType, startDate, endDate]);
    return result.rows;
  }

  /**
   * Get click-to-event time analysis
   */
  async getClickToEventTime(campaignId, startDate, endDate) {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM (ie.created_at - c.created_at))::int as hours_to_event,
        COUNT(*) as event_count,
        COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
      FROM attribution_mapping am
      JOIN clicks c ON am.click_id = c.click_id
      JOIN install_events ie ON am.event_id = ie.event_id
      WHERE c.campaign_id = $1
        AND ie.created_at >= $2
        AND ie.created_at <= $3
        AND am.is_attributed = true
      GROUP BY hours_to_event
      ORDER BY hours_to_event;
    `;

    const result = await pool.query(query, [campaignId, startDate, endDate]);
    return result.rows;
  }
}

class ReportRepository {
  /**
   * Generate daily statistics report
   */
  async generateDailyStats(campaignId, reportDate) {
    const query = `
      INSERT INTO daily_statistics (
        campaign_id, stat_date, total_clicks, total_installs, 
        total_revenue, android_clicks, ios_clicks, conversion_rate
      )
      SELECT
        $1 as campaign_id,
        $2 as stat_date,
        COUNT(DISTINCT c.click_id) as total_clicks,
        COUNT(DISTINCT ie.event_id) as total_installs,
        COALESCE(SUM(ie.revenue), 0) as total_revenue,
        COUNT(CASE WHEN c.platform = 'android' THEN 1 END) as android_clicks,
        COUNT(CASE WHEN c.platform = 'ios' THEN 1 END) as ios_clicks,
        ROUND(COUNT(DISTINCT ie.event_id)::float / NULLIF(COUNT(DISTINCT c.click_id), 0), 4) as conversion_rate
      FROM clicks c
      LEFT JOIN install_events ie ON c.click_id = ie.click_id
      WHERE c.campaign_id = $1
        AND DATE(c.created_at) = $2
      ON CONFLICT (campaign_id, stat_date) DO UPDATE SET
        total_clicks = EXCLUDED.total_clicks,
        total_installs = EXCLUDED.total_installs,
        total_revenue = EXCLUDED.total_revenue,
        android_clicks = EXCLUDED.android_clicks,
        ios_clicks = EXCLUDED.ios_clicks,
        conversion_rate = EXCLUDED.conversion_rate,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await pool.query(query, [campaignId, reportDate]);
    return result.rows[0];
  }

  /**
   * Get daily trends
   */
  async getDailyTrends(campaignId, startDate, endDate) {
    const query = `
      SELECT 
        stat_date,
        total_clicks,
        total_installs,
        total_revenue,
        android_clicks,
        ios_clicks,
        conversion_rate
      FROM daily_statistics
      WHERE campaign_id = $1
        AND stat_date >= $2
        AND stat_date <= $3
      ORDER BY stat_date DESC;
    `;

    const result = await pool.query(query, [campaignId, startDate, endDate]);
    return result.rows;
  }
}

module.exports = {
  ClickRepository,
  InstallEventRepository,
  AttributionRepository,
  ReportRepository
};

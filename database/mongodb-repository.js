/**
 * MongoDB Database Access Layer
 * Handles queries for attribution system using Mongoose
 */

const {
  Click,
  InstallEvent,
  AttributionMapping,
  DailyStatistics,
  Campaign
} = require('../schema/mongoose-schema');

class ClickRepository {
  /**
   * Create a new click record
   */
  async createClick(clickData) {
    try {
      const click = new Click(clickData);
      await click.save();
      return click.toObject();
    } catch (error) {
      throw new Error(`Failed to create click: ${error.message}`);
    }
  }

  /**
   * Get clicks by campaign and date range
   */
  async getClicksByCampaign(campaignId, startDate, endDate, limit = 100, offset = 0) {
    try {
      const clicks = await Click.find({
        campaignId: campaignId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return clicks;
    } catch (error) {
      throw new Error(`Failed to get clicks: ${error.message}`);
    }
  }

  /**
   * Get conversion rate by platform
   */
  async getConversionRateByPlatform(campaignId, startDate, endDate) {
    try {
      const result = await Click.aggregate([
        {
          $match: {
            campaignId: campaignId,
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$platform',
            totalClicks: { $addToSet: '$_id' },
            clickCount: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            platform: '$_id',
            totalClicks: { $size: '$totalClicks' },
            clickCount: 1
          }
        }
      ]);

      // Get install events for each platform
      const installCounts = await InstallEvent.aggregate([
        {
          $lookup: {
            from: 'clicks',
            localField: 'clickId',
            foreignField: '_id',
            as: 'clickInfo'
          }
        },
        {
          $match: {
            'clickInfo.campaignId': campaignId,
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$platform',
            installCount: { $sum: 1 }
          }
        }
      ]);

      // Merge results
      return result.map(r => {
        const install = installCounts.find(ic => ic._id === r.platform);
        return {
          platform: r.platform,
          totalClicks: r.totalClicks,
          totalInstalls: install?.installCount || 0,
          conversionRate: ((install?.installCount || 0) / r.totalClicks * 100).toFixed(2)
        };
      });
    } catch (error) {
      throw new Error(`Failed to get conversion rate: ${error.message}`);
    }
  }

  /**
   * Get clicks by UTM source
   */
  async getClicksByUtmSource(campaignId, startDate, endDate) {
    try {
      const clicks = await Click.aggregate([
        {
          $match: {
            campaignId: campaignId,
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$utmSource',
            clickCount: { $sum: 1 },
            platforms: { $addToSet: '$platform' }
          }
        },
        {
          $sort: { clickCount: -1 }
        },
        {
          $project: {
            _id: 0,
            utmSource: '$_id',
            clickCount: 1,
            platformCount: { $size: '$platforms' }
          }
        }
      ]);

      return clicks;
    } catch (error) {
      throw new Error(`Failed to get clicks by UTM source: ${error.message}`);
    }
  }

  /**
   * Get device analytics
   */
  async getDeviceAnalytics(campaignId, startDate, endDate) {
    try {
      const analytics = await Click.aggregate([
        {
          $match: {
            campaignId: campaignId,
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            deviceModel: { $ne: null }
          }
        },
        {
          $group: {
            _id: {
              deviceModel: '$deviceModel',
              osVersion: '$osVersion',
              platform: '$platform'
            },
            clickCount: { $sum: 1 },
            uniqueIps: { $addToSet: '$ipAddress' }
          }
        },
        {
          $sort: { clickCount: -1 }
        },
        {
          $limit: 50
        },
        {
          $project: {
            _id: 0,
            deviceModel: '$_id.deviceModel',
            osVersion: '$_id.osVersion',
            platform: '$_id.platform',
            clickCount: 1,
            uniqueIps: { $size: '$uniqueIps' }
          }
        }
      ]);

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get device analytics: ${error.message}`);
    }
  }

  /**
   * Get click by ID
   */
  async getClickById(clickId) {
    try {
      const click = await Click.findById(clickId).lean();
      return click;
    } catch (error) {
      throw new Error(`Failed to get click: ${error.message}`);
    }
  }
}

class InstallEventRepository {
  /**
   * Create a new install event
   */
  async createEvent(eventData) {
    try {
      const event = new InstallEvent(eventData);
      await event.save();
      return event.toObject();
    } catch (error) {
      throw new Error(`Failed to create event: ${error.message}`);
    }
  }

  /**
   * Get events by click ID
   */
  async getEventsByClickId(clickId) {
    try {
      const events = await InstallEvent.find({ clickId })
        .sort({ createdAt: -1 })
        .lean();
      return events;
    } catch (error) {
      throw new Error(`Failed to get events: ${error.message}`);
    }
  }

  /**
   * Get revenue by event type
   */
  async getRevenueByEventType(appId, startDate, endDate) {
    try {
      const revenue = await InstallEvent.aggregate([
        {
          $match: {
            appId: appId,
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            },
            revenue: { $ne: null }
          }
        },
        {
          $group: {
            _id: {
              eventName: '$eventName',
              currency: '$currency'
            },
            eventCount: { $sum: 1 },
            totalRevenue: { $sum: '$revenue' },
            avgRevenue: { $avg: '$revenue' }
          }
        },
        {
          $sort: { totalRevenue: -1 }
        },
        {
          $project: {
            _id: 0,
            eventName: '$_id.eventName',
            currency: '$_id.currency',
            eventCount: 1,
            totalRevenue: 1,
            avgRevenue: { $round: ['$avgRevenue', 2] }
          }
        }
      ]);

      return revenue;
    } catch (error) {
      throw new Error(`Failed to get revenue analytics: ${error.message}`);
    }
  }

  /**
   * Get LTV analysis (User Lifetime Value)
   */
  async getLtvAnalysis(appId, minDaysActive = 30) {
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const ltv = await InstallEvent.aggregate([
        {
          $match: {
            appId: appId,
            userId: { $ne: null },
            createdAt: { $gte: ninetyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$userId',
            sessionCount: { $addToSet: '$sessionId' },
            totalRevenue: { $sum: { $ifNull: ['$revenue', 0] } },
            avgRevenue: { $avg: '$revenue' },
            firstEvent: { $min: '$createdAt' },
            lastEvent: { $max: '$createdAt' }
          }
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            sessionCount: { $size: '$sessionCount' },
            totalRevenue: 1,
            avgRevenue: { $round: ['$avgRevenue', 2] },
            daysActive: {
              $ceil: {
                $divide: [
                  { $subtract: ['$lastEvent', '$firstEvent'] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          }
        },
        {
          $match: {
            daysActive: { $gte: minDaysActive }
          }
        },
        {
          $sort: { totalRevenue: -1 }
        }
      ]);

      return ltv;
    } catch (error) {
      throw new Error(`Failed to get LTV analysis: ${error.message}`);
    }
  }
}

class AttributionRepository {
  /**
   * Create attribution mapping
   */
  async createMapping(mappingData) {
    try {
      const mapping = new AttributionMapping(mappingData);
      await mapping.save();
      return mapping.toObject();
    } catch (error) {
      if (error.code === 11000) {
        // Handle duplicate key error
        const existing = await AttributionMapping.findOne({
          clickId: mappingData.clickId,
          eventId: mappingData.eventId
        }).lean();
        return existing;
      }
      throw new Error(`Failed to create attribution: ${error.message}`);
    }
  }

  /**
   * Get attribution summary by source
   */
  async getAttributionSummary(startDate, endDate, attributionType = 'first_click') {
    try {
      const summary = await AttributionMapping.aggregate([
        {
          $match: {
            attributionType: attributionType,
            isAttributed: true
          }
        },
        {
          $lookup: {
            from: 'clicks',
            localField: 'clickId',
            foreignField: '_id',
            as: 'clickData'
          }
        },
        {
          $lookup: {
            from: 'install_events',
            localField: 'eventId',
            foreignField: '_id',
            as: 'eventData'
          }
        },
        {
          $unwind: '$clickData'
        },
        {
          $unwind: '$eventData'
        },
        {
          $match: {
            'eventData.createdAt': {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: {
              utmSource: '$clickData.utmSource',
              utmCampaign: '$clickData.utmCampaign'
            },
            attributedEvents: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ['$eventData.revenue', 0] } },
            campaigns: { $addToSet: '$clickData.campaignId' }
          }
        },
        {
          $sort: { totalRevenue: -1 }
        },
        {
          $project: {
            _id: 0,
            utmSource: '$_id.utmSource',
            utmCampaign: '$_id.utmCampaign',
            attributedEvents: 1,
            totalRevenue: 1,
            campaignCount: { $size: '$campaigns' }
          }
        }
      ]);

      return summary;
    } catch (error) {
      throw new Error(`Failed to get attribution summary: ${error.message}`);
    }
  }

  /**
   * Get click-to-event time analysis
   */
  async getClickToEventTime(campaignId, startDate, endDate) {
    try {
      const timing = await AttributionMapping.aggregate([
        {
          $match: {
            isAttributed: true
          }
        },
        {
          $lookup: {
            from: 'clicks',
            localField: 'clickId',
            foreignField: '_id',
            as: 'clickData'
          }
        },
        {
          $lookup: {
            from: 'install_events',
            localField: 'eventId',
            foreignField: '_id',
            as: 'eventData'
          }
        },
        {
          $unwind: '$clickData'
        },
        {
          $unwind: '$eventData'
        },
        {
          $match: {
            'clickData.campaignId': campaignId,
            'eventData.createdAt': {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $project: {
            hoursToEvent: {
              $floor: {
                $divide: [
                  { $subtract: ['$eventData.createdAt', '$clickData.createdAt'] },
                  1000 * 60 * 60
                ]
              }
            }
          }
        },
        {
          $group: {
            _id: '$hoursToEvent',
            eventCount: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            _id: 0,
            hoursToEvent: '$_id',
            eventCount: 1
          }
        }
      ]);

      // Calculate percentages
      const total = timing.reduce((sum, t) => sum + t.eventCount, 0);
      return timing.map(t => ({
        ...t,
        percentage: ((t.eventCount / total) * 100).toFixed(2)
      }));
    } catch (error) {
      throw new Error(`Failed to get click-to-event timing: ${error.message}`);
    }
  }
}

class ReportRepository {
  /**
   * Generate daily statistics
   */
  async generateDailyStats(campaignId, reportDate) {
    try {
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Aggregate statistics
      const stats = await Click.aggregate([
        {
          $match: {
            campaignId: campaignId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalClicks: { $sum: 1 },
            androidClicks: {
              $sum: { $cond: [{ $eq: ['$platform', 'android'] }, 1, 0] }
            },
            iosClicks: {
              $sum: { $cond: [{ $eq: ['$platform', 'ios'] }, 1, 0] }
            }
          }
        }
      ]);

      const installs = await InstallEvent.countDocuments({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const revenue = await InstallEvent.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            revenue: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$revenue' }
          }
        }
      ]);

      const statData = {
        campaignId: campaignId,
        statDate: new Date(reportDate),
        totalClicks: stats[0]?.totalClicks || 0,
        totalInstalls: installs,
        totalRevenue: revenue[0]?.totalRevenue || 0,
        androidClicks: stats[0]?.androidClicks || 0,
        iosClicks: stats[0]?.iosClicks || 0,
        conversionRate: stats[0] ? (installs / stats[0].totalClicks).toFixed(4) : 0
      };

      // Upsert the record
      const updatedStats = await DailyStatistics.findOneAndUpdate(
        { campaignId, statDate: statData.statDate },
        statData,
        { upsert: true, new: true }
      ).lean();

      return updatedStats;
    } catch (error) {
      throw new Error(`Failed to generate daily stats: ${error.message}`);
    }
  }

  /**
   * Get daily trends
   */
  async getDailyTrends(campaignId, startDate, endDate) {
    try {
      const trends = await DailyStatistics.find({
        campaignId: campaignId,
        statDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
        .sort({ statDate: -1 })
        .lean();

      return trends;
    } catch (error) {
      throw new Error(`Failed to get daily trends: ${error.message}`);
    }
  }
}

module.exports = {
  ClickRepository,
  InstallEventRepository,
  AttributionRepository,
  ReportRepository
};

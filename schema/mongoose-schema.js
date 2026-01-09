/**
 * Mobile Attribution System - MongoDB Schema (Mongoose)
 * Optimized for flexible document structure and high-throughput tracking
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Campaign Schema
const campaignSchema = new Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    campaignName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 255
    },
    utmCampaign: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    advertiserId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'archived'],
      default: 'active'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    dailyBudget: {
      type: Number,
      min: 0,
      default: null
    },
    totalBudget: {
      type: Number,
      min: 0,
      default: null
    },
    description: {
      type: String,
      maxlength: 1000
    },
    createdBy: {
      type: String
    },
    updatedBy: {
      type: String
    }
  },
  {
    timestamps: true,
    collection: 'campaigns'
  }
);

// Click Schema - Core attribution tracking
const clickSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => require('crypto').randomUUID()
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true
    },
    utmSource: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    utmCampaign: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    utmAdgroup: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null
    },
    utmCreative: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'unknown'],
      required: true,
      index: true
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    deviceModel: {
      type: String,
      maxlength: 255,
      index: true,
      default: null
    },
    osVersion: {
      type: String,
      maxlength: 50,
      default: null
    },
    country: {
      type: String,
      maxlength: 2,
      default: null
    },
    city: {
      type: String,
      maxlength: 100,
      default: null
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null
    },
    idfa: {
      type: String,
      sparse: true,
      default: null,
      index: true
    },
    aaid: {
      type: String,
      sparse: true,
      default: null,
      index: true
    },
    customParams: {
      type: Map,
      of: String,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'clicks'
  }
);

// InstallEvent Schema - Post-click events
const installEventSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => require('crypto').randomUUID()
    },
    clickId: {
      type: String,
      required: true,
      index: true,
      ref: 'Click'
    },
    appId: {
      type: String,
      required: true,
      maxlength: 255,
      index: true
    },
    eventName: {
      type: String,
      enum: ['install', 'first_open', 'app_open', 'purchase', 'custom_event'],
      required: true,
      index: true
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'unknown'],
      required: true,
      index: true
    },
    revenue: {
      type: Number,
      min: 0,
      default: null
    },
    currency: {
      type: String,
      maxlength: 3,
      default: null
    },
    eventProperties: {
      type: Schema.Types.Mixed,
      default: null
    },
    userId: {
      type: String,
      sparse: true,
      index: true,
      default: null
    },
    sessionId: {
      type: String,
      default: null,
      index: true
    },
    processedAt: {
      type: Date,
      default: null
    },
    customData: {
      type: Map,
      of: Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'install_events'
  }
);

// Attribution Mapping Schema
const attributionMappingSchema = new Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    clickId: {
      type: String,
      required: true,
      index: true,
      ref: 'Click'
    },
    eventId: {
      type: String,
      required: true,
      index: true,
      ref: 'InstallEvent'
    },
    attributionWindowDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 365
    },
    isAttributed: {
      type: Boolean,
      default: true,
      index: true
    },
    attributionType: {
      type: String,
      enum: ['first_click', 'last_click', 'linear', 'time_decay'],
      default: 'first_click'
    }
  },
  {
    timestamps: true,
    collection: 'attribution_mapping',
    unique: [['clickId', 'eventId']]
  }
);

// Daily Statistics Schema
const dailyStatisticsSchema = new Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true
    },
    statDate: {
      type: Date,
      required: true,
      index: true
    },
    totalClicks: {
      type: Number,
      default: 0,
      min: 0
    },
    totalInstalls: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0
    },
    androidClicks: {
      type: Number,
      default: 0,
      min: 0
    },
    iosClicks: {
      type: Number,
      default: 0,
      min: 0
    },
    conversionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    platformBreakdown: {
      android: {
        clicks: { type: Number, default: 0 },
        installs: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 }
      },
      ios: {
        clicks: { type: Number, default: 0 },
        installs: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 }
      }
    }
  },
  {
    timestamps: true,
    collection: 'daily_statistics'
  }
);

// Create compound index for daily_statistics
dailyStatisticsSchema.index({ campaignId: 1, statDate: -1 }, { unique: true });

// Create indexes
clickSchema.index({ campaignId: 1, createdAt: -1 });
clickSchema.index({ platform: 1, createdAt: -1 });
clickSchema.index({ utmSource: 1, createdAt: -1 });
clickSchema.index({ createdAt: -1 });

installEventSchema.index({ clickId: 1, createdAt: -1 });
installEventSchema.index({ appId: 1, eventName: 1 });
installEventSchema.index({ createdAt: -1 });
installEventSchema.index({ platform: 1 });

attributionMappingSchema.index({ clickId: 1 });
attributionMappingSchema.index({ eventId: 1 });

dailyStatisticsSchema.index({ statDate: -1 });

// TTL Index to auto-delete old raw click data (optional - set to 90 days)
clickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Models
const Campaign = mongoose.model('Campaign', campaignSchema);
const Click = mongoose.model('Click', clickSchema);
const InstallEvent = mongoose.model('InstallEvent', installEventSchema);
const AttributionMapping = mongoose.model('AttributionMapping', attributionMappingSchema);
const DailyStatistics = mongoose.model('DailyStatistics', dailyStatisticsSchema);

module.exports = {
  Campaign,
  Click,
  InstallEvent,
  AttributionMapping,
  DailyStatistics,
  campaignSchema,
  clickSchema,
  installEventSchema,
  attributionMappingSchema,
  dailyStatisticsSchema
};

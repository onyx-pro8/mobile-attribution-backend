const mongoose = require('mongoose');
const { Schema } = mongoose;

const shortLinkSchema = new Schema(
  {
    shortCode: { type: String, required: true, unique: true, index: true },
    // stored campaign params
    utmSource: { type: String, default: null },
    utmCampaign: { type: String, default: null },
    utmAdgroup: { type: String, default: null },
    utmCreative: { type: String, default: null },
    // optional explicit redirect URLs
    androidUrl: { type: String, default: null },
    iosUrl: { type: String, default: null },
    // fallback identifiers to build store URLs
    androidPackage: { type: String, default: null },
    iosAppId: { type: String, default: null },
    // meta
    createdBy: { type: String, default: null },
    notes: { type: String, default: null }
  },
  {
    timestamps: true,
    collection: 'shortlinks'
  }
);

module.exports = mongoose.model('ShortLink', shortLinkSchema);

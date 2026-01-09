const { nanoid } = require('nanoid');
const ShortLink = require('../models/shortlink');
const { Click } = require('../schema/mongoose-schema');

// Helpers to build store URLs
const buildAndroidUrl = (androidUrl, androidPackage) => {
  if (androidUrl) return androidUrl;
  if (androidPackage) return `https://play.google.com/store/apps/details?id=${encodeURIComponent(androidPackage)}`;
  return null;
};

const buildIosUrl = (iosUrl, iosAppId) => {
  if (iosUrl) return iosUrl;
  if (!iosAppId) return null;
  // iosAppId can be numeric id or full id string
  const id = iosAppId.startsWith('id') ? iosAppId : `id${iosAppId}`;
  return `https://apps.apple.com/app/apple-store/${id}`;
};

// POST /links
const createShortLink = async (req, res, next) => {
  try {
    const {
      utm_source,
      utm_campaign,
      utm_adgroup,
      utm_creative,
      androidUrl,
      iosUrl,
      androidPackage,
      iosAppId,
      createdBy,
      notes
    } = req.body;

    // generate short code
    let shortCode = nanoid(8);

    // ensure uniqueness (rare collision)
    let exists = await ShortLink.findOne({ shortCode });
    let attempts = 0;
    while (exists && attempts < 5) {
      shortCode = nanoid(8);
      exists = await ShortLink.findOne({ shortCode });
      attempts += 1;
    }

    if (exists) {
      return res.status(500).json({ success: false, error: 'Failed to generate unique short code' });
    }

    const doc = new ShortLink({
      shortCode,
      utmSource: utm_source || null,
      utmCampaign: utm_campaign || null,
      utmAdgroup: utm_adgroup || null,
      utmCreative: utm_creative || null,
      androidUrl: androidUrl || null,
      iosUrl: iosUrl || null,
      androidPackage: androidPackage || null,
      iosAppId: iosAppId || null,
      createdBy: createdBy || null,
      notes: notes || null
    });

    await doc.save();

    res.status(201).json({
      success: true,
      data: {
        shortCode: doc.shortCode,
        url: `${req.protocol}://${req.get('host')}/r/${doc.shortCode}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /r/:shortCode?platform=android|ios
const handleRedirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const platformQuery = (req.query.platform || '').toLowerCase();

    const link = await ShortLink.findOne({ shortCode }).lean();
    if (!link) {
      return res.status(404).json({ success: false, error: 'Short link not found' });
    }

    // determine platform: explicit query param else try to infer from UA
    let platform = 'unknown';
    if (platformQuery === 'android' || platformQuery === 'ios') platform = platformQuery;
    else {
      const ua = (req.get('user-agent') || '').toLowerCase();
      if (ua.includes('android')) platform = 'android';
      else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) platform = 'ios';
    }

    // create a click for attribution and preserve click id
    const click = new Click({
      campaignId: null,
      utmSource: link.utmSource || null,
      utmCampaign: link.utmCampaign || null,
      utmAdgroup: link.utmAdgroup || null,
      utmCreative: link.utmCreative || null,
      platform: platform === 'unknown' ? 'unknown' : platform,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      deviceModel: null
    });

    await click.save();

    // Build redirect URL
    const androidTarget = buildAndroidUrl(link.androidUrl, link.androidPackage);
    const iosTarget = buildIosUrl(link.iosUrl, link.iosAppId);

    let target = null;
    if (platform === 'android' && androidTarget) target = androidTarget;
    else if (platform === 'ios' && iosTarget) target = iosTarget;
    else if (androidTarget && !iosTarget) target = androidTarget;
    else if (iosTarget && !androidTarget) target = iosTarget;
    else {
      // Fallback: return JSON with both store URLs (no UI, per requirement)
      return res.status(200).json({
        success: true,
        data: {
          message: 'No store URL available for detected platform',
          android: androidTarget,
          ios: iosTarget,
          click_id: click._id
        }
      });
    }

    // Append click id for attribution
    const separator = target.includes('?') ? '&' : '?';
    const redirectUrl = `${target}${separator}click_id=${encodeURIComponent(click._id.toString())}`;

    // Use 302 redirect
    return res.redirect(302, redirectUrl);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createShortLink,
  handleRedirect
};

/**
 * Lingoa Website Tracking, Attribution & Store Configuration
 * ----------------------------------------------------------
 * Drop your Meta Pixel ID and GA4 Measurement ID below (1 line each).
 * All Play Store CTAs automatically forward incoming ad UTMs into
 * Google Play's `referrer` parameter so Firebase Analytics attributes
 * exact installs & in-app lessons back to every ad campaign.
 */
window.LINGOA_CONFIG = {
  APP_VERSION: '2.6.0',
  PLAY_PACKAGE_ID: 'com.lingoa.lingoa',
  PLAY_BASE_URL: 'https://play.google.com/store/apps/details?id=com.lingoa.lingoa',

  // Paste your IDs when ready (leave empty '' to keep tracking dormant safely)
  META_PIXEL_ID: '',       // Example: '1234567890123456'
  GA4_MEASUREMENT_ID: '',  // Example: 'G-XXXXXXXXXX'

  DEFAULT_UTM: {
    utm_source: 'lingoa_website',
    utm_medium: 'landing_page',
    utm_campaign: 'organic_web'
  }
};

(function initLingoaTracking() {
  const cfg = window.LINGOA_CONFIG;
  const params = new URLSearchParams(window.location.search);

  // Capture & persist incoming UTMs + fbclid/gclid for this session
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
  const captured = {};
  utmKeys.forEach((key) => {
    const val = params.get(key);
    if (val) captured[key] = val.slice(0, 120);
  });

  if (Object.keys(captured).length > 0) {
    try {
      sessionStorage.setItem('lingoa_utms', JSON.stringify(captured));
    } catch (_) {}
  }

  function getAttribution() {
    let saved = {};
    try {
      const raw = sessionStorage.getItem('lingoa_utms');
      if (raw) saved = JSON.parse(raw);
    } catch (_) {}
    return Object.assign({}, cfg.DEFAULT_UTM, saved);
  }

  /**
   * Builds a Google Play Store URL with properly double-encoded Play Install Referrer
   * so Firebase Analytics & Google Play Console record the exact ad source & CTA placement.
   */
  window.buildLingoaPlayUrl = function buildLingoaPlayUrl(placement) {
    const attr = getAttribution();
    const refParams = new URLSearchParams();
    refParams.set('utm_source', attr.utm_source || 'lingoa_website');
    refParams.set('utm_medium', attr.utm_medium || 'landing_page');
    refParams.set('utm_campaign', attr.utm_campaign || 'organic_web');
    refParams.set('utm_content', attr.utm_content || placement || 'hero_cta');
    if (attr.utm_term) refParams.set('utm_term', attr.utm_term);
    if (attr.fbclid) refParams.set('fbclid', attr.fbclid);
    if (attr.gclid) refParams.set('gclid', attr.gclid);
    return cfg.PLAY_BASE_URL + '&referrer=' + encodeURIComponent(refParams.toString());
  };

  // Lazy-init Meta Pixel if configured
  if (cfg.META_PIXEL_ID) {
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', cfg.META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  // Lazy-init Google Analytics 4 if configured
  if (cfg.GA4_MEASUREMENT_ID) {
    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.GA4_MEASUREMENT_ID);
    document.head.appendChild(gtagScript);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', cfg.GA4_MEASUREMENT_ID);
  }

  /**
   * Unified event dispatcher for Meta Pixel + GA4 + local diagnostics.
   */
  window.trackLingoaEvent = function trackLingoaEvent(eventName, payload) {
    const data = Object.assign({ placement: 'unknown' }, payload || {}, getAttribution());
    try {
      if (typeof window.fbq === 'function') {
        if (eventName === 'InitiateDownload') {
          window.fbq('track', 'Lead', { content_name: 'GooglePlayClick', content_category: data.placement });
          window.fbq('trackCustom', 'PlayStoreClick', data);
        } else if (eventName === 'CompleteQuiz') {
          window.fbq('track', 'CompleteRegistration', { content_name: 'PlacementQuiz', value: data.score || 0 });
          window.fbq('trackCustom', 'CompleteQuiz', data);
        } else {
          window.fbq('trackCustom', eventName, data);
        }
      }
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, data);
      }
    } catch (_) {}
  };
})();

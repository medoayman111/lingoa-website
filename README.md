# Lingoa Official Website (`v2.6`)

High-conversion, Arabic-first bilingual landing page, squad deep-link invite handler, and legal/monetization verification hub for **Lingoa — Master Oxford English Vocabulary**.

## Pages & Endpoints
- **Landing Page:** `index.html` (`/`) — Arabic-first (`dir="rtl"`) + English (`?lang=en`), interactive 30-second Oxford level test with live Nasseh Rive robot (`assets/robot.riv`), 3D FSRS-5 flashcard, audio Oxford marquee, v2.6 Bento showcase, WebP optimization (`assets/webp/`), OpenGraph (`assets/og-lingoa.jpg`), and dynamic Play Store UTM referrer forwarding.
- **Squad Deep-Link Invite:** `join.html` (`/join/:code`) — One-tap Android Intent & fallback to Google Play.
- **Legal & Verification:** `privacy.html`, `terms.html`, `app-ads.txt`, `.well-known/assetlinks.json`, `.well-known/apple-app-site-association`.
- **SEO:** `robots.txt`, `sitemap.xml`, `404.html`.

## Analytics Configuration
Set `META_PIXEL_ID` and `GA4_MEASUREMENT_ID` in `js/config.js` to enable Meta Pixel (`StartQuiz`, `CompleteQuiz`, `PlayStoreClick`, `Lead`) and GA4 tracking automatically.

## Developer
- **Mohammed Ayman Hagras** — `mohammedaymanhagras@gmail.com`

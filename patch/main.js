const { app, session } = require('electron');

const adHosts = [
  /(^|\.)doubleclick\.net$/,
  /(^|\.)googlesyndication\.com$/,
  /(^|\.)googleadservices\.com$/,
  /(^|\.)googletagservices\.com$/,
  /(^|\.)googletagmanager\.com$/,
  /(^|\.)google-analytics\.com$/,
  /(^|\.)analytics\.google\.com$/,
  /(^|\.)2mdn\.net$/,
  /(^|\.)adservice\.google\.com$/,
  /(^|\.)fuseplatform\.net$/,
  /(^|\.)btloader\.com$/,
  /(^|\.)confiant-integrations\.net$/,
  /(^|\.)imasdk\.googleapis\.com$/,
  /(^|\.)adsafeprotected\.com$/,
  /(^|\.)moatads\.com$/,
  /(^|\.)amazon-adsystem\.com$/,
  /(^|\.)casalemedia\.com$/,
  /(^|\.)criteo\.(com|net)$/,
  /(^|\.)pubmatic\.com$/,
  /(^|\.)indexww\.com$/,
  /(^|\.)adsrvr\.org$/,
  /(^|\.)yieldmo\.com$/,
  /(^|\.)adform\.net$/,
  /(^|\.)adnxs\.com$/,
  /(^|\.)adnxs-simple\.com$/,
  /(^|\.)rubiconproject\.com$/,
  /(^|\.)magnite\.com$/,
  /(^|\.)smartadserver\.com$/,
  /(^|\.)teads\.tv$/,
  /(^|\.)gumgum\.com$/,
  /(^|\.)33across\.com$/,
  /(^|\.)sharethrough\.com$/,
  /(^|\.)lijit\.com$/,
  /(^|\.)sovrn\.com$/,
  /(^|\.)openx\.net$/,
  /(^|\.)triplelift\.com$/,
  /(^|\.)improvedigital\.com$/,
  /(^|\.)districtm\.io$/,
  /(^|\.)spotxchange\.com$/,
  /(^|\.)bidswitch\.net$/,
  /(^|\.)yieldlab\.net$/,
  /(^|\.)stickyadstv\.com$/,
  /(^|\.)undertone\.com$/,
  /(^|\.)ad-delivery\.net$/,
  /(^|\.)taboola\.com$/,
  /(^|\.)outbrain\.com$/,
];

const adCss = `
  div.fuse-slot,
  div[id^="fuse-slot-"],
  div[id^="google_ads_iframe_"],
  iframe[id^="google_ads_iframe"],
  iframe[src*="doubleclick.net"],
  iframe[src*="googlesyndication.com"],
  iframe[src*="imasdk.googleapis.com"],
  div[id^="div-gpt-ad"],
  div[class*="style__Ads"],
  div[class*="style__AdsBillboard"],
  div[id="prebid-video-player"],
  div[class*="_adContainer"],
  div[class*="_38sROG_holder"],
  div[draggable="true"][class*="_holderVisible"] {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    min-width: 0 !important;
    min-height: 0 !important;
  }
`;

const adScript = `(() => {
  if (window.__adClean) return;
  window.__adClean = true;

  const sel = [
    'div.fuse-slot',
    'div[id^="fuse-slot-"]',
    'div[id^="google_ads_iframe_"]',
    'iframe[id^="google_ads_iframe"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="imasdk.googleapis.com"]',
    'div[id^="div-gpt-ad"]',
    'div[class*="style__Ads"]',
    'div[class*="style__AdsBillboard"]',
    'div[id="prebid-video-player"]',
    'div[class*="_adContainer"]',
    'div[class*="_38sROG_holder"]',
    'div[draggable="true"][class*="_holderVisible"]'
  ].join(',');

  const hide = el => {
    if (!el || el.dataset.off) return;
    el.dataset.off = '1';
    el.style.setProperty('display', 'none', 'important');
  };

  const sweep = () => {
    document.querySelectorAll(sel).forEach(hide);
    document.querySelectorAll('div[class*="style__Banner-"]').forEach(el => {
      const text = (el.innerText || '').toLowerCase();
      if (text.includes('premium') || text.includes('upgrade') || text.includes('reklams')) hide(el);
    });
  };

  let wait = false;
  const run = () => {
    if (wait) return;
    wait = true;
    setTimeout(() => {
      wait = false;
      sweep();
    }, 250);
  };

  sweep();
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(sweep, 2000);
})();`;

function denied(host) {
  return adHosts.some(re => re.test(host));
}

function watch(ses) {
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (req, done) => {
    let host;
    try {
      host = new URL(req.url).hostname;
    } catch {
      return done({});
    }
    done({ cancel: denied(host) });
  });
}

function attach(wc) {
  const apply = () => {
    if (wc.isDestroyed()) return;
    wc.insertCSS(adCss).catch(() => {});
    wc.executeJavaScript(adScript, true).catch(() => {});
  };

  wc.on('dom-ready', apply);
  wc.on('did-finish-load', apply);
  wc.on('did-navigate-in-page', apply);
}

function start() {
  watch(session.defaultSession);
  app.on('web-contents-created', (_, wc) => attach(wc));
}

if (app.isReady()) start();
else app.whenReady().then(start);

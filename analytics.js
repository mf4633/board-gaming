(function () {
  try {
    var url = 'https://hc-refactored.fly.dev/api/analytics/pageview';
    var qs = new URLSearchParams(location.search);
    var payload = JSON.stringify({
      site: 'boardgaminghub.com',
      path: location.pathname,
      referrer: document.referrer,
      screen: screen.width + 'x' + screen.height,
      utm_source: qs.get('utm_source') || '',
      utm_medium: qs.get('utm_medium') || '',
      utm_campaign: qs.get('utm_campaign') || '',
      utm_term: qs.get('utm_term') || '',
      utm_content: qs.get('utm_content') || ''
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    }
  } catch (e) { /* never break the page */ }
})();

(function () {
  try {
    var url = 'https://hc-refactored.fly.dev/api/analytics/pageview';
    var payload = JSON.stringify({
      site: 'boardgaminghub.com',
      path: location.pathname,
      referrer: document.referrer,
      screen: screen.width + 'x' + screen.height
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    }
  } catch (e) { /* never break the page */ }
})();

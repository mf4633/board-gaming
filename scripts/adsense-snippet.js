/**
 * AdSense head block shared by the generators and scripts/stamp-adsense.js.
 *
 * The meta tag is Google's site-ownership check and is inert on its own. The
 * loader only fires in a normal browser on boardgaminghub.com: the Capacitor
 * Play ports copy these HTML files verbatim (make-android-port.py) and the
 * Fire TV app shows the live site in a WebView, and AdSense web ads are not
 * allowed inside apps (those use AdMob).
 */
const PUB = 'ca-pub-2835365593874464';

const BEGIN = '<!-- adsense -->';
const END = '<!-- /adsense -->';

const block = `${BEGIN}
<meta name="google-adsense-account" content="${PUB}">
<script>
(function () {
  var h = location.hostname, ua = navigator.userAgent || '';
  if (h !== 'boardgaminghub.com' && h !== 'www.boardgaminghub.com') return;
  if (window.Capacitor || / BoardGamingHubTV\\//.test(ua) || /; wv\\)/.test(ua)) return;
  var s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}';
  document.head.appendChild(s);
})();
</script>
${END}`;

// Insert or refresh the block just before </head>. Idempotent.
function stamp(html) {
  const re = new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\r?\\n?');
  html = html.replace(re, '');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const i = html.search(/<\/head>/i);
  if (i < 0) throw new Error('no </head>');
  return html.slice(0, i) + block.replace(/\n/g, eol) + eol + html.slice(i);
}

module.exports = { PUB, block, stamp };

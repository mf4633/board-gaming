// nav.js drops the site header inside the Fire TV app and must keep rendering
// it everywhere else. That guard runs on every page of the site, so a wrong
// regex would silently strip navigation for every visitor.
//   PW_CHROMIUM=/path/to/chrome node tests/nav-tv.e2e.js
const path=require('path'), fs=require('fs'), http=require('http');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const T={'.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg'};
const data=JSON.parse(fs.readFileSync(ROOT+'/games.json','utf8'));
const S={'/':'/index.html','/tv':'/tv.html','/play':'/play.html'};
for(const g of data.games) S['/'+g.slug]='/'+g.sourceHtml;
const srv=http.createServer((q,r)=>{let rel=decodeURIComponent(q.url.split('?')[0]);if(S[rel])rel=S[rel];
 const f=path.join(ROOT,rel); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end('nf');return;}
 r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
const DESKTOP='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TVUA=DESKTOP+' BoardGamingHubTV/1.0';
srv.listen(0,'127.0.0.1',async()=>{
  const port=srv.address().port, base='http://127.0.0.1:'+port;
  const exe=process.env.PW_CHROMIUM;
  const b=await chromium.launch(exe?{executablePath:exe}:{});
  let bad=0;
  for(const [label,ua,expect] of [['desktop',DESKTOP,true],['fire tv app',TVUA,false]]){
    for(const url of ['/chess','/floodline','/solitaire']){
      const p=await b.newPage({userAgent:ua});
      await p.goto(base+url,{waitUntil:'load'});
      await p.waitForTimeout(700);
      const has=await p.evaluate(()=>!!document.querySelector('.bgh-head'));
      const rail=await p.evaluate(()=>!!document.querySelector('.bgh-rail'));
      const ok=has===expect;
      if(!ok)bad++;
      console.log(`${ok?'ok  ':'FAIL'} ${label.padEnd(12)} ${url.padEnd(12)} nav=${has} rail=${rail} (expected nav=${expect})`);
      await p.close();
    }
  }
  await b.close(); srv.close();
  process.exit(bad?1:0);
});

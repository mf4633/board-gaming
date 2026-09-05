// physics/vec.js — 3-vector helpers shared by every kernel.
// Source of truth for the region between the @@BEGIN/@@END markers in
// BiosphereBlue.html; run `node scripts/sync-physics.js` after editing.
function vSub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function vScale(a,s){return [a[0]*s,a[1]*s,a[2]*s];}
function vDot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function vCross(a,b){return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];}
function vLen(a){return Math.sqrt(vDot(a,a));}
function vNorm(a){var l=vLen(a);return l<1e-12?[0,0,0]:[a[0]/l,a[1]/l,a[2]/l];}
function clamp(x,lo,hi){return x<lo?lo:(x>hi?hi:x);}
function lerp(a,b,t){return a+(b-a)*t;}
function lerpRgb(a,b,t){return [lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { vSub:vSub, vScale:vScale, vDot:vDot, vCross:vCross, vLen:vLen, vNorm:vNorm, clamp:clamp, lerp:lerp, lerpRgb:lerpRgb };
}

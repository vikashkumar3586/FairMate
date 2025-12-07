// Shared avatar utilities: resolve avatar URL with fallbacks
// Priority: uploaded avatar (absolute or API relative) -> Gravatar (by email) -> ""

const API_BASE = import.meta.env.VITE_BACKEND_URL;

// Lightweight MD5 for Gravatar hashing (email -> hash)
function md5(str) {
  function cmn(q, a, b, x, s, t) {
    a = (((a + q) | 0) + ((x + t) | 0)) | 0;
    return (((a << s) | (a >>> (32 - s))) + b) | 0;
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
  function toBytes(str) {
    const utf8 = unescape(encodeURIComponent(str));
    const bytes = new Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
    return bytes;
  }
  function toWords(bytes) {
    const words = [];
    for (let i = 0; i < bytes.length; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    return words;
  }
  function toHex(words) {
    const hex = [];
    for (let i = 0; i < 4; i++) {
      let w = words[i];
      for (let j = 0; j < 4; j++) {
        const b = (w >> (j * 8)) & 255;
        const h = (b + 0x100).toString(16).slice(1);
        hex.push(h);
      }
    }
    return hex.join("");
  }
  const x = toWords(toBytes(str));
  const len = str.length * 8;
  x[len >> 5] |= 0x80 << (len % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i + 0], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = ii(a, b, c, d, x[i + 0], 6, 681279174);
    d = ii(d, a, b, c, x[i + 7], 10, -358537222);
    c = ii(c, d, a, b, x[i + 14], 15, -722521979);
    b = ii(b, c, d, a, x[i + 5], 21, 76029189);
    a = ii(a, b, c, d, x[i + 12], 6, -640364487);
    d = ii(d, a, b, c, x[i + 3], 10, -421815835);
    c = ii(c, d, a, b, x[i + 10], 15, 530742520);
    b = ii(b, c, d, a, x[i + 1], 21, -995338651);
    a = (a + oa) | 0; b = (b + ob) | 0; c = (c + oc) | 0; d = (d + od) | 0;
  }
  return toHex([a, b, c, d]);
}

const isAbsoluteUrl = (url) => /^https?:\/\//i.test(url || "");

export const getAvatarUrl = (user) => {
  if (user?.avatarUrl) {
    return isAbsoluteUrl(user.avatarUrl) ? user.avatarUrl : `${API_BASE}${user.avatarUrl}`;
  }
  if (user?.email) {
    const hash = md5(user.email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  }
  return "";
};

export const getAvatarFallbackInitial = (user) => {
  const base = user?.name || user?.email || "U";
  return base.charAt(0).toUpperCase();
};

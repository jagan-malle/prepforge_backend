export const cleanText=text=>String(text||'').replace(/\u0000/g,' ').replace(/\s+/g,' ').trim();

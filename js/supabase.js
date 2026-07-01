/* ── supabase.js ─────────────────────────────────────────
   Lightweight Supabase REST client untuk Gallery Frontend
   Tidak pakai SDK — pure fetch aja cukup untuk read-only
──────────────────────────────────────────────────────── */

const SB_URL    = 'https://ocedszxukzrnmvrecrnx.supabase.co';
const SB_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZWRzenh1a3pybm12cmVjcm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjI4ODAsImV4cCI6MjA5Nzg5ODg4MH0.fxgMdyZlbp0V20oSvI6ZgnZNgWFh4g0iHMI4SxYLkkE';

async function sbGet(table, params) {
  const qs  = params ? '?' + params : '';
  const res = await fetch(`${SB_URL}/rest/v1/${table}${qs}`, {
    headers: {
      'apikey':        SB_ANON,
      'Authorization': 'Bearer ' + SB_ANON,
      'Content-Type':  'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${table}: ${res.status}`);
  return res.json();
}

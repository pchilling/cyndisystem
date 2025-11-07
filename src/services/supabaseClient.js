const { createClient } = require('@supabase/supabase-js');

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('Missing SUPABASE_URL');

  const key = service || anon;
  if (!key) throw new Error('Missing SUPABASE keys');

  return createClient(url, key, {
    auth: {
      persistSession: false
    }
  });
}

module.exports = { createSupabaseClient }; 
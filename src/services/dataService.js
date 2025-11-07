const useSupabase = String(process.env.USE_SUPABASE || '').toLowerCase() === 'true';
const NotionService = require('./notionService');
let SupabaseService = null;

if (useSupabase) {
  try {
    SupabaseService = require('./supabaseService');
  } catch (e) {
    console.warn('[DataService] USE_SUPABASE=true 但 SupabaseService 載入失敗，將回退到 NotionService:', e.message);
  }
}

const ActiveService = (useSupabase && SupabaseService) ? SupabaseService : NotionService;

module.exports = ActiveService; 
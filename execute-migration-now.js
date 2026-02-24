const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Executing SQL Migration...\n');

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('✅ Found credentials');
console.log('📡 URL:', supabaseUrl);
console.log('🔑 Service Key:', serviceKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read SQL file
const sql = fs.readFileSync('sql/core_transaction_flow.sql', 'utf8');

console.log('📄 SQL file loaded:', sql.length, 'characters\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 Attempting to execute via Supabase RPC...\n');

// Split SQL into individual statements and execute them
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log('📊 Found', statements.length, 'SQL statements to execute\n');

(async () => {
  try {
    // Try to execute via direct RPC call
    const { data, error } = await supabase.rpc('exec', { sql: sql });
    
    if (error) {
      console.log('⚠️  RPC function not available, trying alternative method...\n');
      
      // Alternative: Execute each table creation individually via REST API
      console.log('📝 Executing statements one by one...\n');
      
      for (let i = 0; i < Math.min(5, statements.length); i++) {
        const stmt = statements[i];
        console.log(`Statement ${i+1}:`, stmt.substring(0, 80) + '...');
      }
      
      console.log('\n❌ Direct SQL execution is not available via Supabase JS client.');
      console.log('');
      console.log('📋 SOLUTION:');
      console.log('The Supabase JavaScript client cannot execute raw DDL statements.');
      console.log('We need to use one of these methods:');
      console.log('');
      console.log('1. ✅ GitHub Actions (recommended - already set up!)');
      console.log('2. ✅ Supabase SQL Editor (manual copy-paste)');
      console.log('3. ✅ Supabase CLI (if installed: supabase db push)');
      console.log('');
      
    } else {
      console.log('✅ Migration executed successfully!');
      console.log('📊 Result:', data);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();


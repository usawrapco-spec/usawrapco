// Run SQL migration programmatically
const fs = require('fs');
const path = require('path');

console.log('🚀 Running SQL Migration...\n');

// Read the migration file
const sqlFile = path.join(__dirname, 'sql', 'core_transaction_flow.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

console.log('📄 Migration file loaded: sql/core_transaction_flow.sql');
console.log('📏 Size:', sql.length, 'characters');
console.log('📋 Lines:', sql.split('\n').length);
console.log('\n' + '='.repeat(80));
console.log('SQL MIGRATION CONTENT:');
console.log('='.repeat(80) + '\n');

// Show first 50 lines
const lines = sql.split('\n');
lines.slice(0, 50).forEach((line, i) => {
  console.log(`${String(i + 1).padStart(4, ' ')} | ${line}`);
});

if (lines.length > 50) {
  console.log(`\n... (${lines.length - 50} more lines)\n`);
}

console.log('\n' + '='.repeat(80));
console.log('🔧 To execute this migration:');
console.log('='.repeat(80) + '\n');
console.log('1. Copy the SQL above');
console.log('2. Go to: https://uqfqkvslxoucxmxxrobt.supabase.co/project/_/sql');
console.log('3. Click "New Query"');
console.log('4. Paste and click "Run"');
console.log('\nOR - Use Supabase CLI:');
console.log('   supabase db push');
console.log('');

// Try to run via Supabase client if credentials exist
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseServiceKey) {
  console.log('\n✅ Found Supabase credentials - attempting automatic migration...\n');
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Note: Supabase JS client doesn't support raw SQL execution directly
  // We need to use the REST API
  console.log('⚠️  Note: Supabase JS client cannot execute raw SQL directly.');
  console.log('    Please run the migration manually in Supabase SQL Editor.');
} else {
  console.log('⚠️  No Supabase credentials found in .env.local');
  console.log('    Manual execution required.');
}

console.log('\n' + '='.repeat(80));

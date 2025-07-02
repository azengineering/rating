import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema creation function (run this once to set up your tables)
export const initializeDatabase = async () => {
  // Note: You'll need to run these SQL commands in your Supabase SQL editor
  console.log('Database initialization should be done via Supabase SQL editor');
};

// All database operations are now handled through Supabase
// The schema should be created directly in your Supabase SQL editor
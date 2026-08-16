import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, './.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  try {
    console.log('Connecting to Supabase at:', supabaseUrl);
    
    // Check messages
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('id, content, sender_id')
      .limit(5);
      
    if (msgErr) {
      console.error('Error fetching messages:', msgErr.message);
    } else {
      console.log('Recent messages fetched successfully:', messages?.length || 0);
      console.log(messages);
    }

    // Check message_reads
    const { data: reads, error: readsErr } = await supabase
      .from('message_reads')
      .select('*')
      .limit(10);

    if (readsErr) {
      console.error('Error fetching message_reads:', readsErr.message);
    } else {
      console.log('message_reads fetched successfully:', reads?.length || 0);
      console.log(reads);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkDatabase();

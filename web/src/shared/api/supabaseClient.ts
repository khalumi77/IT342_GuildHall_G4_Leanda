import { createClient } from '@supabase/supabase-js';

// Get these from: Supabase Dashboard → Project Settings → API
const SUPABASE_URL = 'https://ayayeobqassykeexrtst.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_HOXUyGNWRyN_gdx7veCVQA_eil8r7gA'; // ← paste your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
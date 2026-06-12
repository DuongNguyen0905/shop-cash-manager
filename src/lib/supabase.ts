import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oopwxboyryefrvgsmhhw.supabase.co';
const supabaseAnonKey = 'sb_publishable_YL2T_UxTHFrPiW1D4MTJkQ_PF6L29Wm';

export const isMock = false;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

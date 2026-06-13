import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mmslksaaakzvahijxpng.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_secret_Owev5Sad0WWc2D5YktL2-g_deWmhkwl'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

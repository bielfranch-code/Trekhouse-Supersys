import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mmslksaaakzvahijxpng.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tc2xrc2FhYWt6dmFoaWp4cG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NzQwODcsImV4cCI6MjA5NjM1MDA4N30.qRPHnD3WrZ96GhhWY9002KVBntrMfDWzXBZDIFGBqQs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

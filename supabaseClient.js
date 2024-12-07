// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hrpjasjcldnkoffnltmc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhycGphc2pjbGRua29mZm5sdG1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1MjI2NjUsImV4cCI6MjA0OTA5ODY2NX0.Tl0NekOZlcuyBVqQgM0-hRXeoREF5lN779q-xtM1HYk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gnfyomsrbmnaitkbqxem.supabase.co";

const supabaseAnonKey = "sb_publishable_H7KRZPkV67D4HzxS1aNfHA_I879rDS2";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

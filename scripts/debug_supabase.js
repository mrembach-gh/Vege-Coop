const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manual env parsing
const envPath = path.resolve(__dirname, '../.env.local');
let env = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) env[key.trim()] = val.trim();
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log("Checking ItemType Table Content...");
    const { data: types, error } = await supabase.from('ItemType').select('*');
    if (error) {
        console.error("Error fetching types:", error);
    } else {
        console.log("ItemTypes found:", types);
    }

    console.log("Checking recent items...");
    const { data: items } = await supabase.from('Item').select('*').order('created_at', { ascending: false }).limit(5);
    console.log("Recent Items:", items);
}

testFetch();

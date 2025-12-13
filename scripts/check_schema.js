const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local because dotenv might not be installed
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
    console.error('Could not read .env.local');
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
        envVars[key] = value;
    }
});

const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!url || !key) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkSchema() {
    console.log('Attempting to connect to Supabase...');

    // Check ItemType
    const { data: itemTypes, error: typeError } = await supabase.from('ItemType').select('*');
    if (typeError) console.error('Error fetching ItemType:', typeError.message);
    else console.log('ItemTypes found:', itemTypes);

    // Check Person
    const { data: people, error: peopleError } = await supabase.from('Person').select('*');
    if (peopleError) console.error('Error fetching Person:', peopleError.message);
    else console.log('People found:', people);

    // Check TheShop columns (by trying to select specific columns or just *)
    // We specifically want to know if ShopID exists in TheShop
    const { data: shopData, error: shopError } = await supabase.from('TheShop').select('*').limit(1);
    if (shopError) console.error('Error fetching TheShop:', shopError.message);
    else {
        console.log('TheShop access successful.');
        if (shopData.length > 0) {
            console.log('TheShop sample row keys:', Object.keys(shopData[0]));
        } else {
            console.log('TheShop is empty, cannot verify columns via select *. Attempting dry-run insert to check for ShopID column error? No, safer to ask.');
        }
    }
}

checkSchema();

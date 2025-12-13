const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function checkIntegrity() {
    console.log("Checking for items with null costs or missing relations in TheShop...");

    const { data, error } = await supabase
        .from('TheShop')
        .select(`
            TheShopID,
            Cost,
            Item:ItemID (
                ItemName,
                ItemType:ItemTypeID (
                    ItemTypeName
                )
            )
        `);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    let issuesFound = false;
    data.forEach(row => {
        if (row.Cost === null || row.Cost === undefined) {
            console.error(`ERROR: Item with TheShopID ${row.TheShopID} has NULL cost.`);
            issuesFound = true;
        }
        if (!row.Item) {
            console.error(`ERROR: Item with TheShopID ${row.TheShopID} has no associated Item (ItemID might be invalid).`);
            issuesFound = true;
        } else if (!row.Item.ItemType) {
            console.warn(`WARNING: Item ${row.Item.ItemName} (TheShopID ${row.TheShopID}) has no ItemType.`);
        }
    });

    if (!issuesFound) {
        console.log("No obvious data integrity issues found in TheShop.");
    }
}

checkIntegrity();

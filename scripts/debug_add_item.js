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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testAddItem() {
    console.log("Testing Item Creation...");
    const TEST_ITEM = "debug_orange_" + Date.now();
    const TEST_TYPE = "fruit"; // Should match seed data 'fruit' or 'F'? 
    // Note: Seed data might be 'fruit', 'vegetable', 'other'.

    // 1. Resolve Type
    console.log(`Resolving Type: ${TEST_TYPE}`);
    const { data: typeData, error: typeError } = await supabase
        .from('ItemType')
        .select('ItemTypeID')
        .ilike('ItemTypeName', TEST_TYPE)
        .single();

    if (typeError) {
        console.error("❌ Link Error - ItemType not found:", typeError);
        // Fallback check: list all types
        const { data: allTypes } = await supabase.from('ItemType').select('*');
        console.log("Available Types:", allTypes);
        return;
    }
    const typeId = typeData.ItemTypeID;
    console.log(`✅ Type Resolved: ${typeId} (${TEST_TYPE})`);

    // 2. Create Item
    console.log(`Creating Item: ${TEST_ITEM}`);
    const { data: itemData, error: itemError } = await supabase
        .from('Item')
        .insert([{ ItemName: TEST_ITEM, ItemTypeID: typeId }])
        .select()
        .single();

    if (itemError) {
        console.error("❌ Creation Error - Item failed:", itemError);
        return;
    }
    const itemId = itemData.ItemID;
    console.log(`✅ Item Created: ${itemId} (${TEST_ITEM})`);

    // 3. Link to Shop (Need a shop first)
    // Find last shop
    const { data: shops } = await supabase.from('Shop').select('ShopID').order('created_at', { ascending: false }).limit(1);
    if (!shops || shops.length === 0) {
        console.error("❌ No active shop to add to.");
        return;
    }
    const shopId = shops[0].ShopID;
    console.log(`Adding to Shop: ${shopId}`);

    const { data: theShop, error: linkError } = await supabase
        .from('TheShop')
        .insert([{ ShopID: shopId, ItemID: itemId, Cost: 1.50 }])
        .select()
        .single();

    if (linkError) {
        console.error("❌ Link Error - TheShop failed:", linkError);
    } else {
        console.log("✅ Successfully added to TheShop:", theShop.TheShopID);
    }
}

testAddItem();

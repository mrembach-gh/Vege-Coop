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

async function runSession() {
    console.log(">>> SIMULATING SESSION FLOW <<<");

    // 1. Start Shop
    console.log("1. Starting Shop...");
    // Need Person ID
    const { data: person } = await supabase.from('Person').select('PersonID').limit(1).single();
    const pId = person.PersonID;

    const { data: shop } = await supabase.from('Shop').insert([{ PersonID: pId, ShopDate: new Date().toISOString() }]).select().single();
    const sId = shop.ShopID;
    console.log(`   Shop Started: ${sId}`);

    // 2. Add First Item
    console.log("2. Adding Item A (Carrot)...");
    const { data: itemA } = await supabase.from('Item').select('ItemID').ilike('ItemName', 'Carrot').maybeSingle();
    // Assuming exist for brevity, or create logic
    let itemAId = itemA?.ItemID;
    // ... skipping creation logic for brevity, assuming standard seeded items exist or re-using debug items ...
    if (!itemAId) {
        // quick create
        const { data: typeV } = await supabase.from('ItemType').select('ItemTypeID').eq('ItemTypeAbbrev', 'V').single();
        const { data: newItem } = await supabase.from('Item').insert({ ItemName: 'Carrot', ItemTypeID: typeV.ItemTypeID }).select().single();
        itemAId = newItem.ItemID;
    }
    await supabase.from('TheShop').insert({ ShopID: sId, ItemID: itemAId, Cost: 2.50 });

    // Check Count
    const { count: count1 } = await supabase.from('TheShop').select('*', { count: 'exact', head: true }).eq('ShopID', sId);
    console.log(`   Count after A: ${count1} (Expected 1)`);

    // 3. Add Second Item
    console.log("3. Adding Item B (Apple)...");
    // Reuse item finding logic...
    const { data: typeF } = await supabase.from('ItemType').select('ItemTypeID').eq('ItemTypeAbbrev', 'F').single();
    // Force create diverse item
    const itemName = `Apple_${Date.now()}`;
    const { data: newItemB } = await supabase.from('Item').insert({ ItemName: itemName, ItemTypeID: typeF.ItemTypeID }).select().single();

    await supabase.from('TheShop').insert({ ShopID: sId, ItemID: newItemB.ItemID, Cost: 1.20 });

    // Check Count
    const { count: count2, data: allItems } = await supabase.from('TheShop').select('*', { count: 'exact' }).eq('ShopID', sId);
    console.log(`   Count after B: ${count2} (Expected 2)`);

    if (count2 === 2) {
        console.log("✅ DB Logic works: Items accumulate.");
    } else {
        console.error("❌ DB Logic Failure: Items NOT accumulating.");
    }
}

runSession();

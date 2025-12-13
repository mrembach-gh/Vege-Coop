'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const INITIAL_KITTY = 320;

export function useShoppingSession() {
    const [items, setItems] = useState([]);
    const [kitty, setKitty] = useState(INITIAL_KITTY);
    const [counts, setCounts] = useState({
        vegetable: 0,
        fruit: 0,
        other: 0
    });
    const [shopId, setShopId] = useState(null);
    const [personId, setPersonId] = useState(null); // Should be selected by user
    const [people, setPeople] = useState([]);

    const [isInitialized, setIsInitialized] = useState(false);

    // Helper to calculate derived state from items
    const calculateState = (currentItems) => {
        const totalCost = currentItems.reduce((sum, item) => sum + item.cost, 0);
        const newCounts = currentItems.reduce((acc, item) => {
            const typeKey = (item.type || 'other').toLowerCase();
            acc[typeKey] = (acc[typeKey] || 0) + 1;
            return acc;
        }, { vegetable: 0, fruit: 0, other: 0 });

        setKitty(INITIAL_KITTY - totalCost);
        setCounts(newCounts);
    };

    // Load available people
    useEffect(() => {
        const loadPeople = async () => {
            const { data } = await supabase.from('Person').select('*').order('PersonName');
            if (data) {
                setPeople(data);
                if (data.length > 0) {
                    if (!personId) setPersonId(data[0].PersonID);
                }
            }
        };
        loadPeople();
    }, []);

    // Load session from LocalStorage on mount
    useEffect(() => {
        const storedShopId = localStorage.getItem('vege_shop_id');
        if (storedShopId) {
            console.log("Restoring session from LocalStorage:", storedShopId);
            setShopId(storedShopId);
            refreshItems(storedShopId);
        }
        setIsInitialized(true);
    }, []);

    // Persist shopId to LocalStorage
    useEffect(() => {
        if (!isInitialized) return;

        if (shopId) {
            localStorage.setItem('vege_shop_id', shopId);
        } else {
            localStorage.removeItem('vege_shop_id');
        }
    }, [shopId, isInitialized]);

    // Ensure reference data exists (ItemTypes only)
    const seedReferenceData = async () => {
        const { data: types } = await supabase.from('ItemType').select('*');
        if (!types || types.length === 0) {
            console.log("Seeding ItemTypes...");
            await supabase.from('ItemType').insert([
                { ItemTypeName: 'vegetable', ItemTypeAbbrev: 'V' },
                { ItemTypeName: 'fruit', ItemTypeAbbrev: 'F' },
                { ItemTypeName: 'other', ItemTypeAbbrev: 'O' }
            ]);
        }
        // Need to ensure at least default person exists for the dropdown to be useful later
        if (people.length === 0) {
            const { data: existing } = await supabase.from('Person').select('PersonID').limit(1);
            if (!existing || existing.length === 0) {
                await supabase.from('Person').insert([{ PersonName: 'Default Shopper' }]);
            }
        }
    };

    const refreshItems = async (sId) => {
        console.log(`[REFRESH] Fetching items for ShopID: ${sId}`);
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
            `)
            .eq('ShopID', sId);

        if (error) {
            console.error("[REFRESH] Error fetching items:", error);
            return;
        }

        console.log(`[REFRESH] Found ${data.length} items.`);

        const mappedItems = data.map(row => {
            const dbType = row.Item?.ItemType?.ItemTypeName;
            return {
                id: row.TheShopID,
                name: row.Item?.ItemName || 'Unknown',
                type: dbType ? dbType.toLowerCase() : 'other',
                cost: row.Cost
            };
        });

        setItems(mappedItems);
        const totalCost = mappedItems.reduce((sum, item) => sum + item.cost, 0);
        const newCounts = mappedItems.reduce((acc, item) => {
            const typeKey = (item.type || 'other').toLowerCase();
            acc[typeKey] = (acc[typeKey] || 0) + 1;
            return acc;
        }, { vegetable: 0, fruit: 0, other: 0 });

        setKitty(INITIAL_KITTY - totalCost);
        setCounts(newCounts);
    };

    const startSession = async () => {
        console.log("Starting new ANONYMOUS session...");
        await seedReferenceData();

        const { data: shop, error } = await supabase
            .from('Shop')
            .insert([{
                PersonID: null, // Anonymous start
                ShopDate: new Date().toISOString()
            }])
            .select()
            .single();

        if (error || !shop) {
            console.error("Failed to create shop", error);
            return;
        }

        const newShopId = shop.ShopID;
        console.log("New Shop Created:", newShopId);
        setShopId(newShopId);
        setItems([]);

        // Add initial items (Parking, Trolley)
        try {
            console.log("Adding default items...");
            await addItemToShop(newShopId, 'Parking', 'other', 2);
            await addItemToShop(newShopId, 'Trolley', 'other', 5);
        } catch (e) {
            console.error("Error adding default items:", e);
        }

        await refreshItems(newShopId);
        return newShopId;
    };

    // Attempt to resume or start a session
    const ensureSession = async () => {
        if (shopId) return shopId;
        console.log("[ENSURE] No shopId state. Checking LocalStorage manually (redundant vs useEffect but safe)...");
        const stored = localStorage.getItem('vege_shop_id');
        if (stored) {
            setShopId(stored);
            return stored;
        }

        console.log("[ENSURE] No existing shop found. Starting new.");
        return await startSession();
    };

    const closeSession = async (finalPersonId) => {
        if (!shopId) return;

        console.log(`Closing Session ${shopId}. Assigning to Person: ${finalPersonId}`);

        if (finalPersonId) {
            const { error } = await supabase
                .from('Shop')
                .update({ PersonID: finalPersonId })
                .eq('ShopID', shopId);

            if (error) console.error("Error updating person on close:", error);
        }

        // Reset local state
        setShopId(null);
        setItems([]);
        setKitty(INITIAL_KITTY);
        setCounts({ vegetable: 0, fruit: 0, other: 0 });
        localStorage.removeItem('vege_shop_id');
    };

    const resolveItemType = async (typeName) => {
        // Robust mapping for types
        const normalized = typeName.toLowerCase().trim();
        const typeMap = {
            'v': 'vegetable', 'veg': 'vegetable', 'vege': 'vegetable', 'vegetable': 'vegetable', 'vegetables': 'vegetable',
            'f': 'fruit', 'fruit': 'fruit', 'fruits': 'fruit',
            'o': 'other', 'other': 'other'
        };
        const dbName = typeMap[normalized] || normalized;

        const { data } = await supabase.from('ItemType').select('ItemTypeID').ilike('ItemTypeName', dbName).maybeSingle();

        if (!data) return null;
        return data.ItemTypeID;
    };

    const resolveOrCreateItem = async (name, typeName) => {
        let { data: item } = await supabase.from('Item').select('ItemID').ilike('ItemName', name).maybeSingle();

        if (!item) {
            const typeId = await resolveItemType(typeName);
            if (!typeId) {
                console.error(`Cannot create item '${name}': Unknown type '${typeName}'`);
                throw new Error(`Unknown type: ${typeName}`);
            }

            const { data: newItem, error } = await supabase
                .from('Item')
                .insert([{ ItemName: name, ItemTypeID: typeId }])
                .select()
                .single();

            if (error) throw error;
            item = newItem;
        }
        return item.ItemID;
    };

    const addItemToShop = async (sId, name, type, cost) => {
        try {
            const itemId = await resolveOrCreateItem(name, type);
            await supabase.from('TheShop').insert([{
                ShopID: sId,
                ItemID: itemId,
                Cost: cost
            }]);
        } catch (e) {
            console.error("Error adding item:", e);
        }
    };

    const addItem = async (name, type, cost) => {
        let currentShopId = shopId;
        if (!currentShopId) currentShopId = await ensureSession();
        if (!currentShopId) return;

        await addItemToShop(currentShopId, name, type, parseFloat(cost));
        await refreshItems(currentShopId);
    };

    const deleteItem = async (name) => {
        const itemToDelete = items.find(i => i.name.toLowerCase() === name.toLowerCase());
        if (!itemToDelete) return false;

        const { error } = await supabase
            .from('TheShop')
            .delete()
            .eq('TheShopID', itemToDelete.id);

        if (!error) {
            await refreshItems(shopId);
            return true;
        }
        return false;
    };

    return {
        items,
        kitty,
        counts,
        sessionId: shopId,
        startSession,
        addItem,
        deleteItem,
        closeSession,
        people,
        personId,
        setPersonId
    };
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import styles from './reports.module.css';

const SHOPPER_COLOURS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#8BC34A'];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Activity Matrix ────────────────────────────────────────────────────────────

function ActivityMatrix({ personId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!personId) { setData(null); return; }
        setLoading(true);

        (async () => {
            const { data: rows } = await supabase
                .from('TheShop')
                .select('Cost, Item:ItemID(ItemName), Shop:ShopID(ShopID, ShopDate)')
                .eq('Shop.PersonID', personId)
                .not('Shop', 'is', null)
                .order('Shop(ShopDate)');

            if (!rows) { setLoading(false); return; }

            // Filter out rows where Shop is null (Supabase returns them when PersonID doesn't match)
            const valid = rows.filter(r => r.Shop);

            // Build unique shops (sorted) and unique items
            const shopMap = {};
            valid.forEach(r => {
                const sid = r.Shop.ShopID;
                if (!shopMap[sid]) shopMap[sid] = { id: sid, date: r.Shop.ShopDate };
            });
            const shops = Object.values(shopMap).sort((a, b) => new Date(a.date) - new Date(b.date));

            const itemMap = {};
            valid.forEach(r => {
                const name = r.Item?.ItemName;
                if (!name) return;
                if (!itemMap[name]) itemMap[name] = {};
                itemMap[name][r.Shop.ShopID] = r.Cost;
            });

            const items = Object.keys(itemMap).sort();
            setData({ shops, items, itemMap });
            setLoading(false);
        })();
    }, [personId]);

    if (!personId) return <p className={styles.hint}>Select a shopper to see their activity.</p>;
    if (loading) return <p className={styles.hint}>Loading…</p>;
    if (!data || data.shops.length === 0) return <p className={styles.hint}>No shopping data found for this shopper.</p>;

    const { shops, items, itemMap } = data;

    return (
        <div className={styles.matrixWrap}>
            <table className={styles.matrix}>
                <thead>
                    <tr>
                        <th className={styles.matrixItemCol}>Item</th>
                        {shops.map(s => (
                            <th key={s.id} className={styles.matrixDateCol}>{fmtDate(s.date)}</th>
                        ))}
                        <th className={styles.matrixFreqCol}>Freq</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => {
                        const bought = shops.filter(s => itemMap[item][s.id] != null).length;
                        return (
                            <tr key={item}>
                                <td className={styles.matrixItemName}>{item}</td>
                                {shops.map(s => {
                                    const cost = itemMap[item][s.id];
                                    return (
                                        <td key={s.id} className={cost != null ? styles.cellBought : styles.cellMissed}>
                                            {cost != null ? `$${cost}` : '·'}
                                        </td>
                                    );
                                })}
                                <td className={styles.matrixFreq}>
                                    <div className={styles.freqBar}>
                                        <div
                                            className={styles.freqFill}
                                            style={{ width: `${Math.round((bought / shops.length) * 100)}%` }}
                                        />
                                        <span className={styles.freqLabel}>{bought}/{shops.length}</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Price History Chart ────────────────────────────────────────────────────────

function PriceHistory({ itemId, personId }) {
    const [chartData, setChartData] = useState([]);
    const [shoppers, setShoppers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!itemId) { setChartData([]); return; }
        setLoading(true);

        (async () => {
            let query = supabase
                .from('TheShop')
                .select('Cost, Shop:ShopID(ShopDate, Person:PersonID(PersonName))')
                .eq('ItemID', itemId)
                .not('Shop', 'is', null);

            if (personId) query = query.eq('Shop.PersonID', personId);

            const { data: rows } = await query;
            if (!rows) { setLoading(false); return; }

            const valid = rows.filter(r => r.Shop?.Person);

            // Collect unique shoppers
            const shopperSet = [...new Set(valid.map(r => r.Shop.Person.PersonName))].sort();
            setShoppers(shopperSet);

            // Build chart data: one entry per date, keyed by shopper name
            const dateMap = {};
            valid.forEach(r => {
                const date = fmtDate(r.Shop.ShopDate);
                if (!dateMap[date]) dateMap[date] = { date };
                dateMap[date][r.Shop.Person.PersonName] = r.Cost;
            });

            const sorted = Object.values(dateMap).sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );

            setChartData(sorted);
            setLoading(false);
        })();
    }, [itemId, personId]);

    if (!itemId) return <p className={styles.hint}>Select an item to see price history.</p>;
    if (loading) return <p className={styles.hint}>Loading…</p>;
    if (chartData.length === 0) return <p className={styles.hint}>No price data found.</p>;

    return (
        <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={340}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" tick={{ fill: '#aaa', fontSize: 12 }} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fill: '#aaa', fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`$${value}`, '']}
                    />
                    <Legend wrapperStyle={{ color: '#aaa', fontSize: 13 }} />
                    {shoppers.map((name, i) => (
                        <Line
                            key={name}
                            type="monotone"
                            dataKey={name}
                            stroke={SHOPPER_COLOURS[i % SHOPPER_COLOURS.length]}
                            strokeWidth={2}
                            dot={{ r: 5 }}
                            connectNulls={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('activity');
    const [people, setPeople] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [priceItems, setPriceItems] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [priceFilterPerson, setPriceFilterPerson] = useState('');

    // Load people + all items once
    useEffect(() => {
        (async () => {
            const [{ data: p }, { data: i }] = await Promise.all([
                supabase.from('Person').select('PersonID, PersonName').order('PersonName'),
                supabase.from('Item').select('ItemID, ItemName').order('ItemName'),
            ]);
            if (p) setPeople(p);
            if (i) { setAllItems(i); setPriceItems(i); }
        })();
    }, []);

    // When the shopper filter changes, narrow the item list (and clear selected item if no longer valid)
    useEffect(() => {
        if (!priceFilterPerson) {
            setPriceItems(allItems);
            return;
        }
        (async () => {
            const { data: rows } = await supabase
                .from('TheShop')
                .select('Item:ItemID(ItemID, ItemName), Shop:ShopID(PersonID)')
                .eq('Shop.PersonID', priceFilterPerson)
                .not('Shop', 'is', null);

            const valid = (rows || []).filter(r => r.Shop && r.Item);
            const seen = new Map();
            valid.forEach(r => seen.set(r.Item.ItemID, r.Item.ItemName));
            const filtered = [...seen.entries()]
                .map(([ItemID, ItemName]) => ({ ItemID, ItemName }))
                .sort((a, b) => a.ItemName.localeCompare(b.ItemName));

            setPriceItems(filtered);
            // Clear selected item if it's not in the new list
            if (selectedItem && !seen.has(Number(selectedItem))) {
                setSelectedItem('');
            }
        })();
    }, [priceFilterPerson, allItems]);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <Link href="/" className={styles.back}>
                    <ArrowLeft size={18} /> Back
                </Link>
                <h1 className={styles.title}>Reports</h1>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={activeTab === 'activity' ? styles.tabActive : styles.tab}
                    onClick={() => setActiveTab('activity')}
                >
                    Shopper Activity
                </button>
                <button
                    className={activeTab === 'price' ? styles.tabActive : styles.tab}
                    onClick={() => setActiveTab('price')}
                >
                    Price History
                </button>
            </div>

            {/* ── Shopper Activity ── */}
            {activeTab === 'activity' && (
                <div className={styles.section}>
                    <p className={styles.sectionDesc}>
                        Select a shopper to see which items they bought across every shop and how often.
                    </p>
                    <select
                        className={styles.select}
                        value={selectedPerson}
                        onChange={e => setSelectedPerson(e.target.value)}
                    >
                        <option value="">— Select shopper —</option>
                        {people.map(p => (
                            <option key={p.PersonID} value={p.PersonID}>{p.PersonName}</option>
                        ))}
                    </select>
                    <ActivityMatrix personId={selectedPerson} />
                </div>
            )}

            {/* ── Price History ── */}
            {activeTab === 'price' && (
                <div className={styles.section}>
                    <p className={styles.sectionDesc}>
                        Select a shopper to filter items to what they've bought, then pick an item to see price history.
                    </p>
                    <div className={styles.filterRow}>
                        <select
                            className={styles.select}
                            value={selectedItem}
                            onChange={e => setSelectedItem(e.target.value)}
                        >
                            <option value="">— Select item —</option>
                            {priceItems.map(i => (
                                <option key={i.ItemID} value={i.ItemID}>{i.ItemName}</option>
                            ))}
                        </select>
                        <select
                            className={styles.select}
                            value={priceFilterPerson}
                            onChange={e => setPriceFilterPerson(e.target.value)}
                        >
                            <option value="">All shoppers</option>
                            {people.map(p => (
                                <option key={p.PersonID} value={p.PersonID}>{p.PersonName}</option>
                            ))}
                        </select>
                    </div>
                    <PriceHistory itemId={selectedItem} personId={priceFilterPerson} />
                </div>
            )}
        </div>
    );
}

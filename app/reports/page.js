'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
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

// ── Fuzzy matching (mirrors useShoppingSession) ────────────────────────────────

function fuzzyMatch(input, candidates, threshold = 0.75) {
    const norm = s => s.toLowerCase().trim().replace(/ies$/, 'y').replace(/es$/, '').replace(/s$/, '');
    const ni = norm(input);

    const levenshtein = (a, b) => {
        const dp = Array.from({ length: a.length + 1 }, (_, i) =>
            Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
        );
        for (let i = 1; i <= a.length; i++)
            for (let j = 1; j <= b.length; j++)
                dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                    : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        return dp[a.length][b.length];
    };

    let best = null, bestScore = 0;
    for (const c of candidates) {
        const nc = norm(c.name || c.PersonName || c.ItemName || '');
        if (nc === ni) return { match: c, score: 1 };
        const maxLen = Math.max(ni.length, nc.length);
        const score = maxLen === 0 ? 1 : 1 - levenshtein(ni, nc) / maxLen;
        if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore >= threshold ? { match: best, score: bestScore } : null;
}

const TYPE_MAP = {
    v: 'vegetable', veg: 'vegetable', vege: 'vegetable', vegetable: 'vegetable', vegetables: 'vegetable',
    f: 'fruit', fruit: 'fruit', fruits: 'fruit',
    o: 'other', other: 'other',
};

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

            const valid = rows.filter(r => r.Shop);

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

            const shopperSet = [...new Set(valid.map(r => r.Shop.Person.PersonName))].sort();
            setShoppers(shopperSet);

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

// ── Batch Upload ───────────────────────────────────────────────────────────────

function BatchUpload({ people }) {
    const [preview, setPreview] = useState(null);   // { person, rows: [{item,type,price,error}] }
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);     // { shopId, added, skipped }
    const fileRef = useRef(null);

    const reset = () => {
        setPreview(null);
        setResult(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Match filename (without extension) to a person
        const rawName = file.name.replace(/\.csv$/i, '').trim();
        const personMatch = fuzzyMatch(rawName, people.map(p => ({ ...p, name: p.PersonName })));
        const person = personMatch ? personMatch.match : null;

        // Parse CSV rows
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split(/\r?\n/).filter(l => l.trim());
            const rows = lines.map((line, idx) => {
                const parts = line.split(',').map(s => s.trim());
                if (parts.length < 3) return { raw: line, error: 'Expected 3 columns (Item, Type, Price)' };
                const [item, typeRaw, priceRaw] = parts;
                const type = TYPE_MAP[typeRaw.toLowerCase()] || null;
                const price = parseFloat(priceRaw);
                const error = !item ? 'Missing item name'
                    : !type ? `Unknown type "${typeRaw}" — use v, f, or o`
                    : isNaN(price) || price < 0 ? `Invalid price "${priceRaw}"`
                    : null;
                return { item, type, price, error, raw: line };
            });
            setPreview({ person, rawName, rows });
            setResult(null);
        };
        reader.readAsText(file);
    };

    const handleUpload = async () => {
        if (!preview?.person) return;
        setUploading(true);

        const validRows = preview.rows.filter(r => !r.error);

        // Fetch all items for fuzzy matching
        const { data: allItems } = await supabase.from('Item').select('ItemID, ItemName');

        // Resolve ItemType IDs once
        const { data: itemTypes } = await supabase.from('ItemType').select('ItemTypeID, ItemTypeName');
        const typeIdMap = Object.fromEntries((itemTypes || []).map(t => [t.ItemTypeName, t.ItemTypeID]));

        // Create the Shop record
        const { data: shop, error: shopErr } = await supabase
            .from('Shop')
            .insert([{ PersonID: preview.person.PersonID, ShopDate: new Date().toISOString() }])
            .select()
            .single();

        if (shopErr || !shop) {
            setResult({ error: 'Failed to create shop record: ' + (shopErr?.message || 'unknown') });
            setUploading(false);
            return;
        }

        let added = 0, skipped = 0;
        const rowResults = [];

        for (const row of validRows) {
            try {
                // Resolve or create item
                const fuzzy = allItems ? fuzzyMatch(row.item, allItems.map(i => ({ ...i, name: i.ItemName }))) : null;
                let itemId, resolvedName;

                if (fuzzy) {
                    itemId = fuzzy.match.ItemID;
                    resolvedName = fuzzy.match.ItemName;
                } else {
                    // Create new item
                    const typeId = typeIdMap[row.type];
                    if (!typeId) { rowResults.push({ ...row, status: 'skipped', reason: 'type not found' }); skipped++; continue; }
                    const { data: newItem, error: itemErr } = await supabase
                        .from('Item')
                        .insert([{ ItemName: row.item.toLowerCase().trim(), ItemTypeID: typeId }])
                        .select()
                        .single();
                    if (itemErr) { rowResults.push({ ...row, status: 'skipped', reason: itemErr.message }); skipped++; continue; }
                    itemId = newItem.ItemID;
                    resolvedName = newItem.ItemName;
                    // Add to local list for subsequent rows in same file
                    allItems.push({ ItemID: itemId, ItemName: resolvedName });
                }

                await supabase.from('TheShop').insert([{ ShopID: shop.ShopID, ItemID: itemId, Cost: row.price }]);
                rowResults.push({ ...row, status: 'added', resolvedName });
                added++;
            } catch (err) {
                rowResults.push({ ...row, status: 'skipped', reason: err.message });
                skipped++;
            }
        }

        setResult({ shopId: shop.ShopID, added, skipped, rowResults, person: preview.person.PersonName });
        setUploading(false);
    };

    const validCount  = preview?.rows.filter(r => !r.error).length ?? 0;
    const errorCount  = preview?.rows.filter(r =>  r.error).length ?? 0;

    return (
        <div className={styles.uploadSection}>
            {!result ? (
                <>
                    {/* Drop zone / file picker */}
                    <div className={styles.dropZone} onClick={() => fileRef.current?.click()}>
                        <Upload size={28} className={styles.uploadIcon} />
                        <p className={styles.dropLabel}>Click to choose a CSV file</p>
                        <p className={styles.dropHint}>Filename should be the shopper's name, e.g. <code>Michael.csv</code></p>
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv"
                            className={styles.fileInput}
                            onChange={handleFile}
                        />
                    </div>

                    {/* Format reminder */}
                    <div className={styles.formatBox}>
                        <p className={styles.formatTitle}>CSV format — one item per row:</p>
                        <code className={styles.formatExample}>Tomatoes, v, 4.50</code>
                        <code className={styles.formatExample}>Apples, f, 6.00</code>
                        <code className={styles.formatExample}>Bread, o, 3.80</code>
                        <p className={styles.formatNote}>Type: <strong>v</strong> = vegetable &nbsp;·&nbsp; <strong>f</strong> = fruit &nbsp;·&nbsp; <strong>o</strong> = other</p>
                    </div>

                    {/* Preview */}
                    {preview && (
                        <div className={styles.previewBox}>
                            {/* Person match */}
                            <div className={preview.person ? styles.previewPerson : styles.previewPersonError}>
                                {preview.person
                                    ? <>✓ Shopper matched: <strong>{preview.person.PersonName}</strong></>
                                    : <>✗ No shopper matched for "<strong>{preview.rawName}</strong>" — rename the file to a known shopper</>
                                }
                            </div>

                            {/* Row summary */}
                            <div className={styles.previewMeta}>
                                {validCount} valid row{validCount !== 1 ? 's' : ''}
                                {errorCount > 0 && <span className={styles.previewErrors}> · {errorCount} with errors (will be skipped)</span>}
                            </div>

                            {/* Row list */}
                            <div className={styles.previewRows}>
                                {preview.rows.map((r, i) => (
                                    <div key={i} className={r.error ? styles.previewRowBad : styles.previewRowOk}>
                                        <span className={styles.previewRowName}>{r.item || r.raw}</span>
                                        {!r.error && (
                                            <>
                                                <span className={styles.previewRowType}>{r.type}</span>
                                                <span className={styles.previewRowPrice}>${r.price.toFixed(2)}</span>
                                            </>
                                        )}
                                        {r.error && <span className={styles.previewRowErr}>{r.error}</span>}
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className={styles.previewActions}>
                                <button className={styles.cancelBtn} onClick={reset}>Cancel</button>
                                <button
                                    className={styles.uploadBtn}
                                    onClick={handleUpload}
                                    disabled={!preview.person || validCount === 0 || uploading}
                                >
                                    {uploading ? 'Uploading…' : `Upload ${validCount} item${validCount !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Result screen */
                <div className={styles.resultBox}>
                    {result.error ? (
                        <div className={styles.resultError}>
                            <AlertCircle size={32} />
                            <p>{result.error}</p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.resultSuccess}>
                                <CheckCircle size={32} className={styles.resultIcon} />
                                <div>
                                    <p className={styles.resultTitle}>Shop uploaded for {result.person}</p>
                                    <p className={styles.resultSub}>{result.added} item{result.added !== 1 ? 's' : ''} added{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}</p>
                                </div>
                            </div>
                            <div className={styles.previewRows}>
                                {result.rowResults.map((r, i) => (
                                    <div key={i} className={r.status === 'added' ? styles.previewRowOk : styles.previewRowBad}>
                                        <span className={styles.previewRowName}>{r.resolvedName || r.item}</span>
                                        {r.status === 'added'
                                            ? <span className={styles.previewRowPrice}>${r.price.toFixed(2)}</span>
                                            : <span className={styles.previewRowErr}>{r.reason}</span>
                                        }
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <button className={styles.uploadBtn} onClick={reset}>Upload another</button>
                </div>
            )}
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
                <button
                    className={activeTab === 'upload' ? styles.tabActive : styles.tab}
                    onClick={() => setActiveTab('upload')}
                >
                    Batch Upload
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

            {/* ── Batch Upload ── */}
            {activeTab === 'upload' && (
                <div className={styles.section}>
                    <p className={styles.sectionDesc}>
                        Upload a CSV of a completed shop. Name the file after the shopper — the date will be set to today.
                    </p>
                    <BatchUpload people={people} />
                </div>
            )}
        </div>
    );
}

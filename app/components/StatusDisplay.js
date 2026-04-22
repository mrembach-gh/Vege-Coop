'use client';

import { useState, useEffect } from 'react';
import { Leaf, X } from 'lucide-react';
import styles from './StatusDisplay.module.css';

const COMMANDS = [
    { cmd: 'start  /  s', desc: 'Begin a new shopping session' },
    { cmd: 'add [item] [v/f/o] [price]', desc: 'Add item — e.g. a carrots v 8' },
    { cmd: 'delete [item]  /  d [item]', desc: 'Remove an item from the list' },
    { cmd: 'total  /  t', desc: 'Read out current counts and kitty' },
    { cmd: 'close  /  c', desc: 'Close session and share the list' },
];

export default function StatusDisplay({ people = [], selectedPersonId, onPersonChange }) {
    const [dateStr, setDateStr] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const today = new Date();
        setDateStr(today.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }));
    }, []);

    return (
        <>
            <div className={styles.statusHeader}>
                {/* Left — app identity */}
                <div className={styles.brand}>
                    <Leaf size={22} className={styles.brandIcon} />
                    <span className={styles.brandName}>Vege Coop</span>
                </div>

                {/* Right — person selector + help */}
                <div className={styles.actions}>
                    <div className={styles.personSelector}>
                        <select
                            className={styles.personSelect}
                            value={selectedPersonId || ''}
                            onChange={(e) => onPersonChange(e.target.value)}
                        >
                            <option value="" disabled>Shopper</option>
                            {people.map(p => (
                                <option key={p.PersonID} value={p.PersonID}>{p.PersonName}</option>
                            ))}
                        </select>
                    </div>

                    <button className={styles.helpButton} onClick={() => setShowHelp(true)} title="How to use">
                        ?
                    </button>
                </div>
            </div>

            {/* Date bar */}
            <div className={styles.dateBar}>{dateStr}</div>

            {/* Help modal */}
            {showHelp && (
                <div className={styles.modalOverlay} onClick={() => setShowHelp(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <span className={styles.modalTitle}>How to use Vege Coop</span>
                            <button onClick={() => setShowHelp(false)} className={styles.closeButton}>
                                <X size={20} />
                            </button>
                        </div>

                        <p className={styles.modalSubtitle}>
                            Tap the <strong>mic</strong> and speak, or tap <strong>ADD</strong> to type.
                        </p>

                        <div className={styles.commandList}>
                            {COMMANDS.map(({ cmd, desc }) => (
                                <div key={cmd} className={styles.commandRow}>
                                    <code className={styles.commandCode}>{cmd}</code>
                                    <span className={styles.commandDesc}>{desc}</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.modalFooter}>
                            <div className={styles.tipRow}>🟢 Mic green = listening &nbsp;|&nbsp; 🔴 Mic red = off</div>
                            <div className={styles.tipRow}>Kitty starts at $320 · Parking $2 · Trolley $5 auto-added</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

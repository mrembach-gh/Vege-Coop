'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import styles from './StatusDisplay.module.css';

export default function StatusDisplay({ people = [], selectedPersonId, onPersonChange }) {
    const [dateStr, setDateStr] = useState('');

    useEffect(() => {
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth() + 1;
        setDateStr(`${day}/${month}`);
    }, []);

    const selectedPerson = people.find(p => p.PersonID === selectedPersonId);
    const initial = selectedPerson ? selectedPerson.PersonName.charAt(0).toUpperCase() : '?';

    return (
        <div className={styles.statusHeader}>
            <div className={styles.titleSection}>
                <button className={styles.backButton}>
                    <ChevronLeft size={28} />
                </button>
                <div className={styles.title}>
                    Shopping {dateStr}
                </div>
            </div>

            <div className={styles.actions}>
                <div className={styles.avatar}>
                    {initial}
                </div>
                <button className={styles.menuButton}>
                    <MoreVertical size={24} />
                </button>
                {/* Hidden select for functionality if needed, or we rely on logic elsewhere? 
                    For now, assuming Avatar interaction or just default behavior.
                    The previous select was prominent. The screenshot doesn't show a dropdown.
                    I'll keep the select logic separate or actionable via Avatar if requested.
                    For this pass, I will wrap the avatar in the select functionality roughly or just show the avatar.
                    Actually, to keep functionality, I'll make the Avatar clickable or a secret select.
                */}
                <select
                    className="absolute opacity-0 w-8 h-8 cursor-pointer right-12"
                    value={selectedPersonId || ''}
                    onChange={(e) => onPersonChange(e.target.value)}
                >
                    {people.map(p => (
                        <option key={p.PersonID} value={p.PersonID}>{p.PersonName}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

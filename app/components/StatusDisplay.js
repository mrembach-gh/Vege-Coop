'use client';

import { useState, useEffect } from 'react';

export default function StatusDisplay({ people = [], selectedPersonId, onPersonChange }) {
    const [dateStr, setDateStr] = useState('');

    useEffect(() => {
        const today = new Date();
        const formatted = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        setDateStr(formatted);
    }, []);

    return (
        <div className="flex justify-between items-start mb-4">
            <div>
                <h1 className="text-3xl font-bold tracking-wide uppercase">SHOP</h1>
                <div className="mt-1">
                    <select
                        value={selectedPersonId || ''}
                        onChange={(e) => onPersonChange(e.target.value)}
                        className="text-xl font-medium bg-transparent border-b-2 border-black focus:outline-none cursor-pointer appearance-none pr-6 relative"
                        style={{
                            backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.7em top 50%',
                            backgroundSize: '0.65em auto'
                        }}
                    >
                        {people.map(p => (
                            <option key={p.PersonID} value={p.PersonID}>{p.PersonName}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="text-xl font-medium pt-1">
                {dateStr}
            </div>
        </div>
    );
}

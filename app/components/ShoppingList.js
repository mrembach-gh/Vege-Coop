'use client';

export default function ShoppingList({ items }) {
    return (
        <div className="border-2 border-black h-full p-4 overflow-y-auto relative">
            <ul className="space-y-3 font-medium text-lg">
                {items.map((item) => (
                    <li key={item.id} className="flex justify-between items-center group">
                        <span className="capitalize">{item.name}</span>
                        <div className="flex items-center gap-4">
                            <span>${item.cost.toFixed(0)}</span>
                            {/* Optional delete trigger if needed, but keeping it clean as per sketch.
                                Maybe hidden delete? Or we rely on voice "Delete X". 
                                The sketch doesn't show garbage bins. Keeping it clean text.
                             */}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

'use client';

import { useState } from 'react';
import { useShoppingSession } from './hooks/useShoppingSession';
import StatusDisplay from './components/StatusDisplay';
import ShoppingList from './components/ShoppingList';
import CommandInput from './components/CommandInput';

export default function Home() {
  const { items, kitty, counts, startSession, addItem, deleteItem, people, personId, setPersonId, closeSession } = useShoppingSession();
  const [lastResponse, setLastResponse] = useState('Welcome to Vege Coop');

  const formatDate = () => new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleCommand = async (result, rawInput) => {
    setLastResponse('Processing...');
    let response = '';

    if (result.type === 'START') {
      const id = await startSession();
      response = id ? `Shop for ${formatDate()} started. Kitty is $313` : 'Error starting shop';
    } else if (result.type === 'ADD') {
      const { name, type, cost } = result.payload;
      const newKitty = Math.round(kitty - cost);
      const resolvedName = await addItem(name, type, cost);
      response = `Adding ${resolvedName || name}, kitty is $${newKitty}`;
    } else if (result.type === 'DELETE') {
      const itemToDelete = items.find(i => i.name.toLowerCase() === result.payload.name.toLowerCase());
      const newKitty = itemToDelete ? Math.round(kitty + itemToDelete.cost) : Math.round(kitty);
      const success = await deleteItem(result.payload.name);
      response = success ? `Removed ${result.payload.name}, kitty is $${newKitty}` : 'Item not found';
    } else if (result.type === 'TOTAL') {
      const { vegetable = 0, fruit = 0, other = 0 } = counts;
      response = `${vegetable} vegetables, ${fruit} fruit, ${other} other. Kitty remaining $${Math.round(kitty)}`;
    } else if (result.type === 'CLOSE') {
      const title = `Vege Coop ${formatDate()}`;
      const textList = items.map(i => `${i.name}, ${i.type}, $${i.cost}`).join('\n');
      const summary = `\nTotal Items: ${items.length}\nKitty Remaining: $${kitty.toFixed(2)}`;
      const fullText = `${title}\n\n${textList}${summary}`;

      try {
        await closeSession(personId);
      } catch (closeErr) {
        console.error("Error closing shop:", closeErr);
        response = 'Error closing shop';
        setLastResponse(response);
        return response;
      }

      if (navigator.share) {
        try {
          await navigator.share({ title, text: fullText });
          response = 'Shop closed.';
        } catch (err) {
          if (err.name !== 'AbortError') console.warn("Share failed", err);
          response = 'Shop closed.';
        }
      } else {
        try { await navigator.clipboard.writeText(fullText); } catch { /* silent */ }
        response = 'Shop closed. List copied to clipboard.';
      }
    } else if (result.type === 'ERROR') {
      response = result.message;
    }

    setLastResponse(response);
    return response;
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', position: 'relative', backgroundColor: 'var(--bg-primary)' }}>
      <StatusDisplay
        people={people}
        selectedPersonId={personId}
        onPersonChange={setPersonId}
      />

      <ShoppingList items={items} onDelete={deleteItem} />

      <CommandInput
        onCommand={handleCommand}
        lastResponse={lastResponse}
        counts={counts}
        kitty={kitty}
      />
    </main>
  );
}

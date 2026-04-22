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
    console.log(`[HANDLE COMMAND] Type: ${result.type}, Input: "${rawInput}", Items Count: ${items.length}`);
    setLastResponse('Processing...');

    if (result.type === 'START') {
      const id = await startSession();
      setLastResponse(id ? `Shop for ${formatDate()} started. Kitty is $313` : 'Error starting shop');
    } else if (result.type === 'ADD') {
      const { name, type, cost } = result.payload;
      const newKitty = Math.round(kitty - cost);
      const resolvedName = await addItem(name, type, cost);
      setLastResponse(`Adding ${resolvedName || name}, kitty is $${newKitty}`);
    } else if (result.type === 'DELETE') {
      const itemToDelete = items.find(i => i.name.toLowerCase() === result.payload.name.toLowerCase());
      const newKitty = itemToDelete ? Math.round(kitty + itemToDelete.cost) : Math.round(kitty);
      const success = await deleteItem(result.payload.name);
      setLastResponse(success ? `Removed ${result.payload.name}, kitty is $${newKitty}` : 'Item not found');
    } else if (result.type === 'TOTAL') {
      const { vegetable = 0, fruit = 0, other = 0 } = counts;
      setLastResponse(`${vegetable} vegetables, ${fruit} fruit, ${other} other. Kitty remaining $${Math.round(kitty)}`);
    } else if (result.type === 'CLOSE') {
      const textList = items.map(i => `${i.name}, ${i.type}, $${i.cost}`).join('\n');
      const summary = `\nTotal Items: ${items.length}\nKitty Remaining: $${kitty.toFixed(2)}`;
      const fullText = `${textList}${summary}`;

      try {
        await navigator.clipboard.writeText(fullText);
      } catch (err) {
        console.warn("Clipboard failed", err);
      }

      try {
        const subject = `Vege Coop ${formatDate()}`;
        setTimeout(() => {
          window.location.href = `mailto:mrembach@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullText)}`;
        }, 800);
        await closeSession(personId);
        setLastResponse('Shop closed. Email ready to send.');
      } catch (closeErr) {
        console.error("Error closing shop:", closeErr);
        setLastResponse('Error closing shop');
      }
    } else if (result.type === 'ERROR') {
      setLastResponse(result.message);
    }
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

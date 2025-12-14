'use client';

import { useState } from 'react';
import { useShoppingSession } from './hooks/useShoppingSession';
import StatusDisplay from './components/StatusDisplay';
import ShoppingList from './components/ShoppingList';
import CommandInput from './components/CommandInput';

export default function Home() {
  const { items, kitty, counts, startSession, addItem, deleteItem, people, personId, setPersonId, closeSession } = useShoppingSession();
  const [lastResponse, setLastResponse] = useState('Welcome to Vege Coop');

  const handleCommand = async (result, rawInput) => {
    console.log(`[HANDLE COMMAND] Type: ${result.type}, Input: "${rawInput}", Items Count: ${items.length}`);
    setLastResponse('Processing...');

    if (result.type === 'START') {
      const id = await startSession();
      setLastResponse(id ? 'Shop started!' : 'Error starting shop');
    } else if (result.type === 'ADD') {
      const { name, type, cost } = result.payload;
      await addItem(name, type, cost);
      setLastResponse(`Added ${name} ($${cost})`);
    } else if (result.type === 'DELETE') {
      const success = await deleteItem(result.payload.name);
      setLastResponse(success ? `Deleted ${result.payload.name}` : `Item not found`);
    } else if (result.type === 'TOTAL' || result.type === 'CLOSE') {
      const textList = items.map(i => `${i.name} $${i.cost}`).join('\n');
      const summary = `Total Items: ${items.length}\nKitty Remaining: $${kitty.toFixed(2)}`;
      const fullText = `${textList}\n\n${summary}`;

      try {
        await navigator.clipboard.writeText(fullText);
        setLastResponse(result.type === 'CLOSE' ? 'Shop Closed. Copied!' : 'Copied to Clipboard!');
      } catch (err) {
        console.warn("Clipboard failed", err);
        setLastResponse(result.type === 'CLOSE' ? 'Closed (Clipboard failed)' : 'Clipboard failed');
      }

      if (result.type === 'CLOSE') {
        try {
          const date = new Date().toLocaleDateString();
          const subject = `Vege Coop ${date}`;
          setTimeout(() => {
            const encodedBody = encodeURIComponent(fullText);
            window.location.href = `mailto:mrembach@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodedBody}`;
          }, 500);
          await closeSession(personId);
        } catch (closeErr) {
          console.error("Error closing shop:", closeErr);
          setLastResponse('Error closing shop');
        }
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

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
      // Prompt shows "Processing...", but usually update is fast enough.
      // We can just say "Added..."
      setLastResponse(`Added ${name} ($${cost})`);
    } else if (result.type === 'DELETE') {
      const success = await deleteItem(result.payload.name);
      setLastResponse(success ? `Deleted ${result.payload.name}` : `Item not found`);
    } else if (result.type === 'TOTAL' || result.type === 'CLOSE') {
      // Copy list to clipboard
      const textList = items.map(i => `${i.name} $${i.cost}`).join('\n');
      const summary = `Total Items: ${items.length}\nKitty Remaining: $${kitty.toFixed(2)}`;
      const fullText = `${textList}\n\n${summary}`;

      // 1. Attempt Clipboard Copy (Non-blocking)
      try {
        await navigator.clipboard.writeText(fullText);
        setLastResponse(result.type === 'CLOSE' ? 'Shop Closed. Copied to Clipboard!' : 'Totals copied to Clipboard!');
      } catch (err) {
        console.warn("Clipboard failed (likely due to voice input) - continuing...", err);
        setLastResponse(result.type === 'CLOSE' ? 'Shop Closed (Clipboard skipped)' : 'Clipboard failed');
      }

      // 2. Proceed with Close Logic (Email + DB)
      if (result.type === 'CLOSE') {
        try {
          // Open Email
          const date = new Date().toLocaleDateString();
          const subject = `Vege Coop ${date}`;
          setTimeout(() => {
            const encodedBody = encodeURIComponent(fullText);
            window.location.href = `mailto:mrembach@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodedBody}`;
          }, 500);

          // Close session LAST so we don't lose state before generating text
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
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white p-4">
      {/* Header Section */}
      <div className="flex-none pt-4">
        <StatusDisplay
          people={people}
          selectedPersonId={personId}
          onPersonChange={setPersonId}
        />
      </div>

      {/* Main List Section */}
      <div className="flex-1 min-h-0 mb-4">
        <ShoppingList items={items} onDelete={deleteItem} />
      </div>

      {/* Footer / Controls Section */}
      <div className="flex-none">
        <CommandInput
          onCommand={handleCommand}
          lastResponse={lastResponse}
          counts={counts}
          kitty={kitty}
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, CornerDownLeft } from 'lucide-react';
import { parseCommand } from '../utils/commandParser';

export default function CommandInput({ onCommand, lastResponse, counts, kitty }) {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    // Debug: Trace renders
    console.log(`[CommandInput Render] Counts: ${counts?.vegetable}/${counts?.fruit}/${counts?.other}`);

    const onCommandRef = useRef(onCommand);

    // Ensure Ref is always fresh
    useEffect(() => {
        onCommandRef.current = onCommand;
        console.log("[CommandInput Effect] Updated onCommandRef");
    }, [onCommand]);

    const handleCommand = (cmdText) => {
        const result = parseCommand(cmdText);
        onCommand(result, cmdText);
        setInput('');
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log(`[Voice Result] '${transcript}'`);

                setInput(transcript);

                // Parse and call Ref directly
                const result = parseCommand(transcript);
                if (onCommandRef.current) {
                    console.log("[Voice] Calling onCommandRef...");
                    onCommandRef.current(result, transcript);
                } else {
                    console.error("[Voice] onCommandRef is null!");
                }
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Error starting speech recognition:", e);
                setIsListening(false);
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            handleCommand(input);
        }
    };

    const safeCounts = counts || { vegetable: 0, fruit: 0, other: 0 };
    const totalItems = (safeCounts.vegetable || 0) + (safeCounts.fruit || 0) + (safeCounts.other || 0);

    return (
        <div className="border-t-2 border-black bg-white p-4 pb-8">
            {/* Top Row: Totals & Speak Button */}
            <div className="flex justify-between items-start mb-6">
                {/* Left: Counts */}
                <div className="space-y-1 font-bold text-lg">
                    <div>Fruit {safeCounts.fruit || 0}</div>
                    <div>Veggies {safeCounts.vegetable || 0}</div>
                    <div>Other {safeCounts.other || 0}</div>
                    <div className="mt-2 text-xl">Total {totalItems}</div>
                </div>

                {/* Right: Kitty & Speak */}
                <div className="flex flex-col items-center gap-4">
                    <div className="text-xl font-bold">
                        Kitty {Math.round(kitty)}
                    </div>
                    <button
                        onClick={toggleListening}
                        className={`w-20 h-20 rounded-full border-2 border-black flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white' : 'bg-white hover:bg-gray-100 text-black'
                            }`}
                    >
                        <div className="flex flex-col items-center">
                            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                            <span className="text-xs font-bold mt-1">Speak</span>
                        </div>
                    </button>
                    {/* Last Response Feedback - positioned carefully */}
                    {lastResponse && (
                        <div className="absolute bottom-24 right-4 bg-black text-white px-3 py-1 rounded text-xs animate-fade-in max-w-xs truncate">
                            {lastResponse}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row: Input */}
            <form onSubmit={handleSubmit} className="flex gap-4">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full border-2 border-black p-3 text-lg font-bold focus:outline-none focus:bg-yellow-50"
                        placeholder=""
                    />
                    {/* Underline effect handled by border */}
                </div>
                <button
                    type="submit"
                    className="border-2 border-black px-6 py-2 font-bold text-lg hover:bg-gray-100 flex items-center gap-2"
                >
                    ENTER <CornerDownLeft size={20} />
                </button>
            </form>
        </div>
    );
}

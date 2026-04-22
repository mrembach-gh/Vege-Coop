'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Mic, MicOff, Send, X, Apple, Carrot, Package } from 'lucide-react';
import styles from './CommandInput.module.css';
import { parseCommand } from '../utils/commandParser';

export default function CommandInput({ onCommand, lastResponse, counts, kitty }) {
    const [inputValue, setInputValue] = useState('');
    const [isInputVisible, setIsInputVisible] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const inputRef = useRef(null);
    const recognitionRef = useRef(null);
    const onCommandRef = useRef(onCommand);
    const isListeningRef = useRef(false);

    const safeCounts = counts || { vegetable: 0, fruit: 0, other: 0 };
    const totalItems = (safeCounts.vegetable || 0) + (safeCounts.fruit || 0) + (safeCounts.other || 0);

    // Sync refs
    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    // Speak response and pause mic while speaking
    useEffect(() => {
        if (!lastResponse || lastResponse === 'Welcome to Vege Coop' || lastResponse === 'Processing...') return;
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const wasListening = isListeningRef.current;
        if (wasListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(lastResponse);
        utterance.onend = () => {
            if (wasListening && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (e) { /* recognition may already be running */ }
            }
        };
        window.speechSynthesis.speak(utterance);
    }, [lastResponse]);

    // Focus input on visible
    useEffect(() => {
        if (isInputVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isInputVisible]);

    // Speech Recognition Setup
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
                setInputValue(transcript);

                const result = parseCommand(transcript);
                if (onCommandRef.current) {
                    onCommandRef.current(result, transcript);
                    // Do not close input immediately if user wants to speak more?
                    // Actually, for "Speak" button flow, maybe we assume one command.
                    // But if it's the main mic button, maybe we don't even open the input?
                    // Let's just process it.
                    setInputValue('');
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
        if (!inputValue.trim()) return;

        const result = parseCommand(inputValue);
        onCommand(result, inputValue);
        setInputValue('');
        setIsInputVisible(false); // Close after submit
    };

    return (
        <div className={styles.footerContainer}>
            {!isInputVisible && (
                <div className={styles.fabContainer}>
                    <div className={styles.statsBar}>
                        <div className={styles.statItem}>
                            <Apple size={14} /> <span className={styles.statLabel}>{safeCounts.fruit || 0}</span>
                        </div>
                        <div className={styles.statItem}>
                            <Carrot size={14} /> <span className={styles.statLabel}>{safeCounts.vegetable || 0}</span>
                        </div>
                        <div className={styles.statItem}>
                            <Package size={14} /> <span className={styles.statLabel}>{safeCounts.other || 0}</span>
                        </div>
                        <div style={{ width: 1, height: 12, background: '#444', margin: '0 4px' }}></div>
                        <div className={styles.statItem}>
                            <span>${Math.round(kitty)}</span>
                        </div>
                    </div>

                    <div className={styles.actionsRight}>
                        <button
                            className={`${styles.micButton} ${isListening ? styles.listening : ''}`}
                            onClick={toggleListening}
                            title="Speak Command"
                        >
                            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        <button
                            className={styles.addButton}
                            onClick={() => setIsInputVisible(true)}
                        >
                            <Plus size={24} /> ADD
                        </button>
                    </div>
                </div>
            )}

            {isInputVisible && (
                <div className={styles.inputWrapper}>
                    <div className={styles.controls}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff' }}>
                            Add Item
                        </div>
                        <button onClick={() => setIsInputVisible(false)} style={{ color: '#aaa' }}>
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className={styles.commandInput}
                            placeholder="e.g. Milk, Carrots..."
                        />

                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                onClick={toggleListening}
                                style={{ color: isListening ? '#f44336' : '#aaa' }}
                            >
                                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>

                            {/* Last Response Feedback */}
                            <span className={styles.lastResponse}>{lastResponse}</span>

                            <button
                                type="submit"
                                style={{ color: 'var(--accent-blue)' }}
                            >
                                <Send size={24} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

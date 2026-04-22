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

    useEffect(() => { onCommandRef.current = onCommand; }, [onCommand]);
    useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

    // Focus input when panel opens
    useEffect(() => {
        if (isInputVisible && inputRef.current) inputRef.current.focus();
    }, [isInputVisible]);

    // Speak text directly from user gesture context — iOS requires this
    const speak = (text) => {
        if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

        const wasListening = isListeningRef.current;
        if (wasListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => {
            if (wasListening && recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (e) { /* already running */ }
            }
        };
        window.speechSynthesis.speak(utterance);
    };

    // Speech Recognition Setup
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            setInputValue(transcript);
            setIsListening(false);

            const result = parseCommand(transcript);
            if (onCommandRef.current) {
                const responseText = await onCommandRef.current(result, transcript);
                setInputValue('');
                if (responseText) speak(responseText);
            }
        };

        recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognitionRef.current.onend = () => setIsListening(false);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const result = parseCommand(inputValue);
        setInputValue('');
        setIsInputVisible(false);

        const responseText = await onCommand(result, inputValue);
        if (responseText) speak(responseText);
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
                            placeholder="e.g. a carrots v 8"
                        />

                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                onClick={toggleListening}
                                style={{ color: isListening ? '#4CAF50' : '#aaa' }}
                            >
                                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                            </button>

                            <span className={styles.lastResponse}>{lastResponse}</span>

                            <button type="submit" style={{ color: 'var(--accent-blue)' }}>
                                <Send size={24} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

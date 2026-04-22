const wordToNumber = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50
};

function normalizeInput(input) {
    let normalized = input.toLowerCase();
    // Remove punctuation
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

    Object.entries(wordToNumber).forEach(([word, num]) => {
        // Replace whole words only
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        normalized = normalized.replace(regex, num.toString());
    });
    return normalized;
}

export function parseCommand(input) {
    const trimmed = normalizeInput(input).trim();
    const parts = trimmed.split(' ');
    const command = parts[0];

    if (command === 'start' || command === 's') {
        return { type: 'START' };
    }

    if (command === 'add' || command === 'a') {
        // Expected format: "add <item> <type> <cost>"
        // Example: "add onions vegetable 13" or "a onions v 13"
        if (parts.length < 4) return { type: 'ERROR', message: 'Invalid add command. Format: add <item> <type> <cost>' };

        const cost = parseFloat(parts[parts.length - 1]);
        const typeShort = parts[parts.length - 2];
        const name = parts.slice(1, parts.length - 2).join(' ');

        let type = 'other';
        if (typeShort.startsWith('v')) type = 'vegetable';
        else if (typeShort.startsWith('f')) type = 'fruit';
        else if (typeShort.startsWith('o')) type = 'other';
        else return { type: 'ERROR', message: 'Invalid type. Use v, f, or o.' };

        if (isNaN(cost)) return { type: 'ERROR', message: 'Invalid cost.' };

        return { type: 'ADD', payload: { name, type, cost } };
    }

    if (command === 'delete' || command === 'd') {
        // Expected format: "delete <item>"
        if (parts.length < 2) return { type: 'ERROR', message: 'Invalid delete command. Format: delete <item>' };
        const name = parts.slice(1).join(' ');
        return { type: 'DELETE', payload: { name } };
    }

    if (command === 'total' || command === 't') {
        return { type: 'TOTAL' };
    }

    if (command === 'close' || command === 'c') {
        return { type: 'CLOSE' };
    }

    return { type: 'ERROR', message: 'Unknown command.' };
}

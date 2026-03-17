import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    // Nota: in ambiente Vite puro di solito si usa import.meta.env.VITE_API_KEY,
    // ma manteniamo process.env se il tuo ambiente cloud lo gestisce così.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key mancante");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateSmartPassword = async (requirements: string): Promise<{ password: string; advice: string }> => {
    try {
        const ai = getClient();
        const model = "gemini-2.5-flash";
        
        const prompt = `
        Agisci come un esperto di sicurezza informatica.
        Il tuo compito è generare UNA password estremamente sicura basata su questa richiesta dell'utente: "${requirements}".
        
        Se l'utente non specifica nulla, genera una password casuale complessa di 16 caratteri (lettere, numeri, simboli).
        
        Rispondi ESCLUSIVAMENTE in formato JSON con questa struttura:
        {
            "password": "la_password_generata",
            "advice": "Una breve spiegazione in italiano del perché è sicura o consigli di sicurezza correlati (max 1 frase)."
        }
        Non aggiungere markdown o blocchi di codice, solo il JSON grezzo.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("Risposta vuota dall'IA");

        const data = JSON.parse(text);
        return {
            password: data.password || "ErroreGenerazione123!",
            advice: data.advice || "Non è stato possibile generare un consiglio."
        };

    } catch (error) {
        console.error("Errore Gemini:", error);
        return {
            password: "",
            advice: "Si è verificato un errore con il servizio IA. Controlla la connessione o la chiave API."
        };
    }
};

// --- NUOVA FUNZIONE ---
export const analyzeVaultSecurity = async (stats: { total: number, weakCount: number, reusedCount: number, oldCount: number, score: number }): Promise<string> => {
    try {
        const ai = getClient();
        
        const prompt = `
        Agisci come un esperto di sicurezza informatica e un coach amichevole.
        L'utente usa un gestore di password criptato. Ecco le statistiche del suo database:
        - Password totali salvate: ${stats.total}
        - Password deboli (meno di 8 caratteri): ${stats.weakCount}
        - Password riutilizzate su più siti: ${stats.reusedCount}
        - Password vecchie (non aggiornate da oltre 90 giorni): ${stats.oldCount}
        - Punteggio di salute calcolato dal sistema: ${stats.score}/100

        Scrivi un breve e conciso report di sicurezza per l'utente (massimo 3 paragrafi).
        Il tono deve essere incoraggiante ma molto chiaro sui rischi effettivi.
        Usa il formato Markdown per renderlo facile da leggere (grassetto, liste puntate se servono).
        NON fare esempi di password vere e NON chiedere all'utente di scriverti le sue password.
        Scrivi in italiano.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        if (!response.text) throw new Error("Risposta vuota dall'IA");
        
        return response.text;
    } catch (error) {
        console.error("Errore analisi Gemini:", error);
        return "Si è verificato un errore durante l'analisi della sicurezza. Verifica la connessione o assicurati che la chiave API sia configurata correttamente.";
    }
};
// services/storage.ts
import { PasswordEntry, DefaultCategory } from '../types';
import { deriveKey, encryptData, decryptData } from './cryptoUtils';

const STORAGE_KEY = 'cassaforte_data';
const MASTER_HASH_KEY = 'cassaforte_master_hash';
const MASTER_SALT_KEY = 'cassaforte_master_salt';
const HIDDEN_CATS_KEY = 'cassaforte_hidden_cats';

// Mantiene la chiave sbloccata solo nella memoria RAM
let sessionKey: CryptoKey | null = null;

const simpleHash = async (text: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const hasMasterPassword = (): boolean => {
    return !!localStorage.getItem(MASTER_HASH_KEY);
};

export const setMasterPassword = async (password: string): Promise<void> => {
    const hash = await simpleHash(password);
    localStorage.setItem(MASTER_HASH_KEY, hash);
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(MASTER_SALT_KEY, btoa(String.fromCharCode(...salt)));
    
    sessionKey = await deriveKey(password, salt);
};

export const verifyMasterPassword = async (password: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(MASTER_HASH_KEY);
    if (!storedHash) return false;
    
    const inputHash = await simpleHash(password);
    if (storedHash === inputHash) {
        const saltBase64 = localStorage.getItem(MASTER_SALT_KEY);
        if (saltBase64) {
            const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
            sessionKey = await deriveKey(password, salt);
        }
        return true;
    }
    return false;
};

// --- Funzioni Dati (Ora Asincrone e Criptate) ---

export const getPasswords = async (): Promise<PasswordEntry[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    try {
        const parsed = JSON.parse(data);
        if (!sessionKey) throw new Error("Chiave di sessione mancante. Effettua il login.");
        
        // Se i dati hanno il formato criptato, li decriptiamo
        if (parsed.encryptedData && parsed.iv) {
            const decryptedStr = await decryptData(parsed.encryptedData, parsed.iv, sessionKey);
            return JSON.parse(decryptedStr);
        }
        
        // Fallback per vecchi dati in chiaro (opzionale, utile per la migrazione)
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error("Impossibile leggere i dati:", e);
        return [];
    }
};

export const savePassword = async (entry: PasswordEntry): Promise<void> => {
    const current = await getPasswords();
    const existingIndex = current.findIndex(p => p.id === entry.id);
    
    if (existingIndex >= 0) {
        current[existingIndex] = entry;
    } else {
        current.unshift(entry);
    }
    
    if (!sessionKey) throw new Error("Chiave di sessione mancante.");
    const { encryptedData, iv } = await encryptData(JSON.stringify(current), sessionKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ encryptedData, iv }));
};

export const importPasswords = async (entries: PasswordEntry[]): Promise<number> => {
    const current = await getPasswords();
    let count = 0;
    
    entries.forEach(entry => {
        const exists = current.some(c => c.site === entry.site && c.username === entry.username);
        if (!exists) {
            current.unshift(entry);
            count++;
        }
    });

    if (count > 0 && sessionKey) {
        const { encryptedData, iv } = await encryptData(JSON.stringify(current), sessionKey);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ encryptedData, iv }));
    }
    return count;
};

export const deletePassword = async (id: string): Promise<void> => {
    const current = await getPasswords();
    const filtered = current.filter(p => p.id !== id);
    
    if (!sessionKey) return;
    const { encryptedData, iv } = await encryptData(JSON.stringify(filtered), sessionKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ encryptedData, iv }));
};

export const deleteByCategory = async (category: string): Promise<void> => {
    const current = await getPasswords();
    const filtered = current.filter(p => p.category !== category);
    
    if (!sessionKey) return;
    const { encryptedData, iv } = await encryptData(JSON.stringify(filtered), sessionKey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ encryptedData, iv }));
};

// --- Gestione Categorie (Rimane Sincrona) ---

export const getHiddenCategories = (): string[] => {
    const data = localStorage.getItem(HIDDEN_CATS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
};

export const hideCategory = (category: string): void => {
    const current = getHiddenCategories();
    if (!current.includes(category)) {
        current.push(category);
        localStorage.setItem(HIDDEN_CATS_KEY, JSON.stringify(current));
    }
};

export const unhideCategory = (category: string): void => {
    const current = getHiddenCategories();
    const filtered = current.filter(c => c !== category);
    localStorage.setItem(HIDDEN_CATS_KEY, JSON.stringify(filtered));
};
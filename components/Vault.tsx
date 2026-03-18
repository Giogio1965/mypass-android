import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PasswordEntry, DefaultCategory } from '../types';
import { getPasswords, importPasswords, deletePassword, getHiddenCategories, hideCategory, unhideCategory } from '../services/storage';
import { AlertDialog, AlertType } from './AlertDialog';
import { 
    Search, Copy, Eye, EyeOff, ArrowLeft, 
    Briefcase, Landmark, Mail, ShoppingBag, Share2, Box, 
    FileDown, FileUp, Folder, Edit2, Trash2, Check, X,
    Wallet, Gamepad2, Tv, Plane, Car, Home, Star, Heart, 
    Music, Book, Code, Coffee, Dumbbell, GraduationCap, 
    Gift, Key, Map, Phone, Wifi, Zap, Globe, RotateCcw, Plus,
    ArrowUpDown, Menu
} from 'lucide-react';

interface VaultProps {
    onEdit: (entry: PasswordEntry) => void;
    onAddNew: (category?: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
    'Wallet': Wallet,
    'Gamepad2': Gamepad2,
    'Tv': Tv,
    'Globe': Globe,
    'Plane': Plane,
    'Car': Car,
    'Home': Home,
    'Star': Star,
    'Heart': Heart,
    'Music': Music,
    'Book': Book,
    'Code': Code,
    'Coffee': Coffee,
    'Dumbbell': Dumbbell,
    'GraduationCap': GraduationCap,
    'Gift': Gift,
    'Key': Key,
    'Map': Map,
    'Phone': Phone,
    'Wifi': Wifi,
    'Zap': Zap,
    'Folder': Folder
};

export const Vault: React.FC<VaultProps> = ({ onEdit, onAddNew }) => {
    const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
    const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [visibleId, setVisibleId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);
    
    // Stato per il Menu ad hamburger
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'az'>('newest');

    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: React.ReactNode;
        type: AlertType;
        onConfirm: () => void;
        onCancel?: () => void;
        confirmLabel?: string;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => {},
    });

    const closeDialog = () => setDialogConfig(prev => ({ ...prev, isOpen: false }));

    const loadData = async () => {
        try {
            const data = await getPasswords();
            setPasswords(data);
            setHiddenCategories(getHiddenCategories());
        } catch (error) {
            console.error("Errore durante il caricamento dei dati:", error);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const allCategories = useMemo<string[]>(() => {
        const userCategories = new Set<string>(passwords.map(p => p.category));
        let displayedCats: string[] = Object.values(DefaultCategory) as string[];
        displayedCats = displayedCats.filter(c => !hiddenCategories.includes(c));
        displayedCats = [...displayedCats, ...Array.from(userCategories)];
        return Array.from(new Set(displayedCats)).sort();
    }, [passwords, hiddenCategories]);

    const categoryIconMap = useMemo(() => {
        const map: Record<string, string> = {};
        passwords.forEach(p => {
            if (p.categoryIcon && !map[p.category]) {
                map[p.category] = p.categoryIcon;
            }
        });
        return map;
    }, [passwords]);

    const masked = (len: number) => "•".repeat(Math.min(len, 12));

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleHideCategory = (cat: string) => {
        const count = categoryCounts[cat] || 0;
        if (count > 0) {
            setDialogConfig({
                isOpen: true,
                title: "Impossibile Eliminare",
                message: "Non puoi eliminare una categoria che contiene password. Elimina prima le password al suo interno.",
                type: 'warning',
                onConfirm: closeDialog
            });
            return;
        }

        setDialogConfig({
            isOpen: true,
            title: "Nascondi Categoria",
            message: `Vuoi nascondere la categoria "${cat}" dalla schermata principale?`,
            type: 'warning',
            onCancel: closeDialog,
            onConfirm: async () => { 
                hideCategory(cat);
                await loadData();
                closeDialog();
            }
        });
    };

    const handleUnhideCategory = async (cat: string) => { 
        unhideCategory(cat);
        await loadData();
    };

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleExportClick = () => {
        if (passwords.length === 0) {
            setDialogConfig({
                isOpen: true,
                title: "Nessun dato",
                message: "Non hai ancora salvato nessuna password da esportare.",
                type: 'info',
                onConfirm: closeDialog
            });
            return;
        }

        setDialogConfig({
            isOpen: true,
            title: "Esporta Backup Sicuro",
            type: 'success',
            message: (
                <div>
                    <p className="mb-2">Stai per scaricare un <strong>Backup Criptato</strong>.</p>
                    <p>Questo file è sicuro: i dati al suo interno sono illeggibili senza la tua attuale Master Password. Potrai usarlo per ripristinare le tue password in futuro su questa app.</p>
                </div>
            ),
            confirmLabel: "Scarica Backup Criptato",
            onCancel: closeDialog,
            onConfirm: () => {
                performExport();
                closeDialog();
            }
        });
    };
    const handleResetRequest = () => {
        setDialogConfig({
            isOpen: true,
            title: "Reset Applicazione",
            message: (
                <div className="text-left">
                    <p className="mb-3 text-red-600 font-bold">ATTENZIONE: Questa azione eliminerà permanentemente tutte le password salvate.</p>
                    <p className="text-sm mb-2 text-slate-600 font-medium">Inserisci la tua Master Password per confermare:</p>
                    <input 
                        type="password" 
                        id="reset-confirm-pass"
                        className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-slate-800"
                        placeholder="Master Password"
                    />
                </div>
            ),
            type: 'danger',
            confirmLabel: "ELIMINA TUTTO",
            onCancel: closeDialog,
            onConfirm: async () => {
                const passInput = document.getElementById('reset-confirm-pass') as HTMLInputElement;
                const password = passInput?.value;
                
                if (!password) {
                   alert("Inserisci la password per confermare.");
                   return;
                }
                const { verifyMasterPassword } = await import('../services/storage');
                const isValid = await verifyMasterPassword(password);
                
                if (isValid) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                } else {
                    alert("Password errata. Reset annullato.");
                }
            }
        });
    };

    const performExport = () => {
    const encryptedData = localStorage.getItem('cassaforte_data');
    const salt = localStorage.getItem('cassaforte_master_salt');

    if (!encryptedData || !salt) {
        alert("Errore: Impossibile recuperare i dati criptati per l'esportazione.");
        return;
    }

    // Evita il crash se encryptedData è una semplice stringa cifrata
    let vaultContent;
    try {
        vaultContent = JSON.parse(encryptedData);
    } catch (e) {
        vaultContent = encryptedData;
    }

    const backupPayload = JSON.stringify({
        version: "1.0",
        timestamp: Date.now(),
        vault: vaultContent,
        security: { salt }
    });
    
    const blob = new Blob([backupPayload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    
    link.href = url;
    link.setAttribute('download', `mypass_backup_sicuro_${date}.mypass`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

    const detectCategory = (text: string): string => {
        const lower = text.toLowerCase();
        if (/(banca|bank|bper|unicredit|intesa|paypal|nexy|satispay|hype|revolut|conto|carta|credit|bancomat|postepay|finanza|wallet|amex|mastercard|visa)/.test(lower)) return DefaultCategory.BANCA;
        if (/(mail|gmail|outlook|hotmail|yahoo|posta|pec|proton|libero|tiscali)/.test(lower)) return DefaultCategory.EMAIL;
        if (/(facebook|instagram|twitter|x\.com|linkedin|tiktok|snapchat|pinterest|discord|skype|whatsapp|telegram|messenger|social|reddit|tumblr)/.test(lower)) return DefaultCategory.SOCIAL;
        if (/(amazon|ebay|subito|vinted|zalando|shein|aliexpress|temu|negozio|store|shop|market|acquisto|spesa|coop|conad|esselunga)/.test(lower)) return DefaultCategory.SHOPPING;
        if (/(lavoro|job|linkedin|ufficio|office|slack|trello|jira|zoom|teams|microsoft|atlassian|notion|asana|hr|busta|cedolino|inps)/.test(lower)) return DefaultCategory.LAVORO;
        
        return DefaultCategory.ALTRO;
    };

    const parseKeePassXML = (text: string) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const entries = xmlDoc.getElementsByTagName("Entry");
            const parsedEntries: PasswordEntry[] = [];

            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const strings = entry.getElementsByTagName("String");
                
                let title = ""; let username = ""; let password = ""; let url = ""; let notes = "";

                for (let j = 0; j < strings.length; j++) {
                    const str = strings[j];
                    const key = str.querySelector("Key")?.textContent;
                    const value = str.querySelector("Value")?.textContent || "";

                    if (key === "Title") title = value;
                    else if (key === "UserName") username = value;
                    else if (key === "Password") password = value;
                    else if (key === "URL") url = value;
                    else if (key === "Notes") notes = value;
                }

                if (title || password) {
                    const category = detectCategory(title + " " + url);
                    parsedEntries.push({
                        id: crypto.randomUUID(),
                        site: title || "Unknown Site",
                        username: username || "No Username",
                        passwordValue: password || "",
                        category: category,
                        notes: (url ? `URL: ${url}\n` : '') + notes,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }
            }
            return parsedEntries;
        } catch (e) {
            console.error("XML Parsing Error", e);
            return [];
        }
    };

    const parseCSV = (text: string): PasswordEntry[] => {
        try {
            const rows: string[][] = [];
            let currentRow: string[] = [];
            let currentVal = '';
            let insideQuotes = false;

            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i + 1];

                if (char === '"') {
                    if (insideQuotes && nextChar === '"') {
                        currentVal += '"';
                        i++; 
                    } else {
                        insideQuotes = !insideQuotes;
                    }
                } else if (char === ',' && !insideQuotes) {
                    currentRow.push(currentVal);
                    currentVal = '';
                } else if ((char === '\r' || char === '\n') && !insideQuotes) {
                    if (char === '\r' && nextChar === '\n') i++; 
                    currentRow.push(currentVal);
                    if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            
            if (currentRow.length > 0 || currentVal) {
                currentRow.push(currentVal);
                rows.push(currentRow);
            }

            if (rows.length < 2) return [];

            const headers = rows[0].map(h => h.toLowerCase().trim());
            const findIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

            const urlIdx = findIndex(['url', 'site', 'website', 'link', 'address', 'web']);
            const titleIdx = findIndex(['account', 'name', 'title', 'system']);
            const userIdx = findIndex(['username', 'user', 'login', 'email']);
            const passIdx = findIndex(['password', 'pass', 'key']);
            const noteIdx = findIndex(['note', 'comment', 'extra']);
            const catIdx = findIndex(['group', 'category', 'folder']);

            const parsedEntries: PasswordEntry[] = [];

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i];
                if (cols.length < 2) continue;

                const getCol = (idx: number) => (idx > -1 && idx < cols.length ? cols[idx].trim() : '');

                const siteRaw = getCol(titleIdx);
                const urlRaw = getCol(urlIdx);
                const site = siteRaw || urlRaw || 'Imported Site';
                const username = getCol(userIdx) || 'No Username';
                const password = getCol(passIdx);
                const noteContent = getCol(noteIdx);
                const catRaw = getCol(catIdx);

                const finalNotes = (urlRaw && urlRaw !== siteRaw ? `URL: ${urlRaw}\n` : '') + noteContent;

                let category: string = DefaultCategory.ALTRO;
                if (catRaw) {
                    const matched = Object.values(DefaultCategory).find(c => c.toLowerCase() === catRaw.toLowerCase());
                    if (matched) category = matched;
                    else category = catRaw as any;
                } else {
                    category = detectCategory(site + ' ' + urlRaw + ' ' + username);
                }

                if (password || site !== 'Imported Site') {
                    parsedEntries.push({
                        id: crypto.randomUUID(),
                        site: site,
                        username: username,
                        passwordValue: password,
                        category: category,
                        notes: finalNotes.trim(),
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });
                }
            }
            return parsedEntries;
        } catch (e) {
            console.error("CSV Parsing Error", e);
            return [];
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;

            if (file.name.endsWith('.mypass') || (text.includes('"vault":') && text.includes('"security":'))) {
                try {
                    const backupData = JSON.parse(text);
                    
                    if (backupData.vault && backupData.security?.salt) {
                        const vaultData = typeof backupData.vault === 'string' ? backupData.vault : JSON.stringify(backupData.vault);
                        localStorage.setItem('cassaforte_data', vaultData);
                        localStorage.setItem('cassaforte_master_salt', backupData.security.salt);
                        
                        setDialogConfig({
                            isOpen: true,
                            title: "Backup Ripristinato",
                            message: "Il backup criptato è stato caricato con successo! L'app ora si riavvierà per applicare i dati in sicurezza.",
                            type: 'success',
                            onConfirm: () => {
                                closeDialog();
                                window.location.reload(); 
                            }
                        });
                    } else {
                        throw new Error("Formato non valido");
                    }
                } catch (error) {
                    setDialogConfig({
                        isOpen: true,
                        title: "Errore Backup",
                        message: "Il file .mypass è danneggiato o non valido.",
                        type: 'danger',
                        onConfirm: closeDialog
                    });
                }
            } 
            else {
                let entries: PasswordEntry[] = [];
                let type = '';
                const isXML = text.includes("<?xml") || text.includes("<KeePassFile>");

                if (isXML) {
                    entries = parseKeePassXML(text);
                    type = 'XML';
                } else {
                    entries = parseCSV(text);
                    type = 'CSV';
                }

                if (entries.length > 0) {
                    const count = await importPasswords(entries);
                    await loadData(); 
                    setDialogConfig({
                        isOpen: true,
                        title: "Importazione Completata",
                        message: `Importate ${count} password con successo da file ${type}!`,
                        type: 'success',
                        onConfirm: closeDialog
                    });
                } else {
                    setDialogConfig({
                        isOpen: true,
                        title: "Errore Importazione",
                        message: "Nessuna password trovata. Assicurati che sia un file supportato.",
                        type: 'danger',
                        onConfirm: closeDialog
                    });
                }
            }
            
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };

        reader.readAsText(file);
    };

    const getCategoryIcon = (cat: string) => {
        if (categoryIconMap[cat] && ICON_MAP[categoryIconMap[cat]]) {
             const CustomIcon = ICON_MAP[categoryIconMap[cat]];
             return <CustomIcon size={24} />;
        }
        switch(cat) {
            case DefaultCategory.SOCIAL: return <Share2 size={24} />;
            case DefaultCategory.BANCA: return <Landmark size={24} />;
            case DefaultCategory.LAVORO: return <Briefcase size={24} />;
            case DefaultCategory.EMAIL: return <Mail size={24} />;
            case DefaultCategory.SHOPPING: return <ShoppingBag size={24} />;
            case DefaultCategory.ALTRO: return <Box size={24} />;
            default: return <Folder size={24} />;
        }
    };

    const getCategoryStyles = (cat: string) => {
        switch(cat) {
            case DefaultCategory.SOCIAL: return 'bg-sky-100 text-sky-700 border-sky-200';
            case DefaultCategory.BANCA: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case DefaultCategory.LAVORO: return 'bg-amber-100 text-amber-700 border-amber-200';
            case DefaultCategory.EMAIL: return 'bg-violet-100 text-violet-700 border-violet-200';
            case DefaultCategory.SHOPPING: return 'bg-pink-100 text-pink-700 border-pink-200';
            case DefaultCategory.ALTRO: return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-indigo-50 text-indigo-700 border-indigo-200';
        }
    };

    const categoryCounts = useMemo(() => {
        return passwords.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [passwords]);

    const filteredAndSortedPasswords = useMemo(() => {
        const filtered = passwords.filter(p => {
            const matchesSearch = 
                p.site.toLowerCase().includes(search.toLowerCase()) || 
                p.username.toLowerCase().includes(search.toLowerCase());
            
            if (search) return matchesSearch;
            if (selectedCategory) return p.category === selectedCategory;
            return false; 
        });

        return filtered.sort((a, b) => {
            if (sortMode === 'az') {
                return a.site.toLowerCase().localeCompare(b.site.toLowerCase());
            } else if (sortMode === 'oldest') {
                return a.updatedAt - b.updatedAt;
            } else {
                return b.updatedAt - a.updatedAt;
            }
        });
    }, [passwords, search, selectedCategory, sortMode]);

    const toggleSortMode = () => {
        if (sortMode === 'newest') setSortMode('oldest');
        else if (sortMode === 'oldest') setSortMode('az');
        else setSortMode('newest');
    };

    const getSortLabel = () => {
        if (sortMode === 'newest') return 'Più recenti';
        if (sortMode === 'oldest') return 'Più vecchie';
        return 'A-Z';
    };

    const renderPasswordList = (items: PasswordEntry[]) => (
        <div className="space-y-3 animate-[slideUp_0.4s_ease-out]">
            {items.map(entry => (
                <div 
                    key={entry.id} 
                    onClick={() => onEdit(entry)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 active:scale-[0.99] transition-all duration-100 hover:shadow-md hover:border-blue-200 cursor-pointer"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-3 overflow-hidden pr-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm shrink-0 ${getCategoryStyles(entry.category)}`}>
                                {getCategoryIcon(entry.category)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-slate-800 truncate text-base group-hover:text-blue-700 transition-colors">{entry.site}</h3>
                                <p className="text-xs text-slate-500 truncate">{entry.username}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between mt-3 border border-slate-200 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                        <div className="font-mono text-slate-700 text-sm truncate mr-2 select-all">
                            {visibleId === entry.id ? entry.passwordValue : masked(entry.passwordValue.length)}
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setVisibleId(visibleId === entry.id ? null : entry.id); }}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-full transition-colors"
                            >
                                {visibleId === entry.id ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleCopy(entry.passwordValue, entry.id); }}
                                className={`p-2 rounded-full transition-colors ${copiedId === entry.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-blue-600 hover:bg-white'}`}
                            >
                                <Copy size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            <AlertDialog 
                isOpen={dialogConfig.isOpen}
                title={dialogConfig.title}
                message={dialogConfig.message}
                type={dialogConfig.type}
                onConfirm={dialogConfig.onConfirm}
                onCancel={dialogConfig.onCancel}
                confirmLabel={dialogConfig.confirmLabel}
            />

            <div className="h-full flex flex-col bg-slate-100 relative">
                <div className="p-4 bg-slate-100 sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        {selectedCategory && !search && (
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className="p-2 -ml-2 text-slate-600 hover:bg-slate-200 rounded-full"
                            >
                                <ArrowLeft size={24} />
                            </button>
                        )}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                            <input 
                                type="text" 
                                placeholder={selectedCategory ? `Cerca in ${selectedCategory}...` : "Cerca ovunque..."}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all shadow-sm"
                            />
                        </div>
                        
                        {!selectedCategory && !search && (
                            <div className="relative ml-2">
                                <button 
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="p-3 bg-white text-slate-500 hover:text-blue-600 rounded-xl border border-slate-300 shadow-sm transition-colors focus:outline-none"
                                    title="Menu Opzioni"
                                >
                                    <Menu size={22} />
                                </button>

                                {isMenuOpen && (
                                    <>
                                        {/* Overlay invisibile per chiudere il menu cliccando fuori */}
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => setIsMenuOpen(false)}
                                        ></div>
                                        
                                        {/* Menu a tendina */}
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-[fadeIn_0.2s_ease-out]">
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                className="hidden" 
                                                accept="*/*" 
                                                onChange={(e) => {
                                                    setIsMenuOpen(false);
                                                    handleFileChange(e);
                                                }} 
                                            />
                                            
                                            <button 
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    handleImportClick();
                                                }}
                                                disabled={isImporting}
                                                className="w-full flex items-center px-4 py-3 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left"
                                            >
                                                {isImporting ? (
                                                    <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
                                                ) : (
                                                    <FileDown size={20} className="mr-3 text-slate-400" />
                                                )}
                                                <span className="font-medium text-sm">Importa Dati</span>
                                            </button>
                                            
                                            <div className="w-full h-px bg-slate-100 my-1"></div>
                                            
                                            <button 
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    handleExportClick();
                                                }}
                                                className="w-full flex items-center px-4 py-3 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left"
                                            >
                                                <FileUp size={20} className="mr-3 text-emerald-500" />
                                                <span className="font-medium text-sm">Esporta Backup</span>
                                            </button>
                                            <div className="w-full h-px bg-slate-100 my-1"></div>
                                            
                                            <button 
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    handleResetRequest();
                                                }}
                                                className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-left"
                                            >
                                                <Trash2 size={20} className="mr-3 text-red-500" />
                                                <span className="font-medium text-sm font-bold">Reset Totale</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pt-0 pb-36">
                    {search ? (
                        filteredAndSortedPasswords.length > 0 ? (
                            <div>
                                <div className="flex justify-between items-center mb-4 px-1">
                                    <p className="text-sm text-slate-500 font-medium">Risultati ricerca</p>
                                    <button onClick={toggleSortMode} className="flex items-center text-xs text-slate-500 hover:text-blue-600 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm transition-colors active:scale-95">
                                        <ArrowUpDown size={14} className="mr-1" />
                                        {getSortLabel()}
                                    </button>
                                </div>
                                {renderPasswordList(filteredAndSortedPasswords)}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-slate-400">
                                <p>Nessun risultato trovato.</p>
                            </div>
                        )
                    ) : selectedCategory ? (
                        <div>
                            <div className="flex justify-between items-end mb-6 mt-2">
                                <div className="flex items-center">
                                    <div className={`p-3 rounded-2xl mr-4 border ${getCategoryStyles(selectedCategory)}`}>
                                        {getCategoryIcon(selectedCategory)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedCategory}</h2>
                                        <p className="text-slate-500 text-sm">{categoryCounts[selectedCategory] || 0} Password</p>
                                    </div>
                                </div>
                                
                                {(categoryCounts[selectedCategory] || 0) > 1 && (
                                    <button onClick={toggleSortMode} className="flex items-center text-xs text-slate-500 hover:text-blue-600 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors active:scale-95">
                                        <ArrowUpDown size={14} className="mr-1" />
                                        {getSortLabel()}
                                    </button>
                                )}
                            </div>
                            
                            {filteredAndSortedPasswords.length > 0 ? (
                                renderPasswordList(filteredAndSortedPasswords)
                            ) : (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                                    <p className="text-slate-400 text-sm">Questa cartella è vuota.</p>
                                    <p className="text-slate-400 text-xs mt-1">Aggiungi una nuova password.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-2">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h2 className="text-lg font-bold text-slate-800">Le tue Cartelle</h2>
                                <button 
                                    onClick={() => setIsManageMode(!isManageMode)}
                                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${isManageMode ? 'bg-slate-800 text-white shadow-lg shadow-slate-300' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-400 hover:text-blue-600'}`}
                                >
                                    {isManageMode ? (
                                        <>
                                            <Check size={14} className="mr-1" /> Fatto
                                        </>
                                    ) : (
                                        <>
                                            <Edit2 size={14} className="mr-1" /> Gestisci
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {allCategories.map((cat, index) => (
                                    <div key={cat} className="relative group/card animate-[fadeInUp_0.4s_ease-out_both]" style={{ animationDelay: `${index * 60}ms` }}>
                                        <button
                                            disabled={isManageMode}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`w-full bg-white p-5 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 text-left flex flex-col justify-between h-40
                                                ${!isManageMode ? 'hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 active:scale-95' : 'cursor-default'}
                                                ${isManageMode ? 'animate-[shake_0.3s_infinite_alternate]' : ''}
                                            `}
                                        >
                                        
                                            <div className="flex justify-between items-start w-full">
                                                <div className={`p-2 rounded-xl transition-transform ${!isManageMode && 'group-hover/card:scale-110'} ${getCategoryStyles(cat)}`}>
                                                    {getCategoryIcon(cat)}
                                                </div>
                                                <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-full 
group-hover:bg-slate-200 transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-sm">
                                                    {categoryCounts[cat] || 0}
                                                </span>
                                            </div>
                                            <div>
                                                <span className={`font-semibold transition-colors truncate w-full block ${!isManageMode ? 'text-slate-700 group-hover/card:text-blue-700' : 'text-slate-400'}`} title={cat}>
                                                    {cat}
                                                </span>
                                            </div>
                                        </button>

                                        {isManageMode && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleHideCategory(cat);
                                                }}
                                                className={`absolute -top-2 -right-2 p-2 rounded-full shadow-lg border-2 border-white transition-all transform hover:scale-110 active:scale-95 z-20 
                                                    ${(categoryCounts[cat] || 0) > 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}
                                                `}
                                            >
                                                <Trash2 size={16} fill={(categoryCounts[cat] || 0) > 0 ? "none" : "currentColor"} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            {isManageMode && hiddenCategories.length > 0 && (
                                <div className="mt-8 animate-[fadeIn_0.3s_ease-out]">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1 flex items-center">
                                        <EyeOff size={14} className="mr-2" />
                                        Categorie Nascoste
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 opacity-80">
                                        {hiddenCategories.map(cat => (
                                            <div key={cat} className="relative group/card">
                                                <div className="w-full bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 text-left flex flex-col justify-between h-24 grayscale">
                                                    <div className="flex justify-between items-start w-full">
                                                        <div className={`p-2 rounded-xl bg-slate-100 text-slate-400`}>
                                                            {getCategoryIcon(cat)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="font-semibold text-slate-400 truncate w-full block">
                                                            {cat}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleUnhideCategory(cat)}
                                                    className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity"
                                                >
                                                    <div className="p-3 bg-emerald-500 text-white rounded-full shadow-lg transform hover:scale-110 transition-transform">
                                                        <RotateCcw size={20} />
                                                    </div>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}                           
                           

                            <style>{`
                                @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                                @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                                @keyframes bounceIn { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
                                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                                @keyframes shake { 
                                    0% { transform: rotate(-1deg); } 
                                    100% { transform: rotate(1deg); } 
                                }
                            `}</style>
                        </div>
                    )}
                </div>

                {!isManageMode && (
                    <div className="absolute bottom-8 right-8 z-10 animate-[bounceIn_0.5s_ease-out]">
                        <button 
                            onClick={() => onAddNew(selectedCategory || undefined)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-5 shadow-2xl shadow-blue-500/40 transition-all active:scale-90 hover:rotate-90 flex items-center justify-center"
                        >
                            <Plus size={32} />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};
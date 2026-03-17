import React, { useState, useEffect } from 'react';
import { PasswordEntry, DefaultCategory } from '../types';
import { savePassword, getPasswords, deletePassword } from '../services/storage';
import { Button } from './Button';
import { AlertDialog } from './AlertDialog';
import { 
    ArrowLeft, Save, RefreshCw, Settings2, X, Plus, Trash, AlertTriangle,
    Wallet, Gamepad2, Plane, Car, Home, Star, Heart, 
    Music, Book, Code, Coffee, Dumbbell, GraduationCap, 
    Gift, Key, Map, Phone, Wifi, Zap, Tv, Folder, Globe, Link
} from 'lucide-react';

interface EditorProps {
    entry?: PasswordEntry | null;
    initialCategory?: string;
    onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
    'Wallet': Wallet, 'Gamepad2': Gamepad2, 'Tv': Tv, 'Globe': Globe,
    'Plane': Plane, 'Car': Car, 'Home': Home, 'Star': Star,
    'Heart': Heart, 'Music': Music, 'Book': Book, 'Code': Code,
    'Coffee': Coffee, 'Dumbbell': Dumbbell, 'GraduationCap': GraduationCap,
    'Gift': Gift, 'Key': Key, 'Map': Map, 'Phone': Phone,
    'Wifi': Wifi, 'Zap': Zap, 'Folder': Folder
};

export const Editor: React.FC<EditorProps> = ({ entry, initialCategory, onClose }) => {
    const [site, setSite] = useState('');
    const [username, setUsername] = useState('');
    const [passwordValue, setPasswordValue] = useState('');
    const [confirmPasswordValue, setConfirmPasswordValue] = useState(''); // NUOVO STATO
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState<string>(entry?.category || initialCategory || DefaultCategory.ALTRO);
    const [categoryIcon, setCategoryIcon] = useState<string | undefined>(undefined);
    const [notes, setNotes] = useState('');
    
    const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
    const [customCategoryInput, setCustomCategoryInput] = useState('');
    const [selectedCustomIcon, setSelectedCustomIcon] = useState<string>('Folder');

    const [showGenerator, setShowGenerator] = useState(false);
    const [genLength, setGenLength] = useState(16);
    const [useLowercase, setUseLowercase] = useState(true);
    const [useUppercase, setUseUppercase] = useState(true);
    const [useNumbers, setUseNumbers] = useState(true);
    const [useSymbols, setUseSymbols] = useState(true);

    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const data = await getPasswords();
            setPasswords(data);
            
            const userCategories = new Set(data.map((p: PasswordEntry) => p.category));
            const defaults = Object.values(DefaultCategory) as string[];
            setAvailableCategories(Array.from(new Set([...defaults, ...userCategories])).sort());
        };
        loadData();
    }, []);

    useEffect(() => {
        if (entry) {
            setSite(entry.site);
            setUsername(entry.username);
            setPasswordValue(entry.passwordValue);
            setConfirmPasswordValue(entry.passwordValue); // Compila in automatico in modifica
            setCategory(entry.category);
            setCategoryIcon(entry.categoryIcon);
            
            if (entry.url) {
                setUrl(entry.url);
                setNotes(entry.notes || '');
            } else {
                const legacyUrlMatch = entry.notes ? entry.notes.match(/URL: (.*?)(?:\n|$)/) : null;
                if (legacyUrlMatch) {
                    setUrl(legacyUrlMatch[1].trim());
                    setNotes((entry.notes || '').replace(legacyUrlMatch[0], '').trim());
                } else {
                    setUrl('');
                    setNotes(entry.notes || '');
                }
            }
            
            if (entry.categoryIcon) {
                setSelectedCustomIcon(entry.categoryIcon);
            }
        }
    }, [entry]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // CONTROLLO PASSWORD UGUALI
        if (passwordValue !== confirmPasswordValue) {
            alert("Attenzione: le password inserite non coincidono!");
            return;
        }
        
        let finalCategory = category;
        let finalIcon = categoryIcon;

        if (isCustomCategoryMode && customCategoryInput.trim()) {
            finalCategory = customCategoryInput.trim();
            finalIcon = selectedCustomIcon;
        }

        const newEntry: PasswordEntry = {
            id: entry ? entry.id : crypto.randomUUID(),
            site,
            username,
            passwordValue,
            url: url.trim(),
            category: finalCategory,
            categoryIcon: finalIcon,
            notes: notes.trim(),
            createdAt: entry ? entry.createdAt : Date.now(),
            updatedAt: Date.now()
        };
        
        await savePassword(newEntry);
        onClose();
    };

    const handleDeleteClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!entry) return;

        if (isDeleting) {
            await deletePassword(entry.id);
            onClose();
        } else {
            setIsDeleting(true);
            setTimeout(() => setIsDeleting(false), 4000);
        }
    };

    const handleCloseAttempt = () => {
        const hasChanges = () => {
            if (entry) {
                let initialNotes = entry.notes || '';
                let initialUrl = entry.url || '';
                
                if (!entry.url && entry.notes) {
                    const legacyUrlMatch = entry.notes.match(/URL: (.*?)(?:\n|$)/);
                    if (legacyUrlMatch) {
                        initialUrl = legacyUrlMatch[1].trim();
                        initialNotes = entry.notes.replace(legacyUrlMatch[0], '').trim();
                    }
                }

                return (
                    site !== entry.site ||
                    username !== entry.username ||
                    passwordValue !== entry.passwordValue ||
                    url !== initialUrl ||
                    category !== entry.category ||
                    notes !== initialNotes ||
                    categoryIcon !== entry.categoryIcon
                );
            }

            const defaultCat = initialCategory || DefaultCategory.ALTRO;
            return (
                site.trim() !== '' ||
                username.trim() !== '' ||
                passwordValue !== '' ||
                url.trim() !== '' ||
                notes.trim() !== '' ||
                category !== defaultCat ||
                (isCustomCategoryMode && customCategoryInput.trim() !== '')
            );
        };

        if (hasChanges()) {
            setShowExitConfirm(true);
        } else {
            onClose();
        }
    };

    const generateLocalPassword = () => {
        let charset = "";
        if (useLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
        if (useUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (useNumbers) charset += "0123456789";
        if (useSymbols) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";

        if (charset === "") {
            charset = "abcdefghijklmnopqrstuvwxyz";
            setUseLowercase(true);
        }

        let newPassword = "";
        const array = new Uint32Array(genLength);
        window.crypto.getRandomValues(array);
        for (let i = 0; i < genLength; i++) {
            newPassword += charset[array[i] % charset.length];
        }
        setPasswordValue(newPassword);
        setConfirmPasswordValue(newPassword); // AUTO-COMPILA LA CONFERMA
    };

    const handleCategorySelect = (cat: string) => {
        setCategory(cat);
        const existing = passwords.find(p => p.category === cat && p.categoryIcon);
        if (existing) {
            setCategoryIcon(existing.categoryIcon);
        } else {
            setCategoryIcon(undefined);
        }
        setIsCustomCategoryMode(false);
    };

    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, color: 'bg-slate-200', textColor: 'text-slate-400', label: '' };
        let strength = 0;
        if (pass.length >= 8) strength += 1;
        if (pass.length >= 12) strength += 1;
        if (/[A-Z]/.test(pass)) strength += 1;
        if (/[a-z]/.test(pass)) strength += 1;
        if (/[0-9]/.test(pass)) strength += 1;
        if (/[^A-Za-z0-9]/.test(pass)) strength += 1;

        if (strength <= 2) return { score: 25, color: 'bg-red-500', textColor: 'text-red-500', label: 'Debole' };
        if (strength <= 4) return { score: 50, color: 'bg-amber-500', textColor: 'text-amber-500', label: 'Discreta' };
        if (strength === 5) return { score: 75, color: 'bg-emerald-400', textColor: 'text-emerald-500', label: 'Buona' };
        return { score: 100, color: 'bg-emerald-600', textColor: 'text-emerald-600', label: 'Forte' };
    };

    const strength = getPasswordStrength(passwordValue);

    const inputStyle = "block w-full px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all";
    
    const toggleClass = (active: boolean) => 
        `flex-1 py-2 px-1 text-xs font-semibold rounded-lg border transition-all ${active ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-400 border-slate-200'}`;

    return (
        <>
            <AlertDialog 
                isOpen={showExitConfirm}
                type="warning"
                title="Modifiche non salvate"
                message="Hai modificato dei dati. Se esci ora, le tue modifiche andranno perse."
                confirmLabel="Esci comunque"
                cancelLabel="Resta qui"
                onConfirm={() => {
                    setShowExitConfirm(false);
                    onClose();
                }}
                onCancel={() => setShowExitConfirm(false)}
            />

            <div className="bg-white h-full flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-20">
                    <button type="button" onClick={handleCloseAttempt} className="p-2 -ml-2 text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="font-semibold text-lg text-slate-800">{entry ? 'Modifica Password' : 'Nuova Password'}</h2>
                    <div className="w-10"></div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6" autoComplete="off">
                    <input type="text" style={{display: 'none'}} />
                    <input type="password" style={{display: 'none'}} />

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Titolo</label>
                        <input
                            required
                            type="text"
                            name="site_field_custom"
                            autoComplete="off"
                            value={site}
                            onChange={e => setSite(e.target.value)}
                            placeholder="es. Google, WiFi Casa, PIN Bancomat"
                            className={inputStyle}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL (Opzionale)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Link size={18} />
                            </div>
                            <input
                                type="text"
                                name="url_field_custom"
                                autoComplete="off"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                placeholder="www.esempio.com"
                                className={`${inputStyle} pl-10`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username / Email (Opzionale)</label>
                        <input
                            type="text"
                            name="username_field_custom"
                            autoComplete="off"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="email@esempio.com"
                            className={inputStyle}
                        />
                    </div>

                    <div className="p-1">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-slate-700">Password (Opzionale)</label>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowGenerator(!showGenerator);
                                    if (!showGenerator && !passwordValue) {
                                        generateLocalPassword();
                                    }
                                }}
                                className={`text-xs font-bold flex items-center transition-colors px-3 py-1.5 rounded-full ${showGenerator ? 'bg-slate-200 text-slate-700' : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                                {showGenerator ? <X size={14} className="mr-1" /> : <Settings2 size={14} className="mr-1" />}
                                {showGenerator ? 'Chiudi' : 'Generatore'}
                            </button>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                name="password_field_custom"
                                autoComplete="new-password"
                                value={passwordValue}
                                onChange={e => setPasswordValue(e.target.value)}
                                className={`${inputStyle} font-mono text-sm pr-10`}
                            />
                             <button 
                                type="button"
                                onClick={() => {
                                    if (!showGenerator) setShowGenerator(true);
                                    generateLocalPassword();
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-full"
                                title="Rigenera"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* CAMPO DI CONFERMA PASSWORD */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Conferma Password</label>
                            <input
                                type="text"
                                value={confirmPasswordValue}
                                onChange={e => setConfirmPasswordValue(e.target.value)}
                                placeholder="Riscrivi la password"
                                className={`${inputStyle} font-mono text-sm ${passwordValue !== confirmPasswordValue && confirmPasswordValue.length > 0 ? 'border-red-500 focus:ring-red-500 bg-red-50' : ''}`}
                            />
                            {passwordValue !== confirmPasswordValue && confirmPasswordValue.length > 0 && (
                                <p className="text-red-500 text-xs mt-1 font-medium px-1">Le password non coincidono!</p>
                            )}
                        </div>

                        {passwordValue && (
                            <div className="mt-4 animate-[fadeIn_0.2s_ease-out]">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-500 font-medium">Forza password</span>
                                    <span className={`text-xs font-bold ${strength.textColor}`}>{strength.label}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                                    <div 
                                        className={`h-full ${strength.color} transition-all duration-300 ease-out`} 
                                        style={{ width: `${strength.score}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        {showGenerator && (
                            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl animate-[fadeIn_0.2s_ease-out]">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Lunghezza: {genLength}</label>
                                    <input 
                                        type="range" min="8" max="32" value={genLength} 
                                        onChange={(e) => setGenLength(parseInt(e.target.value))}
                                        className="w-1/2 accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                
                                <div className="flex justify-between gap-2 mb-2">
                                    <button type="button" onClick={() => setUseLowercase(!useLowercase)} className={toggleClass(useLowercase)}>a-z</button>
                                    <button type="button" onClick={() => setUseUppercase(!useUppercase)} className={toggleClass(useUppercase)}>A-Z</button>
                                    <button type="button" onClick={() => setUseNumbers(!useNumbers)} className={toggleClass(useNumbers)}>0-9</button>
                                    <button type="button" onClick={() => setUseSymbols(!useSymbols)} className={toggleClass(useSymbols)}>!@#</button>
                                </div>
                                
                                <div className="mt-4">
                                    <Button 
                                        type="button" 
                                        onClick={generateLocalPassword} 
                                        className="text-xs py-2.5 h-auto w-full bg-slate-800 hover:bg-slate-900 text-white shadow-md shadow-slate-300"
                                    >
                                        Genera Nuova Password
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Categoria</label>
                        
                        {isCustomCategoryMode ? (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-[fadeIn_0.2s_ease-out]">
                                 <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">Nuova Categoria</h4>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomCategoryMode(false)}
                                        className="text-xs text-blue-600 font-semibold"
                                    >
                                        Annulla
                                    </button>
                                 </div>
                                 
                                <input
                                    autoFocus
                                    type="text"
                                    value={customCategoryInput}
                                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                                    placeholder="Nome (es. Streaming)"
                                    className={`${inputStyle} py-2 mb-4`}
                                />

                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Scegli Icona</h4>
                                <div className="grid grid-cols-6 gap-2">
                                    {Object.keys(ICON_MAP).map(iconName => {
                                        const Icon = ICON_MAP[iconName];
                                        const isSelected = selectedCustomIcon === iconName;
                                        return (
                                            <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => setSelectedCustomIcon(iconName)}
                                                className={`p-2 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-300 scale-110' : 'bg-white text-slate-500 border border-slate-200 hover:bg-blue-50'}`}
                                            >
                                                <Icon size={20} />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {availableCategories.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => handleCategorySelect(cat)}
                                        className={`py-2 px-3 text-xs rounded-lg border transition-all duration-200 font-medium ${
                                            category === cat 
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-transparent shadow-md transform scale-105' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-200 hover:bg-cyan-50'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomCategoryMode(true);
                                        setCustomCategoryInput('');
                                    }}
                                    className="py-2 px-3 text-xs rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 bg-slate-50 transition-all flex items-center"
                                >
                                    <Plus size={14} className="mr-1" /> Crea
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Note (Opzionale)</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className={`${inputStyle} resize-none`}
                        ></textarea>
                    </div>

                    <div className="pt-4 pb-12 flex flex-col gap-3">
                        <Button type="submit" fullWidth className="shadow-lg shadow-cyan-500/20">
                            <Save size={18} className="mr-2" />
                            {entry ? 'Salva Modifiche' : 'Salva Password'}
                        </Button>
                        
                        {entry && (
                            <div className="pt-2">
                                 {!isDeleting ? (
                                    <Button 
                                        type="button" 
                                        variant="secondary"
                                        fullWidth 
                                        onClick={handleDeleteClick}
                                        className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                                    >
                                        <Trash size={18} className="mr-2" />
                                        Elimina Password
                                    </Button>
                                 ) : (
                                    <Button 
                                        type="button" 
                                        variant="danger" 
                                        fullWidth 
                                        onClick={handleDeleteClick}
                                        className="animate-pulse font-bold bg-red-600 text-white hover:bg-red-700"
                                    >
                                        <AlertTriangle size={18} className="mr-2" />
                                        Conferma Eliminazione?
                                    </Button>
                                 )}
                                 {isDeleting && (
                                    <p className="text-center text-xs text-red-500 mt-2">
                                        Tocca di nuovo per confermare.
                                    </p>
                                 )}
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
};
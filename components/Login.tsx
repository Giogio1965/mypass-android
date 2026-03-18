import React, { useState, useEffect, useRef } from 'react';
import { hasMasterPassword, setMasterPassword, verifyMasterPassword } from '../services/storage';
import { Button } from './Button';
import { KeyRound, Download, Eye, EyeOff, AlertTriangle, UploadCloud } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

const CyberLock = () => (
    <svg viewBox="0 0 100 100" className="w-16 h-16 text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
        <defs>
            <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="1" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="darkCyan" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0e7490" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#164e63" stopOpacity="0.9" />
            </linearGradient>
        </defs>
        <circle cx="10" cy="20" r="1.5" fill="#67e8f9" opacity="0.6"/>
        <circle cx="85" cy="15" r="1.5" fill="#67e8f9" opacity="0.6"/>
        <circle cx="20" cy="85" r="1.5" fill="#67e8f9" opacity="0.6"/>
        <circle cx="90" cy="80" r="1.5" fill="#67e8f9" opacity="0.6"/>
        <line x1="10" y1="20" x2="30" y2="35" stroke="#67e8f9" strokeWidth="0.5" opacity="0.4"/>
        <line x1="85" y1="15" x2="65" y2="30" stroke="#67e8f9" strokeWidth="0.5" opacity="0.4"/>
        <path d="M 30,45 A 20,20 0 0,1 70,45 L 70,55 L 60,55 L 60,45 A 10,10 0 0,0 40,45 L 40,55 L 30,55 Z" fill="url(#cyanGlow)" />
        <rect x="25" y="52" width="50" height="40" rx="8" ry="8" fill="url(#darkCyan)" stroke="#22d3ee" strokeWidth="1.5" />
        <path d="M 25,52 L 50,70 L 25,92 Z" fill="#06b6d4" opacity="0.2" />
        <path d="M 75,52 L 50,70 L 75,92 Z" fill="#0891b2" opacity="0.3" />
        <path d="M 50,65 A 4,4 0 1,1 50,73 A 4,4 0 1,1 50,65 M 50,75 L 52,82 L 48,82 Z" fill="#cffafe" />
    </svg>
);

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isSetup, setIsSetup] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const checkSetup = () => {
        setIsSetup(!hasMasterPassword());
    };

    useEffect(() => {
        checkSetup();
        
        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    };

    const handleRestoreClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError('');
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;

            // Controllo basato sul contenuto del file per massima compatibilità mobile
            if (text.includes('"vault"') && text.includes('"security"')) {
                try {
                    const backupData = JSON.parse(text);
                    
                    if (backupData.vault && backupData.security?.salt) {
                        const vaultData = typeof backupData.vault === 'string' ? backupData.vault : JSON.stringify(backupData.vault);
                        
                        // Scriviamo i dati in modo forzato
                        localStorage.setItem('cassaforte_data', vaultData);
                        localStorage.setItem('cassaforte_master_salt', backupData.security.salt);
                        
                        // Messaggio di conferma che blocca l'esecuzione e dà tempo al sistema
                        alert('Dati importati con successo! Clicca OK per sbloccare il caveau.');
                        
                        // Ricarichiamo la pagina in modo pulito dopo un piccolo ritardo
                        setTimeout(() => {
                            window.location.href = window.location.origin + window.location.pathname;
                        }, 500);
                        
                        return; // Usciamo dalla funzione per evitare altri conflitti
                    }
                    setError("Il file di backup è danneggiato o non valido.");
                }
            } else {
                 setError("Formato file non supportato. Assicurati che sia un file di backup valido.");
            }
            
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; 
        };

        reader.onerror = () => {
             setError("Errore durante la lettura del file.");
             setLoading(false);
        };

        reader.readAsText(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        await new Promise(r => setTimeout(r, 600));

        try {
            if (isSetup) {
                if (password.length < 4) {
                    setError('La password deve essere di almeno 4 caratteri.');
                    setLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Le password non coincidono.');
                    setLoading(false);
                    return;
                }
                await setMasterPassword(password);
                onLogin();
            } else {
                const isValid = await verifyMasterPassword(password);
                if (isValid) {
                    onLogin();
                } else {
                    setError('Password errata.');
                }
            }
        } catch (e) {
            setError('Si è verificato un errore.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center min-h-[100dvh] overflow-y-auto bg-slate-900 p-4 py-8 sm:p-6 relative">
            
            <div className="w-full max-w-sm bg-slate-800 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] border border-cyan-900/50 overflow-hidden relative z-10 my-auto shrink-0">
                <div className="p-6 sm:p-8 text-center bg-slate-800 border-b border-cyan-900/30">
                    
                    <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center bg-slate-900/50 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] border border-cyan-800/30 mb-4 sm:mb-6">
                        <CyberLock />
                    </div>
                    
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-tight leading-none mb-2 drop-shadow-[0_2px_10px_rgba(6,182,212,0.3)]">MyPass</h1>

                    <p className="text-cyan-200/60 text-xs sm:text-sm font-medium">
                        {isSetup ? 'Inizializza la Cassaforte' : 'Bentornato, accedi ai tuoi dati'}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8 sm:py-8 space-y-5 sm:space-y-6">
                    {isSetup && (
                        <div className="p-4 bg-cyan-950/50 text-cyan-200 text-xs rounded-2xl border border-cyan-800/50 flex items-start shadow-sm">
                             <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0 text-cyan-400" />
                             <p className="leading-relaxed font-medium">
                                 Memorizza bene questa password. È l'unica chiave per accedere ai tuoi dati.
                             </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                                <KeyRound size={18} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-12 py-4 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                                placeholder={isSetup ? "Crea Master Password" : "Master Password"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {isSetup && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                                    <KeyRound size={18} />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-12 py-4 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 sm:text-sm"
                                    placeholder="Conferma Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className={`p-3 text-xs rounded-xl flex items-center ${error.includes('Backup caricato') ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50' : 'bg-red-950/50 text-red-400 border border-red-900/50'}`}>
                             <span className="mr-2 text-lg">⚠️</span> {error}
                        </div>
                    )}

                    <Button type="submit" fullWidth loading={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                        {isSetup ? 'Crea Nuovo Caveau' : 'Sblocca'}
                    </Button>
                    
                    {isSetup && (
                        <div className="pt-4 border-t border-cyan-900/30">
                            <p className="text-center text-xs text-slate-400 mb-3 uppercase tracking-wider font-bold">Oppure</p>
                            
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="*/*" 
                                onChange={handleFileChange} 
                            />
                            
                            <button
                                type="button"
                                onClick={handleRestoreClick}
                                disabled={loading}
                                className="w-full flex items-center justify-center py-3 px-4 border border-cyan-700/50 rounded-xl text-sm font-bold text-cyan-300 hover:bg-cyan-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                            >
                                <UploadCloud size={18} className="mr-2" />
                                Ripristina da Backup
                            </button>
                        </div>
                    )}
                </form>
            </div>

            <div className="mt-6 flex flex-col items-center space-y-3 relative z-10 shrink-0 pb-4">
                <p className="text-xs text-slate-400 text-center font-medium">
                    I tuoi dati sono crittografati <br/> e salvati solo su questo dispositivo.
                </p>
                
                {installPrompt && (
                    <button 
                        onClick={handleInstallClick}
                        className="flex items-center space-x-2 bg-cyan-900/50 text-cyan-300 border border-cyan-800 px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-cyan-800/50 transition-all active:scale-95"
                    >
                        <Download size={14} />
                        <span>Installa App</span>
                    </button>
                )}
            </div>
        </div>
    );
};

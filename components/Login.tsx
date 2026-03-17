import React, { useState, useEffect } from 'react';
import { hasMasterPassword, setMasterPassword, verifyMasterPassword } from '../services/storage';
import { Button } from './Button';
import { Lock, ShieldCheck, KeyRound, Download, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isSetup, setIsSetup] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        setIsSetup(!hasMasterPassword());
        
        // Listen for the PWA install prompt
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Artificial delay for UX
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-6 relative">
            
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-slate-300/50 border border-slate-200 overflow-hidden relative z-10">
                <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
                    <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-700 shadow-lg shadow-blue-200 mb-6 transform rotate-3">
                        {isSetup ? <ShieldCheck className="w-10 h-10 text-white" /> : <Lock className="w-10 h-10 text-white" />}
                    </div>
                    
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-2">MyPass</h1>

                    <p className="text-slate-500 text-sm font-medium">
                        {isSetup ? 'Configurazione Iniziale' : 'Bentornato, accedi ai tuoi dati'}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
                    {isSetup && (
                        <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded-2xl border border-amber-100 flex items-start shadow-sm">
                             <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0 text-amber-500" />
                             <p className="leading-relaxed font-medium">
                                 Memorizza bene questa password. È l'unica chiave per accedere ai tuoi dati.
                             </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                <KeyRound size={18} />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-12 py-4 border border-slate-300 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 sm:text-sm"
                                placeholder={isSetup ? "Crea Master Password" : "Master Password"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {isSetup && (
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                    <KeyRound size={18} />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-12 py-4 border border-slate-300 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 sm:text-sm"
                                    placeholder="Conferma Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center">
                            <span className="mr-2 text-lg">⚠️</span> {error}
                        </div>
                    )}

                    <Button type="submit" fullWidth loading={loading}>
                        {isSetup ? 'Imposta e Inizia' : 'Sblocca'}
                    </Button>
                </form>
            </div>

            <div className="mt-8 flex flex-col items-center space-y-3 relative z-10">
                <p className="text-xs text-slate-500 text-center font-medium">
                    I tuoi dati sono crittografati <br/> e salvati solo su questo dispositivo.
                </p>
                
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase opacity-70">
                    App creata da Giovanni Granata
                </p>

                {/* Install Button - Only shows if browser supports PWA installation */}
                {installPrompt && (
                    <button 
                        onClick={handleInstallClick}
                        className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-slate-400/50 hover:bg-slate-700 transition-all active:scale-95"
                    >
                        <Download size={14} />
                        <span>Installa App</span>
                    </button>
                )}
            </div>
        </div>
    );
};
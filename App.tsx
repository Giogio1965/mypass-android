import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Login } from './components/Login';
import { Vault } from './components/Vault';
import { Editor } from './components/Editor';
import { SecurityCheck } from './components/SecurityCheck';
import { AppView, PasswordEntry } from './types';
import { Plus, LogOut, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
    const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
    const [newEntryCategory, setNewEntryCategory] = useState<string | undefined>(undefined);
    
    // Riferimento al timer di inattività
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleLogout = useCallback(() => {
        setIsAuthenticated(false);
        setCurrentView(AppView.LOGIN);
        setEditingEntry(null);
    }, []);

    // Resetta il timer ogni volta che l'utente fa qualcosa
    const resetTimer = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        // Impostato a 3 minuti (180000 millisecondi)
        timeoutRef.current = setTimeout(() => {
            handleLogout();
        }, 180000);
    }, [handleLogout]);

    // Attiva gli "ascoltatori" di eventi solo quando l'utente è loggato
    useEffect(() => {
        if (isAuthenticated) {
            resetTimer(); // Avvia il timer al login
            
            const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
            events.forEach(event => document.addEventListener(event, resetTimer));

            // Pulizia quando il componente si smonta o l'utente esce
            return () => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                events.forEach(event => document.removeEventListener(event, resetTimer));
            };
        }
    }, [isAuthenticated, resetTimer]);
    // GESTIONE FILE HANDLING (.mypass)
    useEffect(() => {
        if ('launchQueue' in window && isAuthenticated) {
            (window as any).launchQueue.setConsumer(async (launchParams: any) => {
                if (launchParams.files && launchParams.files.length > 0) {
                    const fileHandle = launchParams.files[0];
                    try {
                        const file = await fileHandle.getFile();
                        const text = await file.text();

                        // Controlla se è un file mypass valido
                        if (file.name.endsWith('.mypass') || (text.includes('"vault":') && text.includes('"security":'))) {
                            const backupData = JSON.parse(text);
                            
                            if (backupData.vault && backupData.security?.salt) {
                                // Salva in localstorage (bypassando la decrittazione in questo step, avverrà al refresh)
                                localStorage.setItem('cassaforte_data', JSON.stringify(backupData.vault));
                                localStorage.setItem('cassaforte_master_salt', backupData.security.salt);
                                
                                alert("File .mypass rilevato e importato con successo! Clicca OK per riavviare l'app.");
                                window.location.reload();
                            } else {
                                alert("Il file .mypass non è valido o è corrotto.");
                            }
                        } else {
                            alert("Formato file non supportato.");
                        }
                    } catch (error) {
                        console.error("Errore nella lettura del file da launchQueue", error);
                        alert("Impossibile leggere il file.");
                    }
                }
            });
        }
    }, [isAuthenticated]);
    
    const handleLogin = () => {
        setIsAuthenticated(true);
        setCurrentView(AppView.VAULT);
    };

    const handleEdit = (entry: PasswordEntry) => {
        setEditingEntry(entry);
        setNewEntryCategory(undefined);
        setCurrentView(AppView.ADD_EDIT);
    };

    const handleAddNew = (category?: string) => {
        setEditingEntry(null);
        setNewEntryCategory(category);
        setCurrentView(AppView.ADD_EDIT);
    };

    const handleCloseEditor = () => {
        setCurrentView(AppView.VAULT);
        setEditingEntry(null);
        setNewEntryCategory(undefined);
    };

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="max-w-md mx-auto h-full bg-slate-100 relative shadow-2xl overflow-hidden flex flex-col border-x border-slate-200">
            {/* Main Layout Layer */}
            {currentView === AppView.VAULT && (
                <>
                    <header className="bg-white/95 backdrop-blur-md p-4 flex justify-between items-center border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">MyPass</h1>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentView(AppView.SECURITY)}
                                className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-emerald-600 rounded-full transition-colors group"
                                title="Security Check"
                            >
                                <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <button 
                                onClick={handleLogout}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                title="Esci"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </header>
                    
                    <main className="flex-1 overflow-hidden relative">
                        <Vault onEdit={handleEdit} onAddNew={handleAddNew} />
                    </main>
                </>
            )}

            {/* Modal Layers */}
            {currentView === AppView.ADD_EDIT && (
                <div className="absolute inset-0 z-30">
                    <Editor 
                        entry={editingEntry} 
                        initialCategory={newEntryCategory}
                        onClose={handleCloseEditor}
                    />
                </div>
            )}

            {currentView === AppView.SECURITY && (
                <div className="absolute inset-0 z-40">
                    <SecurityCheck 
                        onClose={() => setCurrentView(AppView.VAULT)}
                        onEdit={handleEdit}
                    />
                </div>
            )}
        </div>
    );
};

export default App;
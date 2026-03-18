import React, { useMemo, useState, useEffect } from 'react';
import { PasswordEntry } from '../types';
import { getPasswords } from '../services/storage';
import { ArrowLeft, ShieldCheck, ShieldAlert, Repeat, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';

interface SecurityCheckProps {
    onClose: () => void;
    onEdit: (entry: PasswordEntry) => void;
}

type RiskType = 'REUSED' | 'WEAK' | 'OLD' | null;

export const SecurityCheck: React.FC<SecurityCheckProps> = ({ onClose, onEdit }) => {
    const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
    const [selectedRisk, setSelectedRisk] = useState<RiskType>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getPasswords();
            setPasswords(data);
            setIsLoading(false);
        };
        load();
    }, []);

    const stats = useMemo(() => {
        let reusedCount = 0;
        let weakCount = 0;
        let oldCount = 0;
        
        const valueMap = new Map<string, number>();
        passwords.forEach(p => {
            const val = p.passwordValue;
            valueMap.set(val, (valueMap.get(val) || 0) + 1);
            
            if (val.length < 8) weakCount++;

            const daysDiff = (Date.now() - p.updatedAt) / (1000 * 60 * 60 * 24);
            if (daysDiff > 90) oldCount++;
        });

        valueMap.forEach((count) => {
            if (count > 1) reusedCount += count;
        });

        const total = passwords.length;
        if (total === 0) return { score: 100, reusedCount: 0, weakCount: 0, oldCount: 0, total: 0 };

        let score = 100;
        score -= (reusedCount * 5); 
        score -= (weakCount * 3);   
        score -= (oldCount * 1);    
        
        return {
            score: Math.max(0, Math.round(score)),
            reusedCount,
            weakCount,
            oldCount,
            total
        };
    }, [passwords]);

    const detailedList = useMemo(() => {
        if (!selectedRisk) return [];

        if (selectedRisk === 'WEAK') {
            return passwords.filter(p => p.passwordValue.length < 8);
        }
        
        if (selectedRisk === 'OLD') {
            return passwords.filter(p => (Date.now() - p.updatedAt) / (1000 * 60 * 60 * 24) > 90);
        }

        if (selectedRisk === 'REUSED') {
            const valueMap = new Map<string, number>();
            passwords.forEach(p => valueMap.set(p.passwordValue, (valueMap.get(p.passwordValue) || 0) + 1));
            return passwords.filter(p => (valueMap.get(p.passwordValue) || 0) > 1);
        }

        return [];
    }, [selectedRisk, passwords]);

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-emerald-500';
        if (s >= 50) return 'text-amber-500';
        return 'text-red-500';
    };

    const CircleProgress = ({ percentage }: { percentage: number }) => {
        const radius = 50;
        const stroke = 8;
        const normalizedRadius = radius - stroke * 2;
        const circumference = normalizedRadius * 2 * Math.PI;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        let strokeColor = '#10b981'; 
        if (percentage < 80) strokeColor = '#f59e0b'; 
        if (percentage < 50) strokeColor = '#ef4444'; 

        return (
            <div className="relative flex items-center justify-center w-40 h-40 mx-auto my-8">
                <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                    <circle
                        stroke="#e2e8f0"
                        strokeWidth={stroke}
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke={strokeColor}
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(percentage)}`}>{percentage}</span>
                    <span className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Score</span>
                </div>
            </div>
        );
    };

    const getRiskTitle = () => {
        switch(selectedRisk) {
            case 'REUSED': return 'Password Riutilizzate';
            case 'WEAK': return 'Password Deboli';
            case 'OLD': return 'Password Vecchie';
            default: return 'Analisi Sicurezza';
        }
    };

    const handleBack = () => {
        if (selectedRisk) {
            setSelectedRisk(null); 
        } else {
            onClose(); 
        }
    };

    if (isLoading) {
        return (
            <div className="bg-slate-50 h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 h-full flex flex-col relative">
            <div className="p-4 border-b border-slate-100 flex items-center bg-white sticky top-0 z-20">
                <button onClick={handleBack} className="p-2 -ml-2 text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="ml-2 font-semibold text-lg text-slate-800">{getRiskTitle()}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-24">
                
                {selectedRisk ? (
                    <div className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
                        <p className="text-sm text-slate-500 mb-4">
                            Clicca su una voce per modificarla e risolvere il problema.
                        </p>
                        {detailedList.map(entry => (
                            <button
                                key={entry.id}
                                onClick={() => onEdit(entry)}
                                className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-blue-300 transition-all text-left group active:scale-95"
                            >
                                <div>
                                    <h4 className="font-bold text-slate-800">{entry.site}</h4>
                                    <p className="text-sm text-slate-500">{entry.username}</p>
                                    {selectedRisk === 'WEAK' && (
                                        <p className="text-xs text-red-500 mt-1">Troppo corta ({entry.passwordValue.length} caratteri)</p>
                                    )}
                                    {selectedRisk === 'OLD' && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            Aggiornata il {new Date(entry.updatedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500" />
                            </button>
                        ))}
                    </div>
                ) : (
                    stats.total === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <p>Aggiungi delle password per vedere l'analisi.</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center mb-6">
                                <h3 className="text-slate-500 font-medium text-sm">Salute della Cassaforte</h3>
                                <CircleProgress percentage={stats.score} />
                                <p className="text-slate-600 text-sm px-4">
                                    {stats.score === 100 
                                        ? "Ottimo lavoro! Le tue password sono solide come una roccia." 
                                        : "Ci sono margini di miglioramento. Controlla i problemi qui sotto."}
                                </p>
                            </div>

                            <div className="space-y-3">
                                {/* Password Riutilizzate */}
                                <button 
                                    onClick={() => stats.reusedCount > 0 && setSelectedRisk('REUSED')}
                                    disabled={stats.reusedCount === 0}
                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                        stats.reusedCount > 0 
                                        ? 'bg-red-50 border-red-100 hover:bg-red-100 cursor-pointer active:scale-95' 
                                        : 'bg-white border-slate-200 cursor-default'
                                    }`}
                                >
                                    <div className="flex items-center text-left">
                                        <div className={`p-2 rounded-full mr-3 ${stats.reusedCount > 0 ? 'bg-red-200 text-red-700' : 'bg-slate-100 text-slate-400'}`}>
                                            <Repeat size={20} />
                                        </div>
                                        <div>
                                            <p className={`font-bold ${stats.reusedCount > 0 ? 'text-red-900' : 'text-slate-700'}`}>Password Riutilizzate</p>
                                            <p className="text-xs text-slate-500">Usare la stessa password è rischioso.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={`font-bold text-lg mr-2 ${stats.reusedCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>{stats.reusedCount}</span>
                                        {stats.reusedCount > 0 && <ChevronRight size={18} className="text-red-400" />}
                                    </div>
                                </button>

                                {/* Password Deboli */}
                                <button 
                                    onClick={() => stats.weakCount > 0 && setSelectedRisk('WEAK')}
                                    disabled={stats.weakCount === 0}
                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                        stats.weakCount > 0 
                                        ? 'bg-amber-50 border-amber-100 hover:bg-amber-100 cursor-pointer active:scale-95' 
                                        : 'bg-white border-slate-200 cursor-default'
                                    }`}
                                >
                                    <div className="flex items-center text-left">
                                        <div className={`p-2 rounded-full mr-3 ${stats.weakCount > 0 ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                                            <ShieldAlert size={20} />
                                        </div>
                                        <div>
                                            <p className={`font-bold ${stats.weakCount > 0 ? 'text-amber-900' : 'text-slate-700'}`}>Password Deboli</p>
                                            <p className="text-xs text-slate-500">Meno di 8 caratteri.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={`font-bold text-lg mr-2 ${stats.weakCount > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{stats.weakCount}</span>
                                        {stats.weakCount > 0 && <ChevronRight size={18} className="text-amber-400" />}
                                    </div>
                                </button>

                                {/* Password Vecchie */}
                                <button 
                                    onClick={() => stats.oldCount > 0 && setSelectedRisk('OLD')}
                                    disabled={stats.oldCount === 0}
                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                        stats.oldCount > 0 
                                        ? 'bg-orange-50 border-orange-100 hover:bg-orange-100 cursor-pointer active:scale-95' 
                                        : 'bg-white border-slate-200 cursor-default'
                                    }`}
                                >
                                    <div className="flex items-center text-left">
                                        <div className={`p-2 rounded-full mr-3 ${stats.oldCount > 0 ? 'bg-orange-200 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                                            <RefreshCw size={20} />
                                        </div>
                                        <div>
                                            <p className={`font-bold ${stats.oldCount > 0 ? 'text-orange-900' : 'text-slate-700'}`}>Password Vecchie</p>
                                            <p className="text-xs text-slate-500">Non aggiornate da 90 giorni.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={`font-bold text-lg mr-2 ${stats.oldCount > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{stats.oldCount}</span>
                                        {stats.oldCount > 0 && <ChevronRight size={18} className="text-orange-400" />}
                                    </div>
                                </button>

                                {stats.score === 100 && (
                                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center text-emerald-800 animate-pulse">
                                        <CheckCircle2 className="w-6 h-6 mr-3 text-emerald-500" />
                                        <p className="text-sm font-medium">Tutto perfetto! La tua cassaforte è sicura.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )
                )}
                
                <div className="mt-8 mb-4 text-center">
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase opacity-70">
                        App creata da Giovanni Granata
                    </p>
                </div>
            </div>
        </div>
    );
};
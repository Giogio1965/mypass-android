import React, { useState } from 'react';
import { generateSmartPassword } from '../services/geminiService';
import { Button } from './Button';
import { Sparkles, ArrowLeft, Copy, Check, ShieldAlert } from 'lucide-react';

interface GeneratorProps {
    onClose: () => void;
    onUse: (password: string) => void;
}

export const Generator: React.FC<GeneratorProps> = ({ onClose, onUse }) => {
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState<{password: string, advice: string} | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setPrompt("Genera una password molto complessa e sicura"); 
        }
        setLoading(true);
        setResult(null);
        
        const data = await generateSmartPassword(prompt || "Genera una password molto complessa e sicura");
        setResult(data);
        setLoading(false);
    };

    const copyToClipboard = () => {
        if (result) {
            navigator.clipboard.writeText(result.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="bg-slate-50 h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center bg-white sticky top-0 z-20">
                <button onClick={onClose} className="p-2 -ml-2 text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="ml-2 font-semibold text-lg flex items-center text-slate-800">
                    <Sparkles className="w-5 h-5 text-fuchsia-500 mr-2" />
                    Generatore IA
                </h2>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="bg-gradient-to-br from-fuchsia-600 to-blue-600 rounded-3xl p-6 text-white mb-6 shadow-xl shadow-fuchsia-200">
                    <h3 className="font-bold text-xl mb-2 flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-fuchsia-200" />
                        Chiedi a Gemini
                    </h3>
                    <p className="text-fuchsia-100 text-sm mb-4 leading-relaxed">
                        Descrivi che tipo di password ti serve. Es: "Facile da ricordare ma con numeri", "Solo caratteri speciali", "Lunga 24 caratteri".
                    </p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Es: Una password sicura per la banca..."
                        className="w-full bg-white/20 border border-white/30 rounded-xl p-3 text-white placeholder-fuchsia-100/70 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm resize-none h-24 backdrop-blur-sm"
                    />
                    <div className="mt-4 flex justify-end">
                        <Button 
                            onClick={handleGenerate} 
                            loading={loading}
                            variant="secondary"
                            className="bg-white text-fuchsia-700 hover:bg-fuchsia-50 border-none font-bold shadow-none"
                        >
                            Genera
                        </Button>
                    </div>
                </div>

                {result && (
                    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-400 to-blue-500"></div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Password Generata</label>
                            <div className="flex items-center justify-between mt-2">
                                <div className="font-mono text-xl text-slate-800 break-all mr-4 font-bold tracking-tight">
                                    {result.password}
                                </div>
                                <button 
                                    onClick={copyToClipboard}
                                    className="p-2 rounded-full bg-slate-50 hover:bg-cyan-50 hover:text-cyan-600 transition-colors shrink-0 border border-slate-100"
                                >
                                    {copied ? <Check size={20} className="text-green-500"/> : <Copy size={20}/>}
                                </button>
                            </div>
                        </div>

                        {result.advice && (
                            <div className="bg-cyan-50 rounded-xl p-4 flex items-start border border-cyan-100">
                                <ShieldAlert className="text-cyan-600 w-5 h-5 mt-0.5 mr-3 shrink-0" />
                                <p className="text-sm text-cyan-800 italic">
                                    "{result.advice}"
                                </p>
                            </div>
                        )}

                        <Button 
                            fullWidth 
                            onClick={() => onUse(result.password)}
                            className="mt-4"
                        >
                            Usa questa password
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
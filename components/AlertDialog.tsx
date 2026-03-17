import React from 'react';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export type AlertType = 'danger' | 'warning' | 'info' | 'success';

interface AlertDialogProps {
    isOpen: boolean;
    type?: AlertType;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void; // If not provided, it acts as a single button alert
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
    isOpen,
    type = 'info',
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Annulla',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertTriangle className="w-6 h-6 text-red-600" />;
            case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-600" />;
            case 'success': return <CheckCircle2 className="w-6 h-6 text-emerald-600" />;
            default: return <Info className="w-6 h-6 text-blue-600" />;
        }
    };

    const getBgColor = () => {
        switch (type) {
            case 'danger': return 'bg-red-100';
            case 'warning': return 'bg-amber-100';
            case 'success': return 'bg-emerald-100';
            default: return 'bg-blue-100';
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl p-6 transform transition-all scale-100 animate-[scaleIn_0.2s_ease-out] border border-slate-100">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${getBgColor()}`}>
                        {getIcon()}
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight">
                        {title}
                    </h3>
                    
                    <div className="text-sm text-slate-500 mb-6 leading-relaxed">
                        {message}
                    </div>

                    <div className="flex gap-3 w-full">
                        {onCancel && (
                            <Button 
                                variant="secondary" 
                                onClick={onCancel}
                                className="flex-1"
                            >
                                {cancelLabel}
                            </Button>
                        )}
                        <Button 
                            variant={type === 'danger' ? 'danger' : 'primary'}
                            onClick={onConfirm}
                            className="flex-1"
                            fullWidth={!onCancel}
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
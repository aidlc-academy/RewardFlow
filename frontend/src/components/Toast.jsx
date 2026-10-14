import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, X, Info } from 'lucide-react';

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-white',
      border: 'border-emerald-200',
      bar: 'bg-emerald-500',
      text: 'text-gray-800',
      iconColor: 'text-emerald-500'
    },
    error: {
      icon: XCircle,
      bg: 'bg-white',
      border: 'border-red-200',
      bar: 'bg-red-500',
      text: 'text-gray-800',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-white',
      border: 'border-amber-200',
      bar: 'bg-amber-500',
      text: 'text-gray-800',
      iconColor: 'text-amber-500'
    },
    info: {
      icon: Info,
      bg: 'bg-white',
      border: 'border-blue-200',
      bar: 'bg-blue-500',
      text: 'text-gray-800',
      iconColor: 'text-blue-500'
    }
  };

  const c = config[type] || config.success;
  const Icon = c.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${c.bg} ${c.border} shadow-lg max-w-sm w-full overflow-hidden relative`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.bar} rounded-l-2xl`} />
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.iconColor}`} />
      <p className={`text-sm font-medium flex-1 ${c.text}`}>{message}</p>
      <button
        onClick={onClose}
        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-5 right-5 z-50 space-y-2.5 w-80">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

let _id = 0;
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  return { toasts, addToast, removeToast };
}

import React, { useEffect, useState } from 'react';

interface NotificationToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const IconCheck = () => (<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);

const NotificationToast: React.FC<NotificationToastProps> = ({ message, onClose, duration = 4000 }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const handleClose = () => {
      setIsExiting(true);
      const timer = setTimeout(() => {
        onClose();
      }, 400); // Match animation duration
      return () => clearTimeout(timer);
    };

    const mainTimer = setTimeout(handleClose, duration);

    return () => {
      clearTimeout(mainTimer);
    };
  }, [duration, onClose]);

  const handleManualClose = () => {
      setIsExiting(true);
      setTimeout(() => {
        onClose();
      }, 400);
  }

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-md px-4 ${isExiting ? 'animate-toast-out' : 'animate-toast-in'}`}>
      <div className="flex items-center gap-4 w-full p-4 rounded-xl shadow-2xl bg-slate-800/80 backdrop-blur-lg border border-white/10 ring-1 ring-cyan-500/30">
        <div className="shrink-0 text-cyan-400">
            <IconCheck />
        </div>
        <p className="flex-1 text-sm font-medium text-slate-200">{message}</p>
        <button onClick={handleManualClose} className="p-1 rounded-full text-slate-500 hover:bg-white/10 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;

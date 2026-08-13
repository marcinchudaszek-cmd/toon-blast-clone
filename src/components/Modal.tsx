import React from 'react';

interface ModalProps {
  title: string;
  emoji: string;
  subtitle?: string;
  children: React.ReactNode;
  bgGradient?: string;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  emoji,
  subtitle,
  children,
  bgGradient = 'from-purple-600 to-blue-700',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`bg-gradient-to-b ${bgGradient} rounded-3xl p-8 mx-4 max-w-sm w-full shadow-2xl text-center`}
        style={{ boxShadow: '0 0 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)' }}
      >
        <div className="text-7xl mb-4 animate-bounce">{emoji}</div>
        <h2 className="text-3xl font-black text-white mb-2 drop-shadow-lg">{title}</h2>
        {subtitle && (
          <p className="text-white/80 text-sm mb-6">{subtitle}</p>
        )}
        <div className="space-y-3 mt-6">
          {children}
        </div>
      </div>
    </div>
  );
};

interface ModalButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const ModalButton: React.FC<ModalButtonProps> = ({ onClick, children, variant = 'primary' }) => {
  if (variant === 'primary') {
    return (
      <button
        onClick={onClick}
        className="w-full bg-gradient-to-b from-yellow-400 to-orange-500 text-white font-black text-lg py-3 rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all border-b-4 border-orange-700"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="w-full bg-white/20 text-white font-bold text-base py-3 rounded-2xl hover:bg-white/30 active:scale-95 transition-all border border-white/30"
    >
      {children}
    </button>
  );
};

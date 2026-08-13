import React, { useEffect, useState } from 'react';

interface Popup {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface ScorePopupProps {
  trigger: number; // score value - triggers new popup when changes
  lastGain: number;
}

let popupId = 0;

export const ScorePopup: React.FC<ScorePopupProps> = ({ trigger, lastGain }) => {
  const [popups, setPopups] = useState<Popup[]>([]);

  useEffect(() => {
    if (lastGain <= 0) return;
    const id = ++popupId;
    const x = 35 + Math.random() * 30;
    const y = 40 + Math.random() * 20;
    setPopups(prev => [...prev, { id, text: `+${lastGain}`, x, y }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 900);
  }, [trigger]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      {popups.map(p => (
        <div
          key={p.id}
          className="absolute text-yellow-400 font-black text-xl drop-shadow-lg animate-float-up"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
};

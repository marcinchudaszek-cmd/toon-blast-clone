import React from 'react';
import { GameSettings } from '../game/settings';

/** Rounded switch that reads as on/off at a glance, without any text label. */
const Toggle: React.FC<{ on: boolean; onChange: () => void; label: string }> = ({ on, onChange, label }) => (
  <button
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onChange}
    className={`relative w-14 h-8 rounded-full transition-colors border-b-2 ${
      on ? 'bg-emerald-400 border-emerald-700' : 'bg-white/20 border-white/20'
    }`}
  >
    <span
      className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
        on ? 'left-7' : 'left-1'
      }`}
    />
  </button>
);

const SpeakerIcon: React.FC<{ muted: boolean }> = ({ muted }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    {muted ? (
      <path d="M16 9l5 6M21 9l-5 6" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <>
        <path d="M16.5 8.5a5 5 0 010 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <path d="M19 6a8.5 8.5 0 010 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </>
    )}
  </svg>
);

const VibrateIcon: React.FC<{ off: boolean }> = ({ off }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="8" y="3" width="8" height="18" rx="2" stroke="#fff" strokeWidth="2" />
    {off ? (
      <path d="M4 4l16 16" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M4 9v6M20 9v6" />
        <path d="M1.5 11v2M22.5 11v2" opacity="0.6" />
      </g>
    )}
  </svg>
);

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="w-full max-w-xs bg-gradient-to-b from-indigo-600 to-indigo-900 rounded-3xl border-b-4 border-indigo-950 shadow-2xl p-5"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-black text-lg">Ustawienia</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/15 text-white/80 hover:bg-white/25 font-bold"
          aria-label="Zamknij ustawienia"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <SpeakerIcon muted={!settings.sound} />
            <span className="text-white font-bold text-sm">Dźwięk</span>
          </div>
          <Toggle on={settings.sound} label="Dźwięk" onChange={() => onChange({ sound: !settings.sound })} />
        </div>

        <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <VibrateIcon off={!settings.vibration} />
            <span className="text-white font-bold text-sm">Wibracje</span>
          </div>
          <Toggle
            on={settings.vibration}
            label="Wibracje"
            onChange={() => onChange({ vibration: !settings.vibration })}
          />
        </div>
      </div>

      <p className="text-white/50 text-[11px] text-center mt-4 leading-snug">
        Ustawienia zapisują się automatycznie na tym urządzeniu.
      </p>
    </div>
  </div>
);

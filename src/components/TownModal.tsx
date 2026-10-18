import React, { useState } from 'react';
import { TOWN, currentArea, isAreaDone, areaReward } from '../game/town';

interface Props {
  townStars: number;
  built: string[];
  onBuild: (id: string) => ReturnType<typeof areaReward> | null;
  onClose: () => void;
}

/** The town: spend stars on the current district, see the finished ones. */
export const TownModal: React.FC<Props> = ({ townStars, built, onBuild, onClose }) => {
  const [reward, setReward] = useState<ReturnType<typeof areaReward> | null>(null);
  const area = currentArea(built);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gradient-to-b from-emerald-700 to-teal-900 rounded-t-3xl sm:rounded-3xl w-full max-w-sm flex flex-col border border-white/20 shadow-2xl"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-white font-black text-lg">🏘️ Miasteczko</h2>
            <p className="text-white/70 text-xs mt-0.5">Buduj za gwiazdki zdobyte na poziomach</p>
          </div>
          <div className="bg-black/25 rounded-full px-3 py-1 text-yellow-200 font-black text-sm">⭐ {townStars}</div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3">
          {area ? (
            <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
              <p className="text-white font-black text-base mb-2">{area.icon} {area.name}</p>
              <div className="grid grid-cols-5 gap-2">
                {area.items.map(it => {
                  const isBuilt = built.includes(it.id);
                  const canBuild = !isBuilt && townStars >= it.cost;
                  return (
                    <button
                      key={it.id}
                      disabled={isBuilt || !canBuild}
                      onClick={() => { const r = onBuild(it.id); if (r) setReward(r); }}
                      className={`flex flex-col items-center rounded-xl py-2 border transition-all ${
                        isBuilt ? 'bg-emerald-400/25 border-emerald-300/60'
                          : canBuild ? 'bg-yellow-400/25 border-yellow-300 animate-glow active:scale-95'
                          : 'bg-black/20 border-white/10'}`}
                      title={it.name}
                    >
                      <span className={`text-2xl ${isBuilt ? '' : 'grayscale opacity-60'}`}>{it.icon}</span>
                      <span className="text-[10px] font-bold text-white mt-1">{isBuilt ? '✓' : `⭐${it.cost}`}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-white/60 text-[11px] mt-2">
                Za całą dzielnicę: duża paczka boosterów i power-upów 🎁
              </p>
            </div>
          ) : (
            <p className="text-white font-bold text-center py-4">🎉 Całe miasteczko zbudowane!</p>
          )}

          {TOWN.filter(a => isAreaDone(a, built)).map(a => (
            <div key={a.id} className="flex items-center gap-2 bg-black/15 rounded-xl px-3 py-2">
              <span className="text-xl">{a.icon}</span>
              <span className="text-white/80 text-sm font-semibold flex-1">{a.name}</span>
              <span className="text-lg tracking-tight">{a.items.map(i => i.icon).join('')}</span>
            </div>
          ))}
          {TOWN.filter(a => !isAreaDone(a, built) && a !== area).map(a => (
            <div key={a.id} className="flex items-center gap-2 bg-black/15 rounded-xl px-3 py-2 opacity-50">
              <span className="text-xl grayscale">{a.icon}</span>
              <span className="text-white/70 text-sm flex-1">{a.name}</span>
              <span className="text-xs text-white/60">🔒</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="m-4 mt-0 bg-white/15 text-white font-bold py-3 rounded-2xl border border-white/25 flex-shrink-0">
          Zamknij
        </button>
      </div>

      {reward && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={e => { e.stopPropagation(); setReward(null); }}>
          <div className="bg-gradient-to-b from-amber-400 to-orange-600 rounded-3xl p-6 mx-4 max-w-sm w-full text-center border border-white/20 animate-bounce-in">
            <div className="text-6xl mb-2">🎉</div>
            <h3 className="text-white font-black text-2xl mb-3">Dzielnica gotowa!</h3>
            <div className="flex justify-center gap-3 flex-wrap mb-4">
              {[['🔨', reward.hammer], ['⌛', reward.extraMoves], ['💥', reward.colorBomb], ['🚀', reward.rocket], ['💣', reward.bomb], ['🪩', reward.disco]]
                .map(([ic, n]) => (
                  <div key={ic as string} className="flex flex-col items-center w-10">
                    <span className="text-2xl">{ic}</span>
                    <span className="text-white font-black">+{n}</span>
                  </div>
                ))}
            </div>
            <button className="w-full bg-white text-orange-700 font-black py-3 rounded-2xl">Super!</button>
          </div>
        </div>
      )}
    </div>
  );
};

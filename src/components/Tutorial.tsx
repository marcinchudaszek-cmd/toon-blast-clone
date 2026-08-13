import React from 'react';

export interface TutorialStep {
  title: string;
  body: string;
  /** Board cell to point at, when the step is about a specific move. */
  highlight?: { row: number; col: number };
}

interface TutorialProps {
  step: TutorialStep;
  index: number;
  total: number;
  /** Pixel rect of the highlighted cell, measured from the live board. */
  spotlight: { top: number; left: number; width: number; height: number } | null;
  onNext: () => void;
  onSkip: () => void;
}

/**
 * First-run coach marks.
 *
 * The spotlight is cut out of the dimming layer with four solid panels rather
 * than one box-shadow trick, so the highlighted cell stays fully interactive
 * and crisp — the player can actually make the move the tooltip is describing.
 */
export const Tutorial: React.FC<TutorialProps> = ({ step, index, total, spotlight, onNext, onSkip }) => {
  const dim = 'absolute bg-black/70 backdrop-blur-[1px]';
  const isLast = index === total - 1;

  // Put the card on the opposite side of the screen from the spotlight so it
  // never covers the thing it is pointing at.
  const cardOnTop = spotlight ? spotlight.top > window.innerHeight / 2 : false;

  return (
    <div className="fixed inset-0 z-[70]">
      {spotlight ? (
        <>
          <div className={dim} style={{ top: 0, left: 0, right: 0, height: spotlight.top }} />
          <div className={dim} style={{ top: spotlight.top + spotlight.height, left: 0, right: 0, bottom: 0 }} />
          <div className={dim} style={{ top: spotlight.top, left: 0, width: spotlight.left, height: spotlight.height }} />
          <div
            className={dim}
            style={{
              top: spotlight.top,
              left: spotlight.left + spotlight.width,
              right: 0,
              height: spotlight.height,
            }}
          />
          <div
            className="absolute rounded-xl pointer-events-none animate-glow"
            style={{
              top: spotlight.top - 4,
              left: spotlight.left - 4,
              width: spotlight.width + 8,
              height: spotlight.height + 8,
              border: '3px solid #fde047',
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px]" />
      )}

      <div
        className={`absolute left-1/2 -translate-x-1/2 w-[88%] max-w-sm ${cardOnTop ? 'top-8' : 'bottom-10'}`}
      >
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-900 rounded-3xl border-b-4 border-indigo-950 shadow-2xl p-5 animate-bounce-in">
          <div className="flex items-center gap-1.5 mb-2">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-6 bg-yellow-300' : 'w-1.5 bg-white/25'
                }`}
              />
            ))}
          </div>

          <h3 className="text-white font-black text-lg leading-tight">{step.title}</h3>
          <p className="text-white/80 text-sm mt-1.5 leading-snug">{step.body}</p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={onNext}
              className="flex-1 bg-gradient-to-b from-yellow-300 to-orange-500 text-orange-950 font-black py-2.5 rounded-2xl border-b-4 border-orange-700 active:scale-95 transition-transform"
            >
              {isLast ? 'Gramy!' : 'Dalej →'}
            </button>
            {!isLast && (
              <button
                onClick={onSkip}
                className="px-4 text-white/60 hover:text-white text-sm font-semibold"
              >
                Pomiń
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

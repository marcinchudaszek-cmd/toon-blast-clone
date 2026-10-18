import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useGame, MILESTONE_INTERVAL, MILESTONE_BOOSTER_AMOUNT } from './game/useGame';
import { useBackButton } from './game/useBackButton';
import { useSettings } from './game/useSettings';
import { SettingsPanel } from './components/SettingsPanel';
import { Tutorial, TutorialStep } from './components/Tutorial';
import { findGroup, findHintGroup } from './game/logic';
import { PreLevelModal } from './components/PreLevelModal';
import { START_BOOSTER_INFO } from './game/rewards';
import { Cell } from './game/types';

interface Spotlight { top: number; left: number; width: number; height: number }

/** Picks a cell that actually starts a legal match, so the tutorial never
 *  points the player at a move that does nothing. */
function firstMatchableCell(board: Cell[][]): { row: number; col: number } | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      const cell = board[r][c];
      if (cell.type !== 'normal' || !cell.color) continue;
      if (findGroup(board, r, c).length >= 2) return { row: r, col: c };
    }
  }
  return null;
}
import { GameBoard } from './components/GameBoard';
import { HUD } from './components/HUD';
import { TargetPanel } from './components/TargetPanel';
import { Modal, ModalButton } from './components/Modal';
import { StartScreen } from './components/StartScreen';
import { Confetti } from './components/Confetti';
import { ScorePopup } from './components/ScorePopup';
import { LEVELS } from './game/levels';
import { BoosterType } from './game/types';

export default function App() {
  const {
    state, tapCell, nextLevel, restartLevel, startGame, gotoMenu, gotoLevel, totalLevels, progress,
    resetProgress, calculateStars, useBooster, cancelBooster,
    achievements, achievementToast, dismissAchievementToast,
    canClaimDaily, dailyOffer, claimDailyReward,
    canUseSecondChance, useSecondChance, secondChanceMoves, markTutorialSeen,
    beginLevel, streakPowerUps, startBoosterTypes, openStarChest, starChestGoal,
  } = useGame();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShuffle, setShowShuffle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, updateSettings] = useSettings();
  const lastScoreRef = useRef(0);
  const scoreGain = state.score - lastScoreRef.current;

  const isIdle = state.gameStatus === 'idle';
  const levelConfig = LEVELS[Math.min(state.level - 1, LEVELS.length - 1)];
  const levelName = levelConfig?.name ?? 'Nieznany';
  const starsEarned = state.gameStatus === 'won' && state.level <= totalLevels
    ? calculateStars(state.winMoves ?? state.moves, levelConfig?.moves ?? 1)
    : 0;
  const isMilestoneWin = state.gameStatus === 'won' && state.level <= totalLevels
    && state.level % MILESTONE_INTERVAL === 0;

  useEffect(() => {
    if (state.gameStatus === 'won') {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state.gameStatus]);

  useEffect(() => {
    lastScoreRef.current = state.score;
  }, [state.score]);

  // Announce a reshuffle so the board visibly changing never looks like a glitch
  useEffect(() => {
    if (state.shuffleSeq === 0) return;
    setShowShuffle(true);
    const t = setTimeout(() => setShowShuffle(false), 2000);
    return () => clearTimeout(t);
  }, [state.shuffleSeq]);

  // Auto-dismiss achievement toasts after a few seconds so they don't pile up
  useEffect(() => {
    if (!achievementToast) return;
    const t = setTimeout(() => dismissAchievementToast(), 3500);
    return () => clearTimeout(t);
  }, [achievementToast, dismissAchievementToast]);

  // Android hardware Back leaves the level instead of killing the app
  useBackButton(!isIdle, gotoMenu);

  // ── First-run tutorial ──
  const tutorialActive =
    !progress.tutorialSeen && state.level === 1 && state.gameStatus === 'playing' && !state.preLevel;

  const tutorialSteps: TutorialStep[] = useMemo(() => {
    const target = tutorialActive ? firstMatchableCell(state.board) : null;
    return [
      {
        title: 'Witaj w ToonBlast!',
        body: 'Zbierz klocki w kolorach pokazanych w celach u góry, zanim skończą Ci się ruchy.',
      },
      {
        title: 'Stuknij grupę klocków',
        body: 'Dwa lub więcej stykających się klocków tego samego koloru znikają po stuknięciu. Spróbuj tutaj!',
        highlight: target ?? undefined,
      },
      {
        title: 'Buduj power-upy',
        body: 'Grupa 4 klocków tworzy rakietę, 5 — bombę, a 7 lub więcej — kulę disco. Dwa power-upy obok siebie dają mega wybuch.',
      },
      {
        title: 'Masz boostery',
        body: 'Pasek pod wynikiem to Twoje boostery. A gdy zabraknie ruchów, możesz dograć jeszcze pięć za boostera ⌛.',
      },
    ];
    // The highlighted cell is picked once per board; re-picking on every board
    // change would make the spotlight jump around mid-sentence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialActive]);

  const [tutorialStep, setTutorialStep] = useState(0);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);

  // Measure the highlighted cell from the live board so the cut-out lines up
  // regardless of board size or device.
  useLayoutEffect(() => {
    if (!tutorialActive) { setSpotlight(null); return; }
    const hl = tutorialSteps[tutorialStep]?.highlight;
    if (!hl) { setSpotlight(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-cell="${hl.row},${hl.col}"]`);
    if (!el) { setSpotlight(null); return; }
    const r = el.getBoundingClientRect();
    setSpotlight({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [tutorialActive, tutorialStep, tutorialSteps]);

  // Taking the suggested move should advance the tutorial by itself.
  useEffect(() => {
    if (!tutorialActive || !state.statsDelta) return;
    setTutorialStep(s => (tutorialSteps[s]?.highlight ? s + 1 : s));
  }, [state.statsDelta, tutorialActive, tutorialSteps]);

  // ── Idle hint: after HINT_DELAY_MS without a move, pulse the best group ──
  const HINT_DELAY_MS = 5000;
  const [hintCells, setHintCells] = useState<Set<string> | undefined>(undefined);
  const hintAllowed = state.gameStatus === 'playing' && !state.animating && !state.preLevel
    && !state.activeBooster && !tutorialActive;
  useEffect(() => {
    setHintCells(undefined);
    if (!hintAllowed) return;
    const t = setTimeout(() => {
      const group = findHintGroup(state.board);
      if (group.length) setHintCells(new Set(group.map(([r, c]) => `${r},${c}`)));
    }, HINT_DELAY_MS);
    return () => clearTimeout(t);
  }, [state.board, hintAllowed]);

  const finishTutorial = () => {
    setTutorialStep(0);
    markTutorialSeen();
  };

  if (isIdle) {
    return (
      <>
        <StartScreen
          onStart={() => gotoLevel(progress.unlockedLevel)}
          onGotoLevel={gotoLevel}
          totalLevels={totalLevels}
          unlockedLevel={progress.unlockedLevel}
          bestScores={progress.bestScores}
          levelStars={progress.levelStars}
          onResetProgress={resetProgress}
          achievements={achievements}
          unlockedAchievements={progress.achievements}
          stats={progress.stats}
          canClaimDaily={canClaimDaily}
          dailyOffer={dailyOffer}
          dailyStreak={progress.dailyReward.streak}
          onClaimDaily={claimDailyReward}
          onOpenSettings={() => setShowSettings(true)}
          starChest={progress.starChest}
          starChestGoal={starChestGoal}
          onOpenStarChest={openStarChest}
          winStreak={progress.winStreak}
        />
        {achievementToast && (
          <AchievementToast achievement={achievementToast} onDismiss={dismissAchievementToast} />
        )}
        {showSettings && (
          <SettingsPanel settings={settings} onChange={updateSettings} onClose={() => setShowSettings(false)} />
        )}
      </>
    );
  }

  const boosters: { key: BoosterType; icon: string; label: string; hint: string }[] = [
    { key: 'hammer',     icon: '🔨', label: 'Młotek',   hint: 'Stuknij dowolny klocek, żeby go usunąć (bez zużycia ruchu)' },
    { key: 'extraMoves', icon: '⌛', label: '+3 ruchy',  hint: 'Od razu dodaje 3 ruchy' },
    { key: 'colorBomb',  icon: '💥', label: 'Bomba barw', hint: 'Usuwa wszystkie klocki najczęstszego koloru' },
  ];

  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-400 via-blue-600 to-indigo-800 flex flex-col items-center justify-start safe-game relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-6 left-4 w-20 h-8 bg-white/25 rounded-full blur-sm" />
        <div className="absolute top-14 right-6 w-14 h-6 bg-white/15 rounded-full blur-sm" />
        <div className="absolute top-4 left-1/3 w-24 h-9 bg-white/20 rounded-full blur-sm" />
        <div className="absolute bottom-24 left-1/5 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-12 right-1/5 w-36 h-36 bg-cyan-400/10 rounded-full blur-3xl" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="absolute text-white/10 text-2xl"
            style={{ top: `${10 + i * 12}%`, left: `${5 + i * 13}%`, animationDelay: `${i * 0.3}s` }}>
            ✦
          </div>
        ))}
      </div>

      {showConfetti && <Confetti />}
      <ScorePopup trigger={state.score} lastGain={scoreGain} />

      {/* Header */}
      <div className="w-full max-w-md mb-3 relative z-10">
        <div className="relative flex items-center justify-center">
          <button
            onClick={gotoMenu}
            className="absolute left-0 bg-white/20 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/30 transition-all text-sm border border-white/30 font-bold"
            title="Wróć do menu" aria-label="Wróć do menu"
          >
            ←
          </button>
          <HUD score={state.score} moves={state.moves} level={state.level} levelName={levelName} />
          <button
            onClick={() => setShowSettings(true)}
            className="absolute right-0 bg-white/20 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-white/30 transition-all border border-white/30"
            title="Ustawienia"
            aria-label="Ustawienia"
          >
            <GearIcon />
          </button>
        </div>
      </div>

      {/* ── Boosters bar ── */}
      <div className="flex gap-2 mb-3 relative z-10">
        {boosters.map(b => {
          const count = progress.boosters[b.key];
          const isActive = state.activeBooster === b.key;
          const isEmpty = count <= 0;
          return (
            <button
              key={b.key}
              onClick={() => {
                if (isActive) { cancelBooster(); return; }
                if (isEmpty || state.gameStatus !== 'playing' || state.animating || state.preLevel) return;
                useBooster(b.key);
              }}
              title={b.hint}
              disabled={isEmpty || state.gameStatus !== 'playing'}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border transition-all
                ${isActive
                  ? 'bg-yellow-400/30 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.6)] scale-105'
                  : isEmpty
                  ? 'bg-white/5 border-white/10 opacity-40 cursor-not-allowed'
                  : 'bg-white/15 border-white/25 hover:bg-white/25 active:scale-95 cursor-pointer backdrop-blur-sm'}
              `}
            >
              <span className="text-xl leading-none">{b.icon}</span>
              <span className="text-white text-[10px] font-bold leading-none">{b.label}</span>
              <span className={`text-[10px] font-black leading-none ${isEmpty ? 'text-white/30' : isActive ? 'text-yellow-300' : 'text-white/70'}`}>
                ×{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hammer hint */}
      {state.activeBooster === 'hammer' && (
        <div className="mb-2 relative z-10 bg-yellow-400/20 border border-yellow-400/50 rounded-full px-4 py-1.5 flex items-center gap-2">
          <span className="text-yellow-300 text-sm animate-pulse">🔨</span>
          <span className="text-yellow-100 text-xs font-semibold">Stuknij klocek, żeby go usunąć</span>
          <button onClick={cancelBooster} className="text-yellow-300/70 hover:text-yellow-200 text-xs ml-1">✕</button>
        </div>
      )}

      {/* Targets */}
      <div className="w-full max-w-md mb-3 relative z-10">
        <p className="text-white/60 text-xs text-center mb-2 uppercase tracking-widest font-semibold">🎯 Cele</p>
        <TargetPanel targets={state.targets} />
      </div>

      {/* Game Board */}
      <div className="relative z-10">
        <GameBoard board={state.board} onCellClick={tapCell} animating={state.animating} hintCells={hintCells} />
        {state.gameStatus === 'finale' && (
          <button
            onClick={() => tapCell(0, 0)}
            className="absolute inset-x-0 -top-3 mx-auto w-fit z-20 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-sm px-4 py-2 rounded-full shadow-xl border-b-2 border-orange-700 animate-bounce-in"
          >
            🚀 Bonus za ruchy: {state.moves} · dotknij, żeby pominąć
          </button>
        )}
        {showShuffle && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-indigo-900/85 border border-cyan-300/50 rounded-2xl px-5 py-3 flex items-center gap-2 animate-bounce-in shadow-2xl">
              <span className="text-2xl animate-spin-slow">🔀</span>
              <div>
                <p className="text-white font-black text-sm leading-tight">Brak ruchów!</p>
                <p className="text-cyan-200 text-xs leading-tight">Tasuję planszę…</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Moves remaining bar */}
      <div className="mt-4 relative z-10 flex flex-col items-center gap-1">
        <p className="text-white/60 text-xs uppercase tracking-wide font-semibold">
          Pozostało ruchów: {state.moves}
        </p>
        <div className="flex gap-1 flex-wrap justify-center max-w-xs">
          {Array.from({ length: Math.min(state.moves, 30) }, (_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
              state.moves <= 5 ? 'bg-red-400 animate-pulse' : state.moves <= 10 ? 'bg-yellow-400' : 'bg-emerald-400'
            }`} />
          ))}
          {state.moves > 30 && (
            <span className="text-white/60 text-xs self-center ml-1">+{state.moves - 30}</span>
          )}
        </div>
      </div>

      {/* Combo indicator */}
      {state.combo >= 2 && (
        <div className="mt-3 relative z-10">
          <div className={`text-white font-black text-xl px-6 py-2 rounded-full shadow-xl border-b-2 ${
            state.combo >= 4
              ? 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 border-indigo-800 animate-pulse'
              : 'bg-gradient-to-r from-yellow-400 to-orange-500 border-orange-700'
          }`}
            style={{ boxShadow: state.combo >= 4 ? '0 4px 24px rgba(200, 80, 255, 0.7)' : '0 4px 20px rgba(255, 150, 50, 0.6)' }}>
            {state.combo >= 4 ? `💥 MEGA COMBO ×${state.combo}!` : `🔥 COMBO ×${state.combo}!`}
          </div>
        </div>
      )}

      {/* Win Modal */}
      {state.gameStatus === 'won' && state.level <= totalLevels && (
        <Modal title="Poziom ukończony!" emoji="⭐" subtitle={`Poziom „${levelName}” zaliczony!`} bgGradient="from-yellow-500 to-orange-600">
          <div className="bg-white/20 rounded-2xl p-4 mb-2">
            <div className="flex justify-center gap-2 text-4xl mb-3">
              {[0, 1, 2].map(i => (
                <span key={i} className={i < starsEarned ? 'animate-bounce' : 'opacity-25 grayscale'}
                  style={{ animationDelay: `${i * 150}ms` }}>⭐</span>
              ))}
            </div>
            <p className="text-white/80 text-sm">Wynik</p>
            <p className="text-white font-black text-2xl">{state.score.toLocaleString()}</p>
            {starsEarned === 3 && (
              <p className="text-yellow-200 text-xs mt-1">🔨 +1 młotek w nagrodę!</p>
            )}
            <p className="text-orange-100 text-xs mt-2 font-semibold">
              🔥 Seria zwycięstw: {progress.winStreak}
              {streakPowerUps.length > 0 && <> · następny poziom: {streakPowerUps.map(b => START_BOOSTER_INFO[b].icon).join(' ')}</>}
            </p>
            <p className="text-yellow-100 text-xs mt-1">
              🎁 Skrzynia gwiazd: {Math.min(progress.starChest, starChestGoal)}/{starChestGoal}
              {progress.starChest >= starChestGoal && ' — do otwarcia w menu!'}
            </p>
            {isMilestoneWin && (
              <p className="text-cyan-200 text-xs mt-1 font-semibold">
                🎁 Bonus za etap! +{MILESTONE_BOOSTER_AMOUNT} każdego boostera (🔨 ⏱️ 🌈)
              </p>
            )}
          </div>
          {state.level < totalLevels ? (
            <ModalButton onClick={nextLevel} variant="primary">Następny poziom →</ModalButton>
          ) : (
            <ModalButton onClick={nextLevel} variant="primary">🏆 Zakończ grę!</ModalButton>
          )}
          <ModalButton onClick={restartLevel} variant="secondary">↺ Zagraj ponownie</ModalButton>
          <ModalButton onClick={gotoMenu} variant="secondary">☰ Menu</ModalButton>
        </Modal>
      )}

      {/* All Levels Complete */}
      {state.gameStatus === 'won' && state.level > totalLevels && (
        <Modal title="WYGRANA!" emoji="🏆" subtitle={`Ukończono wszystkie ${totalLevels} poziomów! Niesamowite!`} bgGradient="from-yellow-400 to-amber-600">
          <div className="bg-white/20 rounded-2xl p-4 mb-2">
            <p className="text-white font-bold">Łączny wynik</p>
            <p className="text-yellow-200 font-black text-3xl">{state.score.toLocaleString()}</p>
            <div className="flex justify-center gap-1 mt-2 text-2xl">
              {['🌟','🎉','🏆','🎊','🌟'].map((e, i) => (
                <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>{e}</span>
              ))}
            </div>
          </div>
          <ModalButton onClick={startGame} variant="primary">🎮 Zagraj od nowa!</ModalButton>
        </Modal>
      )}

      {/* Lose Modal */}
      {state.gameStatus === 'lost' && (
        <Modal title="Koniec ruchów!" emoji="💔" subtitle="Zabrakło ruchów. Dasz radę!" bgGradient="from-red-600 to-rose-800">
          {canUseSecondChance && (
            <>
              <div className="bg-white/20 rounded-2xl p-3 mb-2">
                <p className="text-white/90 text-sm font-semibold">Tak blisko!</p>
                <p className="text-white/70 text-xs mt-0.5">
                  Dograj {secondChanceMoves} ruchów za jednego boostera ⌛ i dokończ poziom.
                </p>
              </div>
              <ModalButton onClick={useSecondChance} variant="primary">
                ⌛ +{secondChanceMoves} ruchów (×{progress.boosters.extraMoves})
              </ModalButton>
              <ModalButton onClick={restartLevel} variant="secondary">↺ Spróbuj ponownie</ModalButton>
            </>
          )}
          {!canUseSecondChance && (
            <ModalButton onClick={restartLevel} variant="primary">↺ Spróbuj ponownie</ModalButton>
          )}
          <ModalButton onClick={gotoMenu} variant="secondary">☰ Menu</ModalButton>
        </Modal>
      )}

      {state.preLevel && state.gameStatus === 'playing' && (
        <PreLevelModal
          level={state.level}
          levelName={levelName}
          moves={state.moves}
          targets={state.targets}
          winStreak={progress.winStreak}
          streakGift={streakPowerUps}
          boosterTypes={startBoosterTypes}
          inventory={progress.startBoosters}
          onStart={beginLevel}
          onMenu={gotoMenu}
        />
      )}

      {achievementToast && (
        <AchievementToast achievement={achievementToast} onDismiss={dismissAchievementToast} />
      )}

      {showSettings && (
        <SettingsPanel settings={settings} onChange={updateSettings} onClose={() => setShowSettings(false)} />
      )}

      {tutorialActive && tutorialStep < tutorialSteps.length && (
        <Tutorial
          step={tutorialSteps[tutorialStep]}
          index={tutorialStep}
          total={tutorialSteps.length}
          spotlight={spotlight}
          onNext={() => {
            if (tutorialStep === tutorialSteps.length - 1) finishTutorial();
            else setTutorialStep(s => s + 1);
          }}
          onSkip={finishTutorial}
        />
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 13a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5v.2a2 2 0 11-4 0V19a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H2.5a2 2 0 110-4h.2A1.7 1.7 0 004.2 7a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V.9a2 2 0 114 0v.2a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.2a2 2 0 110 4H21a1.7 1.7 0 00-1.5 1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 1.2) scale(0.92) translate(1 0)"
      />
    </svg>
  );
}

function AchievementToast({ achievement, onDismiss }: { achievement: { emoji: string; title: string; description: string }; onDismiss: () => void }) {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-sm cursor-pointer animate-slide-down"
      onClick={onDismiss}
    >
      <div
        className="flex items-center gap-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-2xl px-4 py-3 border-b-4 border-amber-700 shadow-2xl"
        style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.4), 0 0 24px rgba(255,215,0,0.5)' }}
      >
        <div className="text-3xl animate-bounce">{achievement.emoji}</div>
        <div className="min-w-0">
          <p className="text-amber-950/70 text-[10px] font-black uppercase tracking-widest leading-none mb-0.5">
            🏆 Nowe osiągnięcie
          </p>
          <p className="text-amber-950 font-black text-sm leading-tight truncate">{achievement.title}</p>
          <p className="text-amber-900/80 text-xs leading-tight truncate">{achievement.description}</p>
        </div>
      </div>
    </div>
  );
}

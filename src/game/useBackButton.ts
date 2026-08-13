import { useEffect, useRef } from 'react';

/**
 * Makes Android's hardware Back button behave like a native app's.
 *
 * Capacitor routes the hardware Back press to the WebView's history, and with a
 * single-page game there is nothing on the stack — so Back used to kill the app
 * mid-level. Entering a level pushes a history entry; popping it (Back) leaves
 * the level instead of the app. On the menu there is nothing left to pop, so
 * Back falls through to Capacitor and closes the game, which is what a player
 * expects from the home screen.
 *
 * @param active   true while the player is inside a level
 * @param onBack   called when Back is pressed during a level
 */
export function useBackButton(active: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Tracks whether *we* pushed the current entry, so we never pop someone else's.
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!active) return;

    window.history.pushState({ toonblastLevel: true }, '');
    pushedRef.current = true;

    const handlePopState = () => {
      // The entry we pushed is already gone by the time this fires.
      pushedRef.current = false;
      onBackRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Leaving the level by any other route (menu button, finishing it) must
      // clean up the entry, or Back would silently consume a press later.
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, [active]);
}

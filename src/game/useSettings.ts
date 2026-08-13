import { useCallback, useEffect, useState } from 'react';
import { GameSettings, getSettings, setSettings, subscribeSettings } from './settings';

/**
 * React view over the settings module. The module is the source of truth
 * because the sound and haptics helpers read it from outside the component
 * tree; this hook just mirrors it into render state.
 */
export function useSettings(): [GameSettings, (patch: Partial<GameSettings>) => void] {
  const [settings, setLocal] = useState<GameSettings>(getSettings);

  useEffect(() => subscribeSettings(setLocal), []);

  const update = useCallback((patch: Partial<GameSettings>) => {
    setSettings(patch);
  }, []);

  return [settings, update];
}

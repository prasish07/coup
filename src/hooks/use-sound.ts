import { useCallback } from 'react';

type SoundName = 'coin' | 'card_flip' | 'eliminate' | 'challenge' | 'victory' | 'shuffle';

// Sound is a no-op until the EAS build includes expo-av (run: npx eas build --clear-cache)
// To enable: npm install expo-av, uncomment the full implementation, rebuild APK
export function useSound() {
  const play = useCallback((_name: SoundName) => {}, []);
  return { play };
}

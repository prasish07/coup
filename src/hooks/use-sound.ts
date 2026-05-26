import { useCallback, useEffect, useRef } from 'react';

type SoundName = 'coin' | 'card_flip' | 'eliminate' | 'challenge' | 'victory' | 'shuffle';

const SOUND_FILES: Partial<Record<SoundName, number>> = {
  // Drop .mp3 files into assets/sounds/ and uncomment when a new EAS build includes expo-av:
  // coin: require('../../assets/sounds/coin.mp3'),
  // card_flip: require('../../assets/sounds/card_flip.mp3'),
  // eliminate: require('../../assets/sounds/eliminate.mp3'),
  // challenge: require('../../assets/sounds/challenge.mp3'),
  // victory: require('../../assets/sounds/victory.mp3'),
  // shuffle: require('../../assets/sounds/shuffle.mp3'),
};

// Lazy-load expo-av so the app doesn't crash if the current APK was built without it
function getAudio() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-av').Audio as typeof import('expo-av').Audio;
  } catch {
    return null;
  }
}

export function useSound() {
  const soundCache = useRef<Record<string, unknown>>({});

  useEffect(() => {
    const Audio = getAudio();
    if (!Audio) return;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }).catch(() => {});
    return () => {
      Object.values(soundCache.current).forEach((s: unknown) => {
        (s as { unloadAsync?: () => Promise<void> })?.unloadAsync?.().catch(() => {});
      });
    };
  }, []);

  const play = useCallback(async (name: SoundName) => {
    const source = SOUND_FILES[name];
    if (!source) return;
    const Audio = getAudio();
    if (!Audio) return;
    try {
      let sound = soundCache.current[name] as { replayAsync: () => Promise<void> } | undefined;
      if (!sound) {
        const { sound: loaded } = await Audio.Sound.createAsync(source);
        soundCache.current[name] = loaded;
        sound = loaded as unknown as typeof sound;
      }
      await sound?.replayAsync();
    } catch {
      // Sound errors are non-fatal
    }
  }, []);

  return { play };
}

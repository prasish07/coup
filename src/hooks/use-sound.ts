import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

type SoundName = 'coin' | 'card_flip' | 'eliminate' | 'challenge' | 'victory' | 'shuffle';

const SOUND_FILES: Partial<Record<SoundName, number>> = {
  // Sound assets — add .mp3 files to assets/sounds/ and uncomment:
  // coin: require('../../assets/sounds/coin.mp3'),
  // card_flip: require('../../assets/sounds/card_flip.mp3'),
  // eliminate: require('../../assets/sounds/eliminate.mp3'),
  // challenge: require('../../assets/sounds/challenge.mp3'),
  // victory: require('../../assets/sounds/victory.mp3'),
  // shuffle: require('../../assets/sounds/shuffle.mp3'),
};

export function useSound() {
  const soundCache = useRef<Partial<Record<SoundName, Audio.Sound>>>({});

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    }).catch(() => {});

    return () => {
      Object.values(soundCache.current).forEach((s) => s?.unloadAsync().catch(() => {}));
    };
  }, []);

  const play = useCallback(async (name: SoundName) => {
    const source = SOUND_FILES[name];
    if (!source) return;

    try {
      let sound = soundCache.current[name];
      if (!sound) {
        const { sound: loaded } = await Audio.Sound.createAsync(source);
        soundCache.current[name] = loaded;
        sound = loaded;
      }
      await sound.replayAsync();
    } catch {
      // Sound errors are non-fatal — silently skip
    }
  }, []);

  return { play };
}

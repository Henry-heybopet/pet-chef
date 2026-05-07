// useDogProfile.js — 犬只档案持久化 hook（localStorage）
import { useState, useEffect } from 'react';

const KEY = 'heybo_dog_profile';

export function useDogProfile() {
  const [profile, setProfileState] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      try { setProfileState(JSON.parse(saved)); } catch {}
    }
  }, []);

  const setProfile = (p) => {
    setProfileState(p);
    localStorage.setItem(KEY, JSON.stringify(p));
  };

  const clearProfile = () => {
    setProfileState(null);
    localStorage.removeItem(KEY);
  };

  return { profile, setProfile, clearProfile, hasProfile: !!profile };
}

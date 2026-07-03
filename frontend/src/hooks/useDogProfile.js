// useDogProfile.js — Multi-pet profile persistence hook (localStorage)
import { useState, useEffect } from 'react';

const KEY_PROFILES = 'heybo_dog_profiles_list';
const KEY_ACTIVE_ID = 'heybo_dog_active_id';

export function useDogProfile() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveIdState] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedList = localStorage.getItem(KEY_PROFILES);
    if (savedList) {
      try {
        setProfiles(JSON.parse(savedList));
      } catch (e) {
        console.error('Failed to parse profiles list:', e);
      }
    }
    const savedActiveId = localStorage.getItem(KEY_ACTIVE_ID);
    if (savedActiveId) {
      setActiveIdState(savedActiveId);
    }
  }, []);

  const setActiveId = (id) => {
    setActiveIdState(id);
    localStorage.setItem(KEY_ACTIVE_ID, id);
  };

  const addProfile = (newPet) => {
    const petWithId = {
      ...newPet,
      id: newPet.id || `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    const updated = [...profiles, petWithId];
    setProfiles(updated);
    localStorage.setItem(KEY_PROFILES, JSON.stringify(updated));
    setActiveId(petWithId.id);
    return petWithId;
  };

  const updateProfile = (id, updatedData) => {
    const updated = profiles.map(p => {
      if (p.id === id) {
        return { ...p, ...updatedData, id }; // keep same id
      }
      return p;
    });
    setProfiles(updated);
    localStorage.setItem(KEY_PROFILES, JSON.stringify(updated));
  };

  const deleteProfile = (id) => {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    localStorage.setItem(KEY_PROFILES, JSON.stringify(updated));
    if (activeId === id) {
      const nextActiveId = updated.length > 0 ? updated[0].id : null;
      setActiveId(nextActiveId);
    }
  };

  const profile = profiles.find(p => p.id === activeId) || profiles[0] || null;

  return {
    profiles,
    profile,
    setActiveId,
    addProfile,
    updateProfile,
    deleteProfile,
    hasProfile: profiles.length > 0
  };
}

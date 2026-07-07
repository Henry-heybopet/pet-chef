// useDogProfile.js — Multi-pet profile state hook. Formal pet data comes from PostgreSQL.
import { useState } from 'react';

export function useDogProfile() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveIdState] = useState(null);

  const setActiveId = (id) => {
    setActiveIdState(id);
  };

  const addProfile = (newPet) => {
    const petWithId = {
      ...newPet,
      id: newPet.id || `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    const updated = [...profiles, petWithId];
    setProfiles(updated);
    setActiveId(petWithId.id);
    return petWithId;
  };

  const updateProfile = (id, updatedData) => {
    const updated = profiles.map(p => {
      if (p.id === id) {
        return { ...p, ...updatedData };
      }
      return p;
    });
    setProfiles(updated);
  };

  const deleteProfile = (id) => {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    if (activeId === id) {
      const nextActiveId = updated.length > 0 ? updated[0].id : null;
      setActiveId(nextActiveId);
    }
  };

  const replaceProfiles = (nextProfiles = []) => {
    setProfiles(nextProfiles);
    const nextActiveId = nextProfiles[0]?.id || null;
    setActiveId(nextActiveId);
  };

  const profile = profiles.find(p => p.id === activeId) || profiles[0] || null;

  return {
    profiles,
    profile,
    setActiveId,
    addProfile,
    updateProfile,
    deleteProfile,
    replaceProfiles,
    hasProfile: profiles.length > 0
  };
}

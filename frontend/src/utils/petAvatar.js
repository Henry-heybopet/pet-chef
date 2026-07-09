const API_BASE = import.meta.env.VITE_API_URL || '';

function apiAsset(path) {
  if (!path || !API_BASE || !String(path).startsWith('/uploads/')) return path;
  return `${API_BASE}${path}`;
}

export function fallbackPetAvatar(pet = {}) {
  return pet.species === 'cat' ? '/breeds/cat/li_hua.png' : '/dog.png';
}

export function resolvePetAvatar(pet = {}, breeds = []) {
  const direct = pet.avatar || pet.avatar_url || pet.avatarUrl || pet.imageUrl || pet.photo;
  if (direct) return apiAsset(direct);
  const breedName = typeof pet.breed === 'object' ? pet.breed?.name : (pet.breed || pet.breedName || pet.customBreed);
  const breed = breeds.find(item =>
    item.id === pet.breedId ||
    item.name === breedName ||
    (breedName && (breedName.includes(item.name) || item.name.includes(breedName)))
  );
  return breed?.img || fallbackPetAvatar(pet);
}

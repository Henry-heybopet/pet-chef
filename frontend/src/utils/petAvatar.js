const API_BASE = import.meta.env.VITE_API_URL || '';
const GENERIC_PET_AVATAR = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 128 128%22%3E%3Crect width=%22128%22 height=%22128%22 rx=%2264%22 fill=%22%23141b24%22/%3E%3Ccircle cx=%2242%22 cy=%2250%22 r=%2210%22 fill=%22%2300e6ff%22 opacity=%22.8%22/%3E%3Ccircle cx=%2264%22 cy=%2240%22 r=%2211%22 fill=%22%2300e6ff%22 opacity=%22.8%22/%3E%3Ccircle cx=%2286%22 cy=%2250%22 r=%2210%22 fill=%22%2300e6ff%22 opacity=%22.8%22/%3E%3Cellipse cx=%2264%22 cy=%2277%22 rx=%2232%22 ry=%2224%22 fill=%22%2300e6ff%22 opacity=%22.9%22/%3E%3C/svg%3E';

function withCacheKey(url, pet = {}) {
  const cacheKey = pet.avatarUpdatedAt || pet.avatar_updated_at || pet.updated_at || pet.updatedAt;
  if (!cacheKey || !url || url.startsWith('data:')) return url;
  if (!url.includes('/uploads/')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${encodeURIComponent(cacheKey)}`;
}

function normalizeAvatarUrl(path, pet = {}) {
  if (!path) return '';
  const value = String(path).trim();
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  if (/^https?:\/\//i.test(value)) return withCacheKey(value, pet);
  if (value.startsWith('/uploads/')) return withCacheKey(API_BASE ? `${API_BASE}${value}` : value, pet);
  if (value.startsWith('uploads/')) return withCacheKey(API_BASE ? `${API_BASE}/${value}` : `/${value}`, pet);
  return value;
}

export function fallbackPetAvatar(pet = {}) {
  return GENERIC_PET_AVATAR;
}

function uploadedAvatar(pet = {}) {
  return [
    pet.avatar_url,
    pet.avatarUrl,
    pet.photoUrl,
    pet.profileImage,
    pet.imageUrl,
    pet.photo,
    pet.avatar,
  ].find(value => String(value || '').trim());
}

export function getPetAvatarUrl(pet = {}, breeds = []) {
  const direct = uploadedAvatar(pet);
  if (direct) return normalizeAvatarUrl(direct, pet);

  const breedName = typeof pet.breed === 'object' ? pet.breed?.name : (pet.breed || pet.breedName || pet.customBreed);
  const breed = breeds.find(item =>
    item.id === pet.breedId ||
    item.name === breedName ||
    (breedName && (breedName.includes(item.name) || item.name.includes(breedName)))
  );
  return breed?.img || fallbackPetAvatar(pet);
}

export const resolvePetAvatar = getPetAvatarUrl;

export function handlePetAvatarError(event, pet = {}, context = 'img') {
  event.currentTarget.src = fallbackPetAvatar();
  event.currentTarget.onerror = null;
}

export function hasUploadedPetAvatar(pet = {}) {
  return Boolean(uploadedAvatar(pet));
}

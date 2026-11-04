// frontend/src/utils/avatar.ts
export const getValidAvatar = (avatar?: string | null): string => {
  if (!avatar) return '🦁';
  const trimmed = avatar.trim();
  // If the avatar is literally 'chess' or corrupted text
  if (trimmed.toLowerCase() === 'chess' || trimmed.length > 4) {
    return '🦁';
  }
  return trimmed;
};


export function toTitleCase(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export function getDisplayName(review) {
  if (review?.userDisplayName) return toTitleCase(review.userDisplayName);
  if (review?.userEmail) {
    const username = review.userEmail.split('@')[0];
    return toTitleCase(username.replace(/[._-]/g, ' '));
  }
  return 'Anonymous';
}

export const DEFAULT_AVATARS = [
  { id: 'boy', url: '/avatars/boy.png', label: 'Boy', gender: 'male' },
  { id: 'girl', url: '/avatars/girl.png', label: 'Girl', gender: 'female' },
  { id: 'pet', url: '/avatars/pet.png', label: 'Pet', gender: null },
  { id: 'nature', url: '/avatars/nature.png', label: 'Nature', gender: null },
] as const

// Returns the default avatar URL based on gender
export function getDefaultAvatar(gender?: string | null): string {
  if (gender?.toLowerCase() === 'female') return '/avatars/girl.png'
  if (gender?.toLowerCase() === 'male') return '/avatars/boy.png'
  return '/avatars/boy.png' // default
}

// Returns the avatar URL to display (custom or default based on gender)
export function getAvatarUrl(avatarUrl: string | null | undefined, gender?: string | null): string {
  if (avatarUrl) return avatarUrl
  return getDefaultAvatar(gender)
}

// Check if an avatar URL is a default avatar
export function isDefaultAvatar(url: string): boolean {
  return DEFAULT_AVATARS.some(a => url.endsWith(a.url))
}

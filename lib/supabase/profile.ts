import type { Profile } from '@/types'

// Normalize profile so name always has a value regardless of column name
export function normalizeProfile(raw: any): Profile {
  return {
    ...raw,
    name: raw.name || raw.full_name || raw.email || 'User',
  } as Profile
}

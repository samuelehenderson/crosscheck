// Favorite team: one tap on a team page remembers your club in this browser.
// A custom event keeps every component (header star, landing card) in sync.

import { useEffect, useState } from 'react'

const KEY = 'im.favTeam'
const EVENT = 'im:fav-change'

export function getFavorite(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setFavorite(teamId: string | null) {
  try {
    if (teamId) localStorage.setItem(KEY, teamId)
    else localStorage.removeItem(KEY)
  } catch {
    // Private mode — favorite lasts the session via the event below.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: teamId }))
}

export function useFavorite(): [string | null, (id: string | null) => void] {
  const [fav, setFav] = useState<string | null>(getFavorite)
  useEffect(() => {
    const onChange = (e: Event) => setFav((e as CustomEvent<string | null>).detail)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])
  return [fav, setFavorite]
}

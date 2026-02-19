/**
 * Sound effects for save and delete actions.
 * Audio files are in public/sounds/ (save-whoosh.mp3, delete-remove.mp3).
 */

const SAVE_SOUND = '/sounds/save-effect.mp3'
const DELETE_SOUND = '/sounds/delete-effect.mp3'

let saveAudio: HTMLAudioElement | null = null
let deleteAudio: HTMLAudioElement | null = null

function getSaveAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!saveAudio) {
    saveAudio = new Audio(SAVE_SOUND)
  }
  return saveAudio
}

function getDeleteAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!deleteAudio) {
    deleteAudio = new Audio(DELETE_SOUND)
  }
  return deleteAudio
}

export function playSaveSound(): void {
  try {
    const audio = getSaveAudio()
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
  } catch {
    // Ignore playback errors (e.g. user hasn't interacted with page)
  }
}

export function playDeleteSound(): void {
  try {
    const audio = getDeleteAudio()
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {})
    }
  } catch {
    // Ignore playback errors
  }
}

import React, { createContext, useContext, useEffect, useState } from 'react'

interface FontSizeContextType {
  fontSize: number
  setFontSize: (size: number) => void
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined)

const DEFAULT_FONT_SIZE = 16 // Base font size in pixels
const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 24

export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [fontSize, _setFontSize] = useState<number>(() => {
    const savedFontSize = localStorage.getItem('fontSize')
    const parsedSize = savedFontSize ? parseInt(savedFontSize, 10) : DEFAULT_FONT_SIZE
    // Clamp the value between min and max
    return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, parsedSize))
  })

  useEffect(() => {
    const applyFontSize = (size: number) => {
      const root = document.documentElement
      root.style.setProperty('--base-font-size', `${size}px`)
      // Also set it as a CSS variable that can be used with rem calculations
      root.style.setProperty('--font-size-multiplier', `${size / DEFAULT_FONT_SIZE}`)
    }

    applyFontSize(fontSize)
  }, [fontSize])

  const setFontSize = (size: number) => {
    // Clamp the value between min and max
    const clampedSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size))
    localStorage.setItem('fontSize', clampedSize.toString())
    _setFontSize(clampedSize)
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFontSize = () => {
  const context = useContext(FontSizeContext)
  if (!context) {
    throw new Error('useFontSize must be used within a FontSizeProvider')
  }
  return context
}

'use client'

import React from 'react'
import './SalesforcePathComponent.css'

export type StageStatus = 'selected' | 'selectedPending' | 'currentOutline' | 'done' | 'inNextOne' | 'notDone'

export interface PathStageProps {
  name: string
  status: StageStatus
  isHovered?: boolean
  isClickable?: boolean
  isFirst?: boolean
  isLast?: boolean
  hasError?: boolean
  doneColor?: string
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function PathStage({
  name,
  status,
  isHovered = false,
  isClickable = true,
  isFirst = false,
  isLast = false,
  hasError = false,
  doneColor = '#047857',
  onClick,
  onMouseEnter,
  onMouseLeave,
}: PathStageProps) {
  const getStatusClass = () => {
    switch (status) {
      case 'selected':
        return 'stage--selected'
      case 'selectedPending':
        return 'stage--selected-pending'
      case 'currentOutline':
        return 'stage--current-outline'
      case 'done':
        return 'stage--completed'
      case 'inNextOne':
        return 'stage--next'
      case 'notDone':
        return 'stage--future'
      default:
        return ''
    }
  }

  const isHomeStage = isFirst && status !== 'selected' && status !== 'done' && status !== 'currentOutline'

  const handleClick = () => {
    if (isClickable && onClick) onClick()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.()
    }
  }

  const DARK_GREEN = '#0a1612'
  const DARK_GREEN_HOVER = '#0d2818'

  const getInlineStyles = (): React.CSSProperties => {
    if (status === 'selectedPending') {
      return {
        backgroundColor: isHovered ? DARK_GREEN_HOVER : DARK_GREEN,
        borderColor: isHovered ? DARK_GREEN_HOVER : DARK_GREEN,
        color: 'white',
        ['--done-color' as string]: DARK_GREEN,
      }
    }
    if (status === 'done') {
      const hoverBrightness = isHovered ? 0.85 : 1
      return {
        backgroundColor: doneColor,
        borderColor: doneColor,
        color: 'white',
        filter: `brightness(${hoverBrightness})`,
        ['--done-color' as string]: doneColor,
      }
    }
    return {}
  }

  return (
    <div
      className={`
        stage path-stage
        ${getStatusClass()}
        ${isFirst ? 'stage--first' : ''}
        ${isLast ? 'stage--last' : ''}
        ${isClickable ? 'stage--clickable' : ''}
        ${isHovered ? 'stage--hovered' : ''}
        ${isHomeStage ? 'stage--home' : ''}
        ${(status === 'selected' || status === 'currentOutline') && hasError ? 'stage--error' : ''}
      `}
      style={getInlineStyles()}
      onClick={handleClick}
      onMouseEnter={isClickable ? onMouseEnter : undefined}
      onMouseLeave={onMouseLeave}
      tabIndex={isClickable ? 0 : -1}
      role="button"
      aria-pressed={status === 'done' || status === 'selected' || status === 'selectedPending' || status === 'currentOutline'}
      onKeyDown={handleKeyDown}
      title={name}
    >
      <div className="stage-inner">
        <span className="stage-content">
          <span className={`stage-name ${status === 'done' ? 'stage-name--with-check' : ''}`}>{name}</span>
        </span>
      </div>
    </div>
  )
}

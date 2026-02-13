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
  /** Color when stage is current (selected/selectedPending) */
  currentColor?: string
  /** Hover color when stage is current */
  currentColorHover?: string
  /** Background when current is in outline mode */
  currentOutlineColor?: string
  /** Background hover when current is in outline mode */
  currentOutlineColorHover?: string
  /** Border color when current is in outline mode */
  currentOutlineBorderColor?: string
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const DEFAULT_CURRENT = '#0a1612'
const DEFAULT_CURRENT_HOVER = '#0d2818'
const DEFAULT_OUTLINE = '#ecfdf5'
const DEFAULT_OUTLINE_HOVER = '#d1fae5'
const DEFAULT_OUTLINE_BORDER = '#0a1612'

export function PathStage({
  name,
  status,
  isHovered = false,
  isClickable = true,
  isFirst = false,
  isLast = false,
  hasError = false,
  doneColor = '#047857',
  currentColor = DEFAULT_CURRENT,
  currentColorHover = DEFAULT_CURRENT_HOVER,
  currentOutlineColor = DEFAULT_OUTLINE,
  currentOutlineColorHover = DEFAULT_OUTLINE_HOVER,
  currentOutlineBorderColor = DEFAULT_OUTLINE_BORDER,
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

  const getInlineStyles = (): React.CSSProperties => {
    if (status === 'selected' || status === 'selectedPending') {
      const fill = isHovered ? currentColorHover : currentColor
      return {
        backgroundColor: fill,
        borderColor: fill,
        color: 'white',
        ['--current-color' as string]: fill,
        ['--done-color' as string]: currentColor,
      }
    }
    if (status === 'currentOutline') {
      const fill = isHovered ? currentOutlineColorHover : currentOutlineColor
      const borderCol = isHovered ? currentColorHover : currentOutlineBorderColor
      return {
        backgroundColor: fill,
        color: currentOutlineBorderColor,
        boxShadow: `inset 0 0 0 1px ${borderCol}`,
        ['--current-outline-color' as string]: fill,
        ['--current-outline-border-color' as string]: borderCol,
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

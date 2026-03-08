'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PathStage, type StageStatus } from './PathStage'
import { Button } from '@/components/ui/button'

export interface SalesforcePathStep {
  value: string
  label: string
  /** When this stage is the current one, use this color instead of the default */
  color?: string
  /** Hover color when this stage is current. Defaults to color if not set */
  colorHover?: string
}

interface SalesforcePathProps {
  steps: SalesforcePathStep[]
  currentStep: string
  onStepClick?: (value: string) => void
  /**
   * When provided, enables the two-button flow:
   * - Default: current stage preselected (dark green), "Mark stage as complete" advances to next
   * - When user selects a different stage (outline): "Mark as current" sets that stage
   */
  onStageChange?: (newValue: string) => void | Promise<void>
  hasError?: boolean
  fieldLabel?: string
  className?: string
  /** Default color when a stage is current (used when step has no color override). Default: #0a1612 */
  currentColor?: string
  /** Default hover color when current. Default: #0d2818 */
  currentColorHover?: string
  /** Default background when current is in outline mode. Default: #ecfdf5 */
  currentOutlineColor?: string
  /** Default background hover when current is in outline mode. Default: #d1fae5 */
  currentOutlineColorHover?: string
  /** Default border when current is in outline mode. Default: #0a1612 */
  currentOutlineBorderColor?: string
  /** Color when step is achieved (done). When step has no color, this green is used. Default: #047857 */
  doneColor?: string
}

export function SalesforcePath({
  steps,
  currentStep,
  onStepClick,
  onStageChange,
  hasError = false,
  fieldLabel,
  className,
  currentColor = '#0a1612',
  currentColorHover = '#0d2818',
  currentOutlineColor = '#ecfdf5',
  currentOutlineColorHover = '#d1fae5',
  currentOutlineBorderColor = '#0a1612',
  doneColor = '#047857',
}: SalesforcePathProps) {
  const { t } = useTranslation('common')
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const stagesRef = useRef<HTMLDivElement>(null)
  const [needsScrolling, setNeedsScrolling] = useState(false)

  const currentIndex = steps.findIndex((s) => s.value === currentStep)

  const canScrollLeft = useMemo(() => scrollPosition > 0, [scrollPosition])
  const canScrollRight = useMemo(() => {
    if (!stagesRef.current) return false
    return stagesRef.current.scrollWidth - stagesRef.current.clientWidth > scrollPosition
  }, [scrollPosition])

  const determineStageStatus = (stepValue: string): StageStatus => {
    if (onStageChange) {
      if (selectedStage && stepValue === selectedStage) return 'selectedPending'
      if (currentIndex >= 0) {
        const stepIndex = steps.findIndex((s) => s.value === stepValue)
        if (stepIndex !== -1 && stepIndex < currentIndex) return 'done'
        if (stepIndex === currentIndex) return selectedStage ? 'currentOutline' : 'selected'
      }
      return 'notDone'
    }
    if (currentIndex >= 0) {
      const stepIndex = steps.findIndex((s) => s.value === stepValue)
      if (stepIndex !== -1 && stepIndex < currentIndex) return 'done'
      if (stepIndex === currentIndex && !hasError) return 'selected'
    }
    return 'notDone'
  }

  const handleStageClick = (stepValue: string) => {
    if (onStageChange) {
      if (stepValue === currentStep) {
        setSelectedStage(null)
        return
      }
      setSelectedStage(stepValue)
    } else if (onStepClick) {
      onStepClick(stepValue)
    }
  }

  const nextStageValue =
    currentIndex >= 0 && currentIndex < steps.length - 1
      ? steps[currentIndex + 1].value
      : null

  const handleMarkAsComplete = async () => {
    if (onStageChange && nextStageValue) {
      setIsUpdating(true)
      try {
        await onStageChange(nextStageValue)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const handleMarkAsCurrent = async () => {
    if (onStageChange && selectedStage) {
      setIsUpdating(true)
      try {
        await onStageChange(selectedStage)
        setSelectedStage(null)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (!stagesRef.current) return
    const containerWidth = stagesRef.current.clientWidth
    const newPosition =
      direction === 'left'
        ? Math.max(0, scrollPosition - containerWidth / 2)
        : Math.min(
            stagesRef.current.scrollWidth - containerWidth,
            scrollPosition + containerWidth / 2
          )
    setScrollPosition(newPosition)
    stagesRef.current.style.transform = `translateX(-${newPosition}px)`
  }

  useEffect(() => {
    if (!stagesRef.current) return
    const needsScroll = stagesRef.current.scrollWidth > stagesRef.current.clientWidth
    setNeedsScrolling(needsScroll)
  }, [steps])

  return (
    <div className={`w-full ${className ?? ''}`}>
      {fieldLabel && (
        <div className="flex items-center justify-between gap-4 mb-2">
          <label className="text-sm font-medium text-muted-foreground">
            {fieldLabel}
          </label>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center gap-2 w-full">
        <div className="path-wrapper flex-1 min-w-0 w-full md:w-auto">
          {needsScrolling && (
            <button
              className="scroll-button scroll-left"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1 overflow-hidden">
            <div
              className="path-stages"
              ref={stagesRef}
              role="progressbar"
              aria-valuenow={
                currentIndex >= 0 ? Math.round(((currentIndex + 1) / steps.length) * 100) : 0
              }
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {steps.map((step, index) => {
                const status = determineStageStatus(step.value)
                const isCurrent = status === 'selected' || status === 'selectedPending' || status === 'currentOutline'
                const stageColor = isCurrent && step.color ? step.color : currentColor
                const stageColorHover = isCurrent && step.color ? (step.colorHover ?? step.color) : currentColorHover
                const stageOutlineBorder = isCurrent && step.color ? step.color : currentOutlineBorderColor
                const stageDoneColor = step.color ?? doneColor
                return (
                <PathStage
                  key={step.value}
                  name={step.label}
                  status={status}
                  isFirst={index === 0}
                  isLast={index === steps.length - 1}
                  isClickable={!isUpdating && (!!onStepClick || !!onStageChange)}
                  isHovered={hoveredStage === step.value}
                  hasError={hasError && step.value === currentStep}
                  doneColor={stageDoneColor}
                  currentColor={stageColor}
                  currentColorHover={stageColorHover}
                  currentOutlineColor={currentOutlineColor}
                  currentOutlineColorHover={currentOutlineColorHover}
                  currentOutlineBorderColor={stageOutlineBorder}
                  onClick={() => handleStageClick(step.value)}
                  onMouseEnter={() => setHoveredStage(step.value)}
                  onMouseLeave={() => setHoveredStage(null)}
                />
              )})}
            </div>
          </div>
          {needsScrolling && (
            <button
              className="scroll-button scroll-right"
              onClick={() => handleScroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        {onStageChange && (
          <>
            {selectedStage ? (
              <Button
                onClick={handleMarkAsCurrent}
                disabled={isUpdating}
                className="h-8 whitespace-nowrap w-full md:w-auto flex-shrink-0"
                size="sm"
              >
                {isUpdating ? t('updating') : t('markAsCurrent')}
              </Button>
            ) : (
              <Button
                onClick={handleMarkAsComplete}
                disabled={!nextStageValue || isUpdating}
                className="h-8 whitespace-nowrap w-full md:w-auto flex-shrink-0"
                size="sm"
              >
                {isUpdating ? t('updating') : t('markStageComplete')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

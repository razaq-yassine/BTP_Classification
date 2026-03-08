import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GenericRecord } from '@/types/object-definition'
import { cn } from '@/lib/utils'

const STEP_LABELS: Record<string, string> = {
  info: 'Informations générales',
  sectors: 'Secteurs',
  ca: "Chiffre d'affaires",
  capital: 'Capital social',
  masse: 'Masse salariale',
  encadrement: 'Encadrement',
  materiel: 'Matériel minimum',
  recap: 'Récapitulatif',
}

export interface DossierWizardPageProps {
  /** When provided, edit mode with existing dossier */
  initialDossier?: GenericRecord | null
  /** Step names for progress (from DossierWizard internals) - we pass steps from parent */
  steps?: { n: number; key: string }[]
  currentStepNum?: number
  displayStep?: number
  totalSteps?: number
  progressPercent?: number
  onGoPrev?: () => void
  onGoNext?: () => void
  saving?: boolean
  /** When true, disables the Suivant button (e.g. ICE invalid on step 1) */
  nextDisabled?: boolean
  error?: string
  isLastStep?: boolean
  /** Content render prop - the wizard passes its form content */
  renderStep?: () => React.ReactNode
}

/**
 * Full-page layout wrapper for DossierWizard.
 * Renders breadcrumb, progress bar, and sticky bottom bar.
 * The actual wizard logic lives in DossierWizard which renders this via layout='page'.
 */
export function DossierWizardPage(props: DossierWizardPageProps) {
  const {
    steps = [],
    currentStepNum = 1,
    displayStep = 1,
    totalSteps = 9,
    progressPercent = 0,
    onGoPrev,
    onGoNext,
    saving,
    nextDisabled,
    error,
    isLastStep,
    renderStep,
  } = props

  const isFirstStep = currentStepNum <= 1
  const showNextLabel = isLastStep ? 'Soumettre' : 'Suivant'

  return (
    <div className="w-full max-w-[800px] mx-auto px-4 py-6 pb-24">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-4">
        <Link to="/dossiers" className="hover:text-foreground transition-colors">
          Dossiers
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">
          {props.initialDossier?.id ? 'Modifier le dossier' : 'Nouveau dossier'}
        </span>
      </nav>

      {/* Step progress bar with names */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>
            Étape {displayStep} sur {totalSteps}
          </span>
          {steps[displayStep - 1] && (
            <span className="font-medium text-foreground">
              {STEP_LABELS[steps[displayStep - 1]?.key] ?? steps[displayStep - 1]?.key}
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">{error}</div>
      )}

      {/* Main content */}
      <div className="min-h-[200px]">{renderStep?.()}</div>

      {/* Sticky bottom bar */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40',
          'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          'py-4 px-4'
        )}
      >
        <div className="max-w-[800px] mx-auto flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={onGoPrev}
            disabled={isFirstStep || saving}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>

          <span className="text-sm text-muted-foreground shrink-0">
            Étape {displayStep} / {totalSteps}
          </span>

          <Button
            onClick={onGoNext}
            disabled={saving || nextDisabled}
            className="flex items-center gap-1 ml-auto"
          >
            {saving ? 'Enregistrement...' : showNextLabel}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

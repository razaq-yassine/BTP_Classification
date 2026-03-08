import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DossierResumeBannerProps {
  objectDefinition: ObjectDefinition
  record: GenericRecord | null
  onResumeClick: () => void
}

export function DossierResumeBanner({
  objectDefinition,
  record,
  onResumeClick,
}: DossierResumeBannerProps) {
  if (objectDefinition.name !== 'dossier' || !record) return null

  const status = record.status as string | undefined
  if (!status) return null

  if (status === 'COMPLETED') return null

  const currentStep = record.currentStep != null ? Number(record.currentStep) : 1

  if (status === 'DRAFT' || status === 'IN_PROGRESS') {
    return (
      <button
        type="button"
        onClick={onResumeClick}
        className={cn(
          'w-full text-left rounded-lg p-3 mb-4 transition-colors',
          'bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700',
          'hover:bg-amber-200 dark:hover:bg-amber-900/50',
          'flex items-center justify-between gap-2'
        )}
      >
        <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
          Ce dossier est incomplet (étape {currentStep}/9). Reprendre la simulation
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      </button>
    )
  }

  if (status === 'EDITING') {
    return (
      <button
        type="button"
        onClick={onResumeClick}
        className={cn(
          'w-full text-left rounded-lg p-3 mb-4 transition-colors',
          'bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700',
          'hover:bg-orange-200 dark:hover:bg-orange-900/50',
          'flex items-center justify-between gap-2'
        )}
      >
        <span className="text-sm font-medium text-orange-900 dark:text-orange-200">
          Modification en cours. Les résultats précédents restent visibles. Terminer la modification
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-orange-700 dark:text-orange-300" />
      </button>
    )
  }

  return null
}

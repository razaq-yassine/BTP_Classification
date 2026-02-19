import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ImportantFieldsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  emptyImportantFields: string[]
  onContinue: () => void
  onCancel: () => void
}

export function ImportantFieldsDialog({
  open,
  onOpenChange,
  emptyImportantFields,
  onContinue,
  onCancel
}: ImportantFieldsDialogProps) {
  const { t } = useTranslation('common')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('importantFieldsEmpty')}</DialogTitle>
        </DialogHeader>
        
        <div className="py-2">
          {emptyImportantFields.map((field, index) => (
            <div key={index} className="text-sm py-1">
              {field}
            </div>
          ))}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button onClick={onContinue}>
            {t('continueAnyway')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

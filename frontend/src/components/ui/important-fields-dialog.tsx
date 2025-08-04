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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Important fields are empty</DialogTitle>
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
            Cancel
          </Button>
          <Button onClick={onContinue}>
            Continue anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

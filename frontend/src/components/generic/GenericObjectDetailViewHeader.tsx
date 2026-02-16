
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'

interface GenericObjectDetailViewHeaderProps {
  objectDefinition: ObjectDefinition
  record: GenericRecord
  onDelete?: (record: GenericRecord) => void
}

export function GenericObjectDetailViewHeader({
  objectDefinition,
  record,
  onDelete
}: GenericObjectDetailViewHeaderProps) {
  const { canUpdate, canDelete } = usePermissions()
  const Icon = objectDefinition.icon
  const headerConfig = objectDefinition.header
  
  // Get display name for the record
  const getDisplayName = (record: GenericRecord) => {
    return record.full_name || record.name || record.title || `${objectDefinition.label} #${record.id}`
  }
  
  // Get image URL if imageField is specified
  const getImageUrl = () => {
    if (headerConfig?.imageField && record[headerConfig.imageField]) {
      return record[headerConfig.imageField]
    }
    return null
  }
  
  const displayName = getDisplayName(record)
  const imageUrl = getImageUrl()
  
  return (
    <Card className="mb-2 py-4">
      <CardContent className="p-0">
        {/* Main Header */}
        <div className="px-4 py-2">
          <div className="flex items-start justify-between">
            {/* Left side - Avatar/Icon and Name */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                {imageUrl ? (
                  <AvatarImage src={imageUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-muted">
                  {Icon && <Icon className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
                <p className="text-muted-foreground">{objectDefinition.label}</p>
              </div>
            </div>
            
            {/* Right side - Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Primary Actions - filter by update permission for edit-type actions */}
              {headerConfig?.primaryActions?.filter((action) => {
                const actionKey = action.key
                if (actionKey === 'edit') return canUpdate(objectDefinition.name)
                return true
              }).map((action) => {
                const ActionIcon = action.icon
                return (
                  <Button
                    key={action.key}
                    variant={action.variant || 'default'}
                    onClick={() => action.onClick(record)}
                    className="flex items-center gap-2"
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4" />}
                    {action.label}
                  </Button>
                )
              })}
              
              {/* Secondary Actions Dropdown */}
              {(() => {
                const filteredSecondary = headerConfig?.secondaryActions?.filter((action) => {
                  const actionKey = action.key
                  if (actionKey === 'delete') return canDelete(objectDefinition.name)
                  if (actionKey === 'edit') return canUpdate(objectDefinition.name)
                  return true
                }) || []
                if (filteredSecondary.length === 0) return null
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {filteredSecondary.map((action) => {
                        const ActionIcon = action.key === 'delete' ? Trash2 : action.icon
                        const handleClick =
                          action.key === 'delete' && onDelete
                            ? () => onDelete(record)
                            : () => action.onClick(record)
                        return (
                          <DropdownMenuItem
                            key={action.key}
                            onClick={handleClick}
                            variant={action.key === 'delete' ? 'destructive' : 'default'}
                            className="flex items-center gap-2"
                          >
                            {ActionIcon && <ActionIcon className="h-4 w-4" />}
                            {action.label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              })()}
            </div>
          </div>
        </div>
        
        {/* Calculated Data Section */}
        {headerConfig?.calculatedData && headerConfig.calculatedData.length > 0 && (
          <>
            <Separator />
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {headerConfig.calculatedData.map((calc) => {
                  const CalcIcon = calc.icon
                  const value = calc.calculator(record)
                  
                  return (
                    <div key={calc.key} className="flex items-center space-x-3">
                      {CalcIcon && (
                        <div className="flex-shrink-0">
                          <CalcIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">{calc.label}</p>
                        <p className="text-sm font-semibold">{value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

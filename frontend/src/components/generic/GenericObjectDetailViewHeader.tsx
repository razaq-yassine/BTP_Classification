import { cn } from '@/lib/utils'
import { ObjectDefinition, GenericRecord } from '@/types/object-definition'
import { Button } from '@/components/ui/button'
import { getObjectAvatarClasses, getObjectButtonClasses } from '@/utils/object-color'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
    <Card className="mb-2 py-2 sm:py-4">
      <CardContent className="p-0">
        {/* Main Header - single row on all breakpoints: avatar, title, buttons */}
        <div className="px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-2 min-w-0">
            {/* Left side - Avatar/Icon and Name */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Avatar className="h-10 w-10 shrink-0 sm:h-16 sm:w-16">
                {imageUrl ? (
                  <AvatarImage src={imageUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className={getObjectAvatarClasses(objectDefinition.color)}>
                  {Icon && <Icon className="h-5 w-5 sm:h-8 sm:w-8" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold tracking-tight truncate sm:text-2xl">{displayName}</h1>
                <p className="text-xs text-muted-foreground truncate sm:text-base">{objectDefinition.label}</p>
              </div>
            </div>
            
            {/* Right side - On mobile/tablet: only ... dropdown. On lg+: primary buttons + ... dropdown */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Primary Actions - visible only on lg+ */}
              {headerConfig?.primaryActions?.filter((action) => {
                const actionKey = action.key
                if (actionKey === 'edit') return canUpdate(objectDefinition.name)
                return true
              }).map((action) => {
                const ActionIcon = action.icon
                const isPrimary = (action.variant || 'default') === 'default'
                return (
                  <Button
                    key={action.key}
                    variant={action.variant || 'default'}
                    size="sm"
                    onClick={() => action.onClick(record)}
                    className={cn("hidden lg:flex items-center gap-2", isPrimary && getObjectButtonClasses(objectDefinition.color))}
                  >
                    {ActionIcon && <ActionIcon className="h-4 w-4 shrink-0" />}
                    {action.label}
                  </Button>
                )
              })}
              
              {/* Actions Dropdown - on mobile/tablet: all actions. On lg+: secondary only */}
              {(() => {
                const filteredPrimary = (headerConfig?.primaryActions || []).filter((action) => {
                  const actionKey = action.key
                  if (actionKey === 'edit') return canUpdate(objectDefinition.name)
                  return true
                })
                const filteredSecondary = (headerConfig?.secondaryActions || []).filter((action) => {
                  const actionKey = action.key
                  if (actionKey === 'delete') return canDelete(objectDefinition.name)
                  if (actionKey === 'edit') return canUpdate(objectDefinition.name)
                  return true
                })
                const hasAnyActions = filteredPrimary.length > 0 || filteredSecondary.length > 0
                if (!hasAnyActions) return null
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 sm:h-9 sm:w-9">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Primary actions - shown only on mobile/tablet (hidden on lg+) */}
                      {filteredPrimary.map((action) => {
                        const ActionIcon = action.icon
                        return (
                          <DropdownMenuItem
                            key={action.key}
                            onClick={() => action.onClick(record)}
                            className="flex items-center gap-2 lg:hidden"
                          >
                            {ActionIcon && <ActionIcon className="h-4 w-4" />}
                            {action.label}
                          </DropdownMenuItem>
                        )
                      })}
                      {filteredPrimary.length > 0 && filteredSecondary.length > 0 && (
                        <DropdownMenuSeparator className="lg:hidden" />
                      )}
                      {/* Secondary actions - always in dropdown */}
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
            <div className="px-3 py-2 sm:px-6 sm:py-4">
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {headerConfig.calculatedData.map((calc) => {
                  const CalcIcon = calc.icon
                  const value = calc.calculator(record)
                  
                  return (
                    <div key={calc.key} className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {CalcIcon && (
                        <div className="flex-shrink-0">
                          <CalcIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">{calc.label}</p>
                        <p className="text-xs sm:text-sm font-semibold truncate">{value}</p>
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

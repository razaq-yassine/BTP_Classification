import { GenericRecord, StatisticsCardDefinition } from '@/types/object-definition'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatisticsCardsProps {
  statistics: StatisticsCardDefinition[]
  records: GenericRecord[]
}

function formatValue(value: string | number, format?: 'currency' | 'percentage' | 'number' | 'text'): string {
  const numValue = typeof value === 'number' ? value : parseFloat(value?.toString() || '0')
  
  if (format === 'currency') {
    return `$${numValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (format === 'percentage') {
    return `${(numValue * 100).toFixed(1)}%`
  }
  if (format === 'number') {
    return numValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
  return value?.toString() || '0'
}

export function StatisticsCards({ statistics, records }: StatisticsCardsProps) {
  if (!statistics || statistics.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-1.5 sm:gap-2 mb-4">
      {statistics.map((stat) => {
        const StatIcon = stat.icon
        const value = stat.calculator(records)
        const formattedValue = formatValue(value, stat.format)

        return (
          <Card key={stat.key} className="flex-1 min-w-0 py-2 gap-1 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-[10px] sm:text-xs font-medium truncate leading-tight">{stat.label}</CardTitle>
              {StatIcon && (
                <StatIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground shrink-0" />
              )}
            </CardHeader>
            <CardContent className="px-2 pb-2 pt-0">
              <div className="text-xs sm:text-sm md:text-base font-bold truncate leading-tight">{formattedValue}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

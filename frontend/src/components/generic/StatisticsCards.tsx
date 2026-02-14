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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {statistics.map((stat) => {
        const StatIcon = stat.icon
        const value = stat.calculator(records)
        const formattedValue = formatValue(value, stat.format)

        return (
          <Card key={stat.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              {StatIcon && (
                <StatIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formattedValue}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

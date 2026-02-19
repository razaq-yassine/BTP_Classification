import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { getTranslationCoverage } from '@/services/metadata-api'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BarChart3, Eye } from 'lucide-react'

const CHART_COLORS = {
  translated: '#22c55e', // emerald-500
  missing: '#f59e0b', // amber-500
  empty: '#ef4444', // red-500
} as const

export function TranslationCoverageDashboard() {
  const { t } = useTranslation('settings')
  const [modalLocale, setModalLocale] = useState<string | null>(null)
  const [showHardcodedModal, setShowHardcodedModal] = useState(false)
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['translation-coverage'],
    queryFn: getTranslationCoverage,
    enabled: false,
  })

  const translatedColor = CHART_COLORS.translated
  const missingColor = CHART_COLORS.missing
  const emptyColor = CHART_COLORS.empty

  const handleLoadReport = () => {
    void refetch()
  }

  if (!data && !isLoading && !isFetching) {
    return (
      <div className='rounded-lg border border-dashed p-8 text-center'>
        <p className='text-muted-foreground text-sm mb-4'>
          {t('coverageReportPrompt', {
            defaultValue: 'Generate a translation coverage report.',
          })}
        </p>
        <Button
          onClick={handleLoadReport}
          variant='outline'
          size='sm'
          disabled={isFetching}
        >
          <BarChart3 className='mr-2 h-4 w-4' />
          {t('coverageReportGenerate', { defaultValue: 'Generate report' })}
        </Button>
      </div>
    )
  }

  if (!data && (isLoading || isFetching)) {
    return (
      <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
        {t('loading')}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className='rounded-lg border border-dashed border-destructive/50 p-8 text-center'>
        <p className='text-destructive mb-4'>{t('translationsSaveFailed')}</p>
        <Button onClick={handleLoadReport} variant='outline' size='sm'>
          {t('coverageReportRetry', { defaultValue: 'Retry' })}
        </Button>
      </div>
    )
  }

  const { referenceLocale, locales, byLocale, hardcodedStrings = [] } = data

  if (locales.length === 0) {
    return (
      <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
        {t('noTranslationsLocalesFound')}
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h4 className='text-sm font-medium text-muted-foreground'>
            {t('coverageReportTitle', { defaultValue: 'Translation coverage' })}
          </h4>
          <p className='text-xs text-muted-foreground'>
            {t('coverageReportDesc', {
              defaultValue: 'Compared to reference locale',
            })}{' '}
            <span className='font-medium'>{referenceLocale}</span>
          </p>
        </div>
        <Button
          onClick={handleLoadReport}
          variant='outline'
          size='sm'
          disabled={isFetching}
        >
          <BarChart3 className='mr-2 h-4 w-4' />
          {t('coverageReportRefresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <div className='grid gap-4 grid-cols-1 sm:grid-cols-2'>
        {locales.map((locale) => {
          const loc = byLocale[locale]
          if (!loc) return null
          const { total, translated, missing, empty } = loc
          const pct =
            total > 0
              ? translated === total
                ? 100
                : Number(((translated / total) * 100).toFixed(1))
              : 100
          const pieData = [
            {
              name: t('coverageTranslated', { defaultValue: 'Translated' }),
              value: translated,
              color: translatedColor,
            },
            ...(missing > 0
              ? [
                  {
                    name: t('coverageMissing', { defaultValue: 'Missing' }),
                    value: missing,
                    color: missingColor,
                  },
                ]
              : []),
            ...(empty > 0
              ? [
                  {
                    name: t('coverageEmpty', { defaultValue: 'Empty' }),
                    value: empty,
                    color: emptyColor,
                  },
                ]
              : []),
          ].filter((d) => d.value > 0)

          return (
            <Card key={locale} className='overflow-hidden'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center justify-between text-base'>
                  <span className='uppercase tracking-wider'>{locale}</span>
                  <span
                    className={
                      pct === 100
                        ? 'text-emerald-600'
                        : pct >= 80
                          ? 'text-amber-600'
                          : 'text-rose-600'
                    }
                  >
                    {pct}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className='flex items-center gap-4'>
                <div className='h-32 w-32 shrink-0'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey='value'
                        nameKey='name'
                        cx='50%'
                        cy='50%'
                        innerRadius={28}
                        outerRadius={48}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke='transparent' />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, '']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className='min-w-0 flex-1 space-y-1 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>
                      {t('coverageTranslated', { defaultValue: 'Translated' })}
                    </span>
                    <span className='font-medium'>{translated}</span>
                  </div>
                  {missing > 0 && (
                    <div className='flex items-center justify-between gap-1'>
                      <span className='text-muted-foreground'>
                        {t('coverageMissing', { defaultValue: 'Missing' })}
                      </span>
                      <span className='flex items-center gap-1'>
                        <span className='font-medium text-amber-600'>
                          {missing}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                          onClick={() => setModalLocale(locale)}
                          title={t('coverageViewMissing', {
                            defaultValue: 'View missing translations',
                          })}
                        >
                          <Eye className='h-3.5 w-3.5' />
                        </Button>
                      </span>
                    </div>
                  )}
                  {empty > 0 && (
                    <div className='flex items-center justify-between gap-1'>
                      <span className='text-muted-foreground'>
                        {t('coverageEmpty', { defaultValue: 'Empty' })}
                      </span>
                      <span className='flex items-center gap-1'>
                        <span className='font-medium text-rose-600'>
                          {empty}
                        </span>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                          onClick={() => setModalLocale(locale)}
                          title={t('coverageViewEmpty', {
                            defaultValue: 'View empty translations',
                          })}
                        >
                          <Eye className='h-3.5 w-3.5' />
                        </Button>
                      </span>
                    </div>
                  )}
                  <div className='border-t pt-1 text-xs text-muted-foreground'>
                    {total} {t('coverageTotalKeys', { defaultValue: 'keys' })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {hardcodedStrings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm font-medium'>
              {t('coverageHardcoded', { defaultValue: 'Hardcoded strings' })}
            </CardTitle>
            <p className='text-xs text-muted-foreground'>
              {t('coverageHardcodedDesc', {
                defaultValue:
                  'Strings in source code not yet converted to translation keys',
              })}
            </p>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted-foreground'>
                {hardcodedStrings.length}{' '}
                {t('coverageHardcoded', { defaultValue: 'hardcoded strings' })}{' '}
                found in frontend source
              </span>
              <Button
                variant='ghost'
                size='icon'
                className='h-6 w-6 text-violet-600 hover:text-violet-700 hover:bg-violet-50'
                onClick={() => setShowHardcodedModal(true)}
                title={t('coverageViewHardcoded', {
                  defaultValue: 'View hardcoded strings',
                })}
              >
                <Eye className='h-3.5 w-3.5' />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className='text-sm font-medium'>
            {t('coverageByNamespace', { defaultValue: 'By namespace' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b'>
                  <th className='pb-2 pr-4 text-left font-medium'>
                    {t('namespace')}
                  </th>
                  {locales.map((l) => (
                    <th
                      key={l}
                      className='pb-2 px-2 text-right font-medium uppercase'
                    >
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['common', 'navigation', 'settings', 'errors', 'objects'].map(
                  (ns) => (
                    <tr key={ns} className='border-b last:border-0'>
                      <td className='py-2 pr-4 font-medium'>{ns}</td>
                      {locales.map((locale) => {
                        const nsData = byLocale[locale]?.byNamespace[ns]
                        if (!nsData) return <td key={locale} className='px-2' />
                        const pct =
                          nsData.total > 0
                            ? nsData.translated === nsData.total
                              ? 100
                              : Number(
                                  (
                                    (nsData.translated / nsData.total) *
                                    100
                                  ).toFixed(1)
                                )
                            : 100
                        return (
                          <td
                            key={locale}
                            className='px-2 py-2 text-right'
                          >
                            <span
                              className={
                                pct === 100
                                  ? 'text-emerald-600'
                                  : pct >= 80
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                              }
                            >
                              {nsData.translated}/{nsData.total} ({pct}%)
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showHardcodedModal}
        onOpenChange={(open) => !open && setShowHardcodedModal(false)}
      >
        <DialogContent className='max-h-[80vh] max-w-md sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {t('coverageHardcodedTitle', {
                defaultValue: 'Hardcoded strings',
              })}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-2 overflow-y-auto max-h-[60vh]'>
            <p className='text-sm text-muted-foreground'>
              {t('coverageHardcodedDesc', {
                defaultValue:
                  'Strings in source code not yet converted to translation keys',
              })}
            </p>
            <ul className='list-none space-y-2 text-sm'>
              {hardcodedStrings.map((item, i) => (
                <li
                  key={`${item.file}:${item.line}:${i}`}
                  className='rounded border bg-muted/30 p-2 font-mono text-xs'
                >
                  <span className='text-foreground block break-words'>
                    &quot;{item.str}&quot;
                  </span>
                  <span className='text-muted-foreground'>
                    {item.file}:{item.line}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={modalLocale !== null}
        onOpenChange={(open) => !open && setModalLocale(null)}
      >
        <DialogContent className='max-h-[80vh] max-w-md sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {t('coverageMissingTitle', {
                defaultValue: 'Missing & empty translations',
              })}{' '}
              — {modalLocale?.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {modalLocale && byLocale[modalLocale] && (
            <div className='space-y-4 overflow-y-auto max-h-[60vh]'>
              {((byLocale[modalLocale].missingKeys ?? []).length ?? 0) > 0 && (
                <div>
                  <h4 className='text-sm font-medium text-amber-600 mb-2'>
                    {t('coverageMissing', { defaultValue: 'Missing' })}
                  </h4>
                  <ul className='list-disc list-inside space-y-1 text-sm font-mono'>
                    {(byLocale[modalLocale].missingKeys ?? []).map((key) => (
                      <li key={key} className='break-all'>
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {((byLocale[modalLocale].emptyKeys ?? []).length ?? 0) > 0 && (
                <div>
                  <h4 className='text-sm font-medium text-rose-600 mb-2'>
                    {t('coverageEmpty', { defaultValue: 'Empty' })}
                  </h4>
                  <ul className='list-disc list-inside space-y-1 text-sm font-mono'>
                    {(byLocale[modalLocale].emptyKeys ?? []).map((key) => (
                      <li key={key} className='break-all'>
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

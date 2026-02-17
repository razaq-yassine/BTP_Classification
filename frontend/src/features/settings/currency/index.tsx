import { useState, useEffect } from 'react'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import api from '@/services/api'
import { toast } from 'sonner'
import { useAppConfigStore } from '@/stores/appConfigStore'

export function CurrencySettings() {
  const { config, fetchConfig, setConfig } = useAppConfigStore()
  const [currencySymbol, setCurrencySymbol] = useState(config.currencySymbol)
  const [defaultCurrency, setDefaultCurrency] = useState(config.defaultCurrency)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    setCurrencySymbol(config.currencySymbol)
    setDefaultCurrency(config.defaultCurrency)
  }, [config.currencySymbol, config.defaultCurrency])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/api/config/app-config', {
        defaultCurrency,
        currencySymbol,
      })
      setConfig({ defaultCurrency, currencySymbol })
      toast.success('Default currency updated')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Main>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Default Currency</h1>
          <p className="text-muted-foreground">
            Set the default currency symbol used when displaying currency fields across the application.
          </p>
        </div>

        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currencySymbol">Currency Symbol</Label>
            <Input
              id="currencySymbol"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="$"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Symbol shown before amounts (e.g. $, €, £, ¥)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultCurrency">Currency Code</Label>
            <Input
              id="defaultCurrency"
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              placeholder="USD"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              ISO code for reference (e.g. USD, EUR, GBP)
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Main>
  )
}

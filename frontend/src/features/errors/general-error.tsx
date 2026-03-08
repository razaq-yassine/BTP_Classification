import { useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

const DEV_ERROR_STORAGE_KEY = '__dev_last_server_error'

interface GeneralErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  minimal?: boolean
  error?: unknown
  info?: { componentStack?: string }
}

function serializeError(err: unknown): string {
  if (err == null) return ''
  if (typeof err === 'string') return err
  if (err instanceof Error) {
    return [
      err.name,
      err.message,
      err.stack,
      (err as { response?: { data?: unknown } }).response?.data != null
        ? '\nResponse: ' +
          JSON.stringify((err as { response: { data: unknown } }).response.data, null, 2)
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  try {
    return JSON.stringify(err, null, 2)
  } catch {
    return String(err)
  }
}

export default function GeneralError({
  className,
  minimal = false,
  error: errorProp,
  info,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const { history } = useRouter()
  const [storedError, setStoredError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    try {
      const raw = sessionStorage.getItem(DEV_ERROR_STORAGE_KEY)
      if (raw) setStoredError(raw)
    } catch {
      /* ignore */
    }
  }, [])

  const clearStoredError = useCallback(() => {
    try {
      sessionStorage.removeItem(DEV_ERROR_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setStoredError(null)
  }, [])

  const handleGoBack = useCallback(() => {
    clearStoredError()
    history.go(-1)
  }, [clearStoredError, history])

  const handleGoHome = useCallback(() => {
    clearStoredError()
    navigate({ to: '/' })
  }, [clearStoredError, navigate])

  const errorText = useMemo(() => {
    const parts: string[] = []
    if (errorProp != null) {
      parts.push(serializeError(errorProp))
      if (info?.componentStack) {
        parts.push('\n--- Component Stack ---\n' + info.componentStack)
      }
    }
    if (storedError) {
      parts.push(storedError)
    }
    return parts.filter(Boolean).join('\n\n')
  }, [errorProp, info, storedError])

  const showDevDetails = import.meta.env.DEV && errorText.trim().length > 0

  const handleCopy = useCallback(async () => {
    if (!errorText) return
    try {
      await navigator.clipboard.writeText(errorText)
      setCopied(true)
      toast.success('Error details copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [errorText])

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-2 px-4'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>Oops! Something went wrong {`:')`}</span>
        <p className='text-muted-foreground text-center'>
          We apologize for the inconvenience. <br /> Please try again later.
        </p>
        {showDevDetails && (
          <Card className='mt-4 w-full max-w-xl border-amber-500/50 bg-amber-500/5'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Error details (dev only)
              </CardTitle>
              <Button
                variant='outline'
                size='sm'
                onClick={handleCopy}
                className='shrink-0 gap-1.5'
              >
                {copied ? (
                  <Check className='h-4 w-4 text-green-600' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </CardHeader>
            <CardContent className='pt-0'>
              <ScrollArea className='h-48 rounded-md border bg-background/80 p-3 font-mono text-xs'>
                <pre className='whitespace-pre-wrap break-words'>
                  {errorText}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            <Button variant='outline' onClick={handleGoBack}>
              Go Back
            </Button>
            <Button onClick={handleGoHome}>Back to Home</Button>
          </div>
        )}
      </div>
    </div>
  )
}

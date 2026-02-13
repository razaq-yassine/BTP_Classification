import { AxiosError } from 'axios'
import { toast } from 'sonner'

export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof AxiosError)) return false
  if (err.response) return false // Has response = not a network error
  const code = (err as { code?: string }).code
  const msg = err.message ?? ''
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    msg.includes('Network Error') ||
    msg.includes('Failed to fetch')
  )
}

export function handleServerError(error: unknown) {
  // eslint-disable-next-line no-console
  if (import.meta.env.DEV) console.log(error)

  // Don't toast for network errors (backend restart, etc.) - avoids flooding the user
  if (isNetworkError(error)) return

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Content not found.'
  }

  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data as { title?: string; message?: string }
    errMsg = data.title ?? data.message ?? errMsg
  }

  toast.error(errMsg)
}

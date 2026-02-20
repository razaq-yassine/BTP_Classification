import { createFileRoute } from '@tanstack/react-router'
import SignUp2 from '@/features/auth/sign-up/sign-up-2'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: SignUp2,
  validateSearch: (search: Record<string, unknown>) => ({
    invite: typeof search.invite === 'string' ? search.invite : undefined,
  }),
})

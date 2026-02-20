import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthLayout from '../auth-layout'

/**
 * Legacy sign-up index - signup is now invite-only.
 * The route uses sign-up-2.tsx which handles invite validation.
 */
export default function SignUp() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Invite required
          </CardTitle>
          <CardDescription>
            Sign up is by invitation only. Please use the link from your invitation email, or contact your administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to='/login' search={{ message: undefined }} className='hover:text-primary underline underline-offset-4'>
            Go to login
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}

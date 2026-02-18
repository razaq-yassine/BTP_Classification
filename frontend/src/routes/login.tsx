import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuthStore, selectLogin, selectIsLoading, selectIsAuthenticated } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  beforeLoad: async () => {
    // Check authentication status first
    const { checkAuth, isAuthenticated } = useAuthStore.getState()

    // If already authenticated, redirect immediately
    if (isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }

    try {
      await checkAuth()
      // If checkAuth succeeds, user is authenticated
      const { isAuthenticated: updatedAuthStatus } = useAuthStore.getState()
      if (updatedAuthStatus) {
        throw redirect({ to: '/dashboard' })
      }
    } catch (error) {
      // If checkAuth fails or throws redirect, handle appropriately
      if (error && typeof error === 'object' && 'to' in error) {
        // This is a redirect, re-throw it
        throw error
      }
      // Otherwise, user is not authenticated, allow access to login
    }
  },
})

function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore(selectLogin)
  const isLoading = useAuthStore(selectIsLoading)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)

  const [username, setUsername] = useState('admin') // Pre-populate with default credentials
  const [password, setPassword] = useState('admin123') // Pre-populate with default credentials
  const [error, setError] = useState('')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' })
      return
    }
    // Set a small delay to prevent flash of content
    const timer = setTimeout(() => {
      setIsCheckingAuth(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [isAuthenticated, navigate])

  // Show loading while checking authentication
  if (isCheckingAuth || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await login(username, password)
    if (!result.success) {
      setError(result.error || 'Login failed')
    } else {
      // Navigate to dashboard on successful login
      navigate({ to: '/dashboard' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">Default Credentials:</p>
            <p className="text-sm text-blue-600">admin / admin123 (platform admin)</p>
            <p className="text-sm text-blue-600">acme-owner / acme123 (org owner, can edit org/tenant config)</p>
            <p className="text-sm text-blue-600">acme-org-user / acme123 (org user, all Acme tenants)</p>
            <p className="text-sm text-blue-600">acme-us-user / acme123 (tenant user, Acme US only)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

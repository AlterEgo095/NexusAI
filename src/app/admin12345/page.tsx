'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Fingerprint,
  Shield,
  ShieldCheck,
  KeyRound,
  Loader2,
  AlertTriangle,
  Smartphone,
  Monitor,
  ArrowLeft,
  LogOut,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Lazy-load the admin module (original admin panel)
const AdminModule = lazy(() => import('@/components/modules/admin-module'))

type AuthPhase = 'loading' | 'setup' | 'login' | 'authenticated'

interface WebAuthnStatus {
  hasCredentials: boolean
  credentialCount: number
}

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  const [phase, setPhase] = useState<AuthPhase>('loading')
  const [status, setStatus] = useState<WebAuthnStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Setup form state
  const [setupToken, setSetupToken] = useState('')
  const [setupUserId, setSetupUserId] = useState('')
  const [deviceName, setDeviceName] = useState('')

  // Credential management
  const [credentials, setCredentials] = useState<Array<{
    id: string
    credentialID: string
    deviceName: string | null
    transports: string | null
    createdAt: string
    lastUsed: string | null
  }> | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [credentialToDelete, setCredentialToDelete] = useState<string | null>(null)

  // Check WebAuthn status on mount
  useEffect(() => {
    checkStatus()
  }, [])

  // When session changes, update phase
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (session?.user && status?.hasCredentials) {
      setPhase('authenticated')
      fetchCredentials()
    } else if (status !== null) {
      setPhase(status.hasCredentials ? 'login' : 'setup')
    }
  }, [sessionStatus, session, status])

  // Check if browser supports WebAuthn
  const [webAuthnSupported, setWebAuthnSupported] = useState(true)
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PublicKeyCredential) {
      setWebAuthnSupported(false)
      setError('Your browser does not support WebAuthn/Passkeys. Please use a modern browser like Chrome, Safari, or Edge.')
    }
  }, [])

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/webauthn/status')
      const data = await res.json()
      setStatus(data)
    } catch (err: any) {
      setError(err.message || 'Failed to check WebAuthn status')
    }
  }

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/webauthn/credentials')
      const data = await res.json()
      if (data.success) setCredentials(data.credentials)
    } catch {
      // Silently fail
    }
  }

  const handleRegister = async () => {
    if (!setupToken || !setupUserId) {
      setError('Please provide both setup token and user ID')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      // Dynamically import browser-side WebAuthn
      const { startRegistration } = await import('@simplewebauthn/browser')

      // Step 1: Get registration options from server
      const beginRes = await fetch('/api/webauthn/register/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken, userId: setupUserId }),
      })
      const beginData = await beginRes.json()

      if (!beginData.success) {
        throw new Error(beginData.error || 'Registration initiation failed')
      }

      // Step 2: Use browser WebAuthn API
      const credential = await startRegistration({
        optionsJSON: beginData.options,
        useAutoAutofill: false,
      })

      // Attach device name for identification
      credential.deviceName = deviceName || 'Security Key'

      // Step 3: Verify with server
      const finishRes = await fetch('/api/webauthn/register/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          userId: setupUserId,
          rawChallenge: beginData.options.challenge,
        }),
      })
      const finishData = await finishRes.json()

      if (!finishData.success) {
        throw new Error(finishData.error || 'Registration verification failed')
      }

      // Registration complete — refresh status and redirect to login
      await checkStatus()
      setPhase('login')
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Registration was cancelled or timed out. Please try again.')
      } else {
        setError(err.message || 'Registration failed')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAuthenticate = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Dynamically import browser-side WebAuthn
      const { startAuthentication } = await import('@simplewebauthn/browser')

      // Step 1: Get authentication options from server
      const beginRes = await fetch('/api/webauthn/authenticate/begin', {
        method: 'POST',
      })
      const beginData = await beginRes.json()

      if (!beginData.success) {
        throw new Error(beginData.error || 'Authentication initiation failed')
      }

      // Step 2: Use browser WebAuthn API
      const credential = await startAuthentication({
        optionsJSON: beginData.options,
        useAutoAutofill: false,
      })

      // Step 3: Verify with server (sets session cookie on success)
      const finishRes = await fetch('/api/webauthn/authenticate/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          rawChallenge: beginData.options.challenge,
        }),
      })
      const finishData = await finishRes.json()

      if (!finishData.success) {
        throw new Error(finishData.error || 'Authentication failed')
      }

      // Force session refresh by reloading the page to pick up new cookie
      window.location.href = '/admin12345'
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Authentication was cancelled or timed out. Please try again.')
      } else {
        setError(err.message || 'Authentication failed')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddCredential = async () => {
    if (!session?.user?.id) return

    setIsProcessing(true)
    setError(null)

    try {
      const { startRegistration } = await import('@simplewebauthn/browser')

      const beginRes = await fetch('/api/webauthn/register/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const beginData = await beginRes.json()

      if (!beginData.success) {
        throw new Error(beginData.error || 'Failed to start registration')
      }

      const credential = await startRegistration({
        optionsJSON: beginData.options,
        useAutoAutofill: false,
      })

      credential.deviceName = deviceName || 'Security Key'

      const finishRes = await fetch('/api/webauthn/register/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          userId: session.user.id,
          rawChallenge: beginData.options.challenge,
        }),
      })
      const finishData = await finishRes.json()

      if (!finishData.success) {
        throw new Error(finishData.error || 'Failed to finish registration')
      }

      fetchCredentials()
      setDeviceName('')
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Registration was cancelled or timed out.')
      } else {
        setError(err.message || 'Failed to add credential')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteCredential = async () => {
    if (!credentialToDelete) return

    try {
      const res = await fetch('/api/webauthn/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId: credentialToDelete }),
      })
      const data = await res.json()

      if (data.success) {
        fetchCredentials()
        checkStatus()
      } else {
        setError(data.error || 'Failed to delete credential')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete credential')
    } finally {
      setDeleteDialogOpen(false)
      setCredentialToDelete(null)
    }
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    setPhase(status?.hasCredentials ? 'login' : 'setup')
    setCredentials(null)
  }

  // ─── Loading screen ───
  if (phase === 'loading' || sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Shield className="size-12 text-primary" />
          </motion.div>
          <Skeleton className="h-5 w-40" />
        </div>
      </div>
    )
  }

  // ─── Browser not supported ───
  if (!webAuthnSupported) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Browser Not Supported</CardTitle>
            <CardDescription>
              Your browser does not support WebAuthn/Passkeys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Please use a modern browser such as Chrome, Safari, Firefox, or Edge with WebAuthn support enabled.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 size-4" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Setup phase (no credentials yet) ───
  if (phase === 'setup') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg"
        >
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <Fingerprint className="size-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Admin Passkey Setup</CardTitle>
                <CardDescription className="mt-2">
                  Register a security key or passkey to enable admin access. This is a one-time setup.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="mx-auto">
                <Shield className="mr-1 size-3" />
                First-time configuration
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="setup-token" className="text-sm font-medium">
                  Setup Token
                </label>
                <Input
                  id="setup-token"
                  type="password"
                  placeholder="Enter your admin setup token"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  The ADMIN_SETUP_TOKEN from your environment variables.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="user-id" className="text-sm font-medium">
                  User ID
                </label>
                <Input
                  id="user-id"
                  placeholder="Enter the admin user ID (cuid)"
                  value={setupUserId}
                  onChange={(e) => setSetupUserId(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  The database user ID that will own this passkey.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="device-name" className="text-sm font-medium">
                  Device Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="device-name"
                  placeholder="e.g. YubiKey 5, MacBook Touch ID"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-lg bg-destructive/10 p-3"
                >
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleRegister}
                disabled={isProcessing || !setupToken || !setupUserId}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Waiting for security key...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 size-4" />
                    Register Passkey
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                A browser prompt will appear asking you to activate your security key.
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Login phase (credentials exist, need to authenticate) ───
  if (phase === 'login') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="size-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Admin Authentication</CardTitle>
                <CardDescription className="mt-2">
                  Use your registered passkey to authenticate.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-lg bg-destructive/10 p-3"
                >
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleAuthenticate}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Waiting for security key...
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 size-4" />
                    Authenticate with Passkey
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Insert or tap your security key when prompted by the browser.
              </p>
            </CardContent>
          </Card>

          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Authenticated: Show admin panel ───
  return (
    <div className="min-h-screen bg-background">
      {/* Admin header bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
        <div className="flex items-center gap-3">
          <Shield className="size-5 text-primary" />
          <span className="font-semibold text-lg">NexusAI Admin</span>
          <Badge variant="secondary" className="text-xs">
            {session?.user?.role || 'admin'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 size-4" />
            Back to App
          </Button>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 size-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-6">
        {/* Credential management section */}
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-5 text-primary" />
                  <CardTitle className="text-lg">Passkey Management</CardTitle>
                  {credentials && (
                    <Badge variant="secondary">{credentials.length} key{credentials.length !== 1 ? 's' : ''}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Device name (optional)"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="h-8 w-48 text-sm"
                  />
                  <Button size="sm" onClick={handleAddCredential} disabled={isProcessing}>
                    {isProcessing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="mr-1 size-3" />
                        Add Key
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {credentials && credentials.length > 0 ? (
                <div className="space-y-2">
                  {credentials.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                          {cred.transports?.includes('internal') ? (
                            <Smartphone className="size-5 text-primary" />
                          ) : (
                            <Monitor className="size-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{cred.deviceName || 'Unnamed Key'}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(cred.createdAt).toLocaleDateString()}
                            {cred.lastUsed && ` · Last used ${new Date(cred.lastUsed).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setCredentialToDelete(cred.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No passkeys registered.</p>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 rounded-lg bg-destructive/10 p-3"
                >
                  <p className="text-sm text-destructive">{error}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lazy-loaded admin panel */}
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary/60" />
                <p className="text-sm text-muted-foreground">Loading admin panel...</p>
              </div>
            </div>
          }
        >
          <AdminModule />
        </Suspense>
      </main>

      {/* Delete credential confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Passkey</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this passkey? You will no longer be able to authenticate with this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCredential}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useCallback, useMemo, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Loader2, Mail, Lock, User, Globe, ArrowRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/* ─── Types ─── */
interface AuthDialogsProps {
  loginOpen: boolean
  setLoginOpen: (open: boolean) => void
  registerOpen: boolean
  setRegisterOpen: (open: boolean) => void
  onSuccess?: () => void
}

/* ─── Language options ─── */
const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ar', label: 'العربية' },
  { value: 'zh', label: '中文' },
]

/* ─── Password strength utility ─── */
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
  bg: string
} {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Faible', color: 'bg-red-500', bg: 'bg-red-500/20' }
  if (score <= 3) return { score, label: 'Moyen', color: 'bg-amber-500', bg: 'bg-amber-500/20' }
  return { score: Math.min(score, 4), label: 'Fort', color: 'bg-emerald-500', bg: 'bg-emerald-500/20' }
}

/* ─── Fade-in animation variants ─── */
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const contentVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 28 },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: 0.15 },
  },
}

/* ─── Login Dialog ─── */
function LoginDialog({
  open,
  onOpenChange,
  onSwitchToRegister,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToRegister: () => void
  onSuccess?: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = useMemo(
    () => email.length > 0 && password.length >= 6,
    [email, password]
  )

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!isValid || loading) return

      setLoading(true)
      setError('')

      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError('Email ou mot de passe incorrect.')
          return
        }

        toast.success('Connexion réussie !', {
          description: 'Bienvenue sur NexusAI.',
        })
        onOpenChange(false)
        onSuccess?.()
      } catch {
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      } finally {
        setLoading(false)
      }
    },
    [email, password, isValid, loading, onOpenChange, onSuccess]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden bg-white/80 backdrop-blur-2xl border-white/20 rounded-xl">
        <AnimatePresence>
          {open && (
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="p-6 sm:p-8"
            >
              <DialogHeader className="mb-6 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Connexion
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">
                  Connectez-vous à votre compte NexusAI
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-white/60 border-white/30 backdrop-blur-sm focus-visible:ring-primary/30"
                      required
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-sm font-medium">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 bg-white/60 border-white/30 backdrop-blur-sm focus-visible:ring-primary/30"
                      required
                      minLength={6}
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-11 mt-2 font-medium"
                  disabled={!isValid || loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Connexion…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Se connecter
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Switch to register */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Pas de compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    setTimeout(() => onSwitchToRegister(), 150)
                  }}
                  className="font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                >
                  S&apos;inscrire
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Register Dialog ─── */
function RegisterDialog({
  open,
  onOpenChange,
  onSwitchToLogin,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToLogin: () => void
  onSuccess?: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [language, setLanguage] = useState('fr')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const passwordsMatch = useMemo(
    () => confirmPassword.length === 0 || password === confirmPassword,
    [password, confirmPassword]
  )

  const isValid = useMemo(
    () =>
      name.length >= 2 &&
      email.length > 0 &&
      password.length >= 6 &&
      password === confirmPassword,
    [name, email, password, confirmPassword]
  )

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!isValid || loading) return

      setLoading(true)
      setError('')

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password, language }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (res.status === 409) {
            setError('Un compte avec cet email existe déjà.')
          } else if (res.status === 400) {
            setError(data.error || 'Données invalides. Vérifiez vos informations.')
          } else {
            setError('Une erreur est survenue lors de l\'inscription.')
          }
          return
        }

        // Auto-login after successful registration
        const loginResult = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })

        if (loginResult?.error) {
          toast.success('Compte créé avec succès !', {
            description: 'Veuillez vous connecter.',
          })
          onOpenChange(false)
          onSwitchToLogin()
          return
        }

        toast.success('Bienvenue !', {
          description: 'Votre compte NexusAI a été créé.',
        })
        onOpenChange(false)
        onSuccess?.()
      } catch {
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
      } finally {
        setLoading(false)
      }
    },
    [name, email, password, language, isValid, loading, onOpenChange, onSwitchToLogin, onSuccess]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-white/80 backdrop-blur-2xl border-white/20 rounded-xl">
        <AnimatePresence>
          {open && (
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="p-6 sm:p-8"
            >
              <DialogHeader className="mb-6 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">
                  Inscription
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">
                  Créez votre compte NexusAI
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-sm font-medium">
                    Nom complet
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Jean Dupont"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-11 bg-white/60 border-white/30 backdrop-blur-sm focus-visible:ring-primary/30"
                      required
                      minLength={2}
                      autoComplete="name"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-sm font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-white/60 border-white/30 backdrop-blur-sm focus-visible:ring-primary/30"
                      required
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-sm font-medium">
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 bg-white/60 border-white/30 backdrop-blur-sm focus-visible:ring-primary/30"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  <AnimatePresence>
                    {password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5"
                      >
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                level <= passwordStrength.score
                                  ? passwordStrength.color
                                  : 'bg-muted'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Force : <span className="font-medium">{passwordStrength.label}</span>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="register-confirm-password" className="text-sm font-medium">
                    Confirmer le mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`pl-10 pr-10 h-11 bg-white/60 border-white/30 backdrop-blur-sm focus-visible:ring-primary/30 ${
                        !passwordsMatch ? 'border-red-300 focus-visible:ring-red-300/30' : ''
                      }`}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {!passwordsMatch && confirmPassword.length > 0 && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-red-500"
                      >
                        Les mots de passe ne correspondent pas.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Language selector */}
                <div className="space-y-2">
                  <Label htmlFor="register-language" className="text-sm font-medium">
                    Langue préférée
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                    <Select value={language} onValueChange={setLanguage} disabled={loading}>
                      <SelectTrigger className="pl-10 h-11 bg-white/60 border-white/30 backdrop-blur-sm">
                        <SelectValue placeholder="Sélectionner une langue" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-11 mt-2 font-medium"
                  disabled={!isValid || loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Création du compte…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Créer un compte
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Switch to login */}
              <div className="mt-6 text-center text-sm text-muted-foreground">
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    setTimeout(() => onSwitchToLogin(), 150)
                  }}
                  className="font-semibold text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                >
                  Se connecter
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main AuthDialogs Component ─── */
export function AuthDialogs({
  loginOpen,
  setLoginOpen,
  registerOpen,
  setRegisterOpen,
  onSuccess,
}: AuthDialogsProps) {
  const handleSwitchToRegister = useCallback(() => {
    setRegisterOpen(true)
  }, [setRegisterOpen])

  const handleSwitchToLogin = useCallback(() => {
    setLoginOpen(true)
  }, [setLoginOpen])

  return (
    <>
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSwitchToRegister={handleSwitchToRegister}
        onSuccess={onSuccess}
      />
      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onSwitchToLogin={handleSwitchToLogin}
        onSuccess={onSuccess}
      />
    </>
  )
}

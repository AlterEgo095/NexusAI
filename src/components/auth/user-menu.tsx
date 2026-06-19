'use client'

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSession, signOut } from 'next-auth/react'
import {
  User,
  LogOut,
  Settings,
  UserCircle,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/* ─── Types ─── */
interface UserMenuProps {
  onLoginClick?: () => void
  onNavigate?: (module: string) => void
}

/* ─── Avatar color utility ─── */
function getAvatarColor(name: string): string {
  const colors = [
    'bg-primary/15 text-primary',
    'bg-chart-2/15 text-chart-2',
    'bg-chart-3/15 text-chart-3',
    'bg-chart-4/15 text-chart-4',
    'bg-chart-5/15 text-chart-5',
    'bg-amber-500/15 text-amber-600',
    'bg-emerald-500/15 text-emerald-600',
    'bg-rose-500/15 text-rose-600',
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/* ─── Not Authenticated State ─── */
function LoginButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="gap-2 h-9 px-4 font-medium text-sm"
    >
      <User className="size-4" />
      <span className="hidden sm:inline">Se connecter</span>
    </Button>
  )
}

/* ─── Authenticated User Menu ─── */
function AuthenticatedMenu({
  userName,
  userImage,
  userRole,
  onNavigate,
}: {
  userName?: string | null
  userImage?: string | null
  userRole?: string
  onNavigate?: (module: string) => void
}) {
  const isAdmin = userRole === 'admin' || userRole === 'superadmin'

  const handleSignOut = useCallback(async () => {
    await signOut({ redirect: false })
    toast.success('Déconnexion réussie', {
      description: 'À bientôt sur NexusAI !',
    })
  }, [])

  const initials = useMemo(() => getInitials(userName || ''), [userName])
  const avatarColorClass = useMemo(() => getAvatarColor(userName || ''), [userName])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-200 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group"
          aria-label="Menu utilisateur"
        >
          <Avatar className="size-8 ring-2 ring-background shadow-sm">
            <AvatarImage src={userImage || undefined} alt={userName || 'Utilisateur'} />
            <AvatarFallback className={`text-xs font-bold ${avatarColorClass}`}>
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-tight text-foreground group-hover:text-foreground/90 transition-colors">
              {userName || 'Utilisateur'}
            </span>
            {userRole && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 font-medium mt-0.5"
              >
                {userRole}
              </Badge>
            )}
          </div>

          <ChevronDown className="hidden sm:block size-3.5 text-muted-foreground group-hover:text-foreground/70 transition-colors ml-1" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 bg-white/80 backdrop-blur-2xl border-white/20 rounded-xl p-1.5"
      >
        {/* User info header */}
        <DropdownMenuLabel className="px-2.5 py-2">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">{userName || 'Utilisateur'}</p>
            <div className="flex items-center gap-2">
              {userRole && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 font-medium"
                >
                  {userRole}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border/50" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => onNavigate?.('settings')}
            className="gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer focus:bg-accent/50"
          >
            <UserCircle className="size-4 text-muted-foreground" />
            <span className="text-sm">Mon profil</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onNavigate?.('settings')}
            className="gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer focus:bg-accent/50"
          >
            <Settings className="size-4 text-muted-foreground" />
            <span className="text-sm">Préférences</span>
          </DropdownMenuItem>

          {isAdmin && (
            <DropdownMenuItem
              onClick={() => window.location.href = '/admin12345'}
              className="gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer focus:bg-accent/50 text-amber-600 dark:text-amber-400"
            >
              <ShieldCheck className="size-4" />
              <span className="text-sm font-medium">Panneau Admin</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-border/50" />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 focus:text-red-700 dark:focus:text-red-300"
        >
          <LogOut className="size-4" />
          <span className="text-sm font-medium">Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ─── Main UserMenu Component ─── */
export function UserMenu({ onLoginClick, onNavigate }: UserMenuProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <div className="size-8 rounded-full bg-muted animate-pulse" />
        <div className="hidden sm:flex flex-col gap-1">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-2 w-12 rounded bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return <LoginButton onClick={onLoginClick} />
  }

  const user = session.user

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <AuthenticatedMenu
        userName={user.name}
        userImage={user.image}
        userRole={user.role}
        onNavigate={onNavigate}
      />
    </motion.div>
  )
}

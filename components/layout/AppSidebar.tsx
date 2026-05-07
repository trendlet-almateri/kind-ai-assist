'use client'

/**
 * components/layout/AppSidebar.tsx — Client Component
 *
 * WHY Client Component:
 * - Collapse state is local UI state (useState).
 * - usePathname() for active route detection needs the browser.
 * - Motion animations are client-only (Framer Motion).
 *
 * WHY we pass profile as a prop (not fetch inside):
 * - The profile was already fetched in the Server Component layout.
 * - Passing it as a prop avoids a duplicate DB call.
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Inbox, BookOpen, Users,
  Settings, ChevronLeft, LogOut, Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/features/auth/actions'
import type { AgentProfile } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard',     icon: LayoutDashboard, adminOnly: true  },
  { href: '/inbox',     label: 'Inbox',          icon: Inbox,           adminOnly: false },
  { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen,        adminOnly: false },
  { href: '/agents',    label: 'Agents',         icon: Users,           adminOnly: true  },
  { href: '/settings',  label: 'Settings',       icon: Settings,        adminOnly: true  },
]

// Agent-view pages use Geist Sans (calmer feel)
const AGENT_PAGES = ['/inbox', '/agents', '/knowledge']

interface AppSidebarProps {
  profile: AgentProfile
  aiEnabled: boolean
}

export function AppSidebar({ profile, aiEnabled }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const filteredNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || profile.role === 'admin'
  )

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border/50 bg-sidebar overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-border/50">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
              </div>
              <span className="font-heading text-base tracking-tight">SupportAI</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 px-3 pt-4 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'nav-item',
                isActive && 'nav-item-active',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* ── AI Status Badge ─────────────────────────────────────────── */}
      {!collapsed && (
        <div className="mx-3 mb-3">
          <div className={cn(
            'relative overflow-hidden rounded-xl px-3.5 py-3 transition-all duration-500',
            aiEnabled
              ? 'bg-gradient-to-r from-primary/[0.08] to-primary/[0.03] border border-primary/15'
              : 'bg-gradient-to-r from-destructive/[0.06] to-transparent border border-destructive/15'
          )}>
            <div className={cn(
              'absolute -top-3 -right-3 h-12 w-12 rounded-full blur-xl transition-colors duration-500',
              aiEnabled ? 'bg-primary/15' : 'bg-destructive/10'
            )} />
            <div className="relative flex items-center gap-2.5">
              <span className={cn(
                'flex h-2 w-2 shrink-0 rounded-full',
                aiEnabled
                  ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.6)] animate-pulse-glow'
                  : 'bg-destructive/70'
              )} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-[11px] font-bold leading-none',
                  aiEnabled ? 'text-primary' : 'text-destructive/80'
                )}>
                  {aiEnabled ? 'Bot Active' : 'Bot Inactive'}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1 leading-none">
                  {aiEnabled ? 'Auto-reply on' : 'Auto-reply paused'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── User Footer ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/50 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-heading text-sm text-primary">
            {profile.full_name?.charAt(0) ?? '?'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{profile.full_name}</p>
              <span className={cn(
                'badge-glow text-[10px] inline-block mt-0.5',
                profile.role === 'admin'
                  ? 'bg-warning/15 text-warning'
                  : 'bg-primary/15 text-primary'
              )}>
                {profile.role}
              </span>
            </div>
          )}
          {!collapsed && (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl p-1.5 transition-colors hover:bg-accent text-metadata hover:text-foreground"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

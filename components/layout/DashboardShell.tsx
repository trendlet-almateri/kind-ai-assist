'use client'

/**
 * components/layout/DashboardShell.tsx
 * Client wrapper that owns the sidebar collapsed state so the main
 * content area can adjust its left padding in sync.
 */

import { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import type { AgentProfile } from '@/types/database'

interface DashboardShellProps {
  profile:    AgentProfile
  aiEnabled:  boolean
  children:   React.ReactNode
}

export function DashboardShell({ profile, aiEnabled, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        profile={profile}
        aiEnabled={aiEnabled}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />

      {/* Main content — no padding on mobile, dynamic on lg+ based on sidebar width */}
      <main
        className={`flex-1 min-h-screen transition-[padding] duration-200 w-full ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        }`}
      >
        {children}
      </main>
    </div>
  )
}

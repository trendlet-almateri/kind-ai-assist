'use client'

export function LogoLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 animate-pulse">
        <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
      </div>
    </div>
  )
}

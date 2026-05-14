'use client'

import Image from 'next/image'

export function LogoLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Image
        src="/LogoLoaderNew.gif"
        alt="Loading"
        width={80}
        height={80}
        unoptimized
        priority
      />
    </div>
  )
}

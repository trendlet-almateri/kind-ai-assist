'use client'

export function LogoLoader() {
  return (
    <>
      <style>{`
        @keyframes figureEight {
          0%    { transform: translate(0px,   0px);   }
          12.5% { transform: translate(14px,  10px);  }
          25%   { transform: translate(20px,  0px);   }
          37.5% { transform: translate(14px, -10px);  }
          50%   { transform: translate(0px,   0px);   }
          62.5% { transform: translate(-14px, 10px);  }
          75%   { transform: translate(-20px, 0px);   }
          87.5% { transform: translate(-14px,-10px);  }
          100%  { transform: translate(0px,   0px);   }
        }
        .logo-figure-eight {
          animation: figureEight 1.8s ease-in-out infinite;
        }
      `}</style>
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="logo-figure-eight flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
          <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
        </div>
      </div>
    </>
  )
}

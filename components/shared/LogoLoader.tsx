'use client'

export function LogoLoader() {
  return (
    <>
      <style>{`
        @keyframes figureEight {
          0%      { transform: translate3d(  0.00px,   0.00px, 0); }
          6.25%   { transform: translate3d(  7.65px,   7.07px, 0); }
          12.5%   { transform: translate3d( 14.14px,  10.00px, 0); }
          18.75%  { transform: translate3d( 18.48px,   7.07px, 0); }
          25%     { transform: translate3d( 20.00px,   0.00px, 0); }
          31.25%  { transform: translate3d( 18.48px,  -7.07px, 0); }
          37.5%   { transform: translate3d( 14.14px, -10.00px, 0); }
          43.75%  { transform: translate3d(  7.65px,  -7.07px, 0); }
          50%     { transform: translate3d(  0.00px,   0.00px, 0); }
          56.25%  { transform: translate3d( -7.65px,   7.07px, 0); }
          62.5%   { transform: translate3d(-14.14px,  10.00px, 0); }
          68.75%  { transform: translate3d(-18.48px,   7.07px, 0); }
          75%     { transform: translate3d(-20.00px,   0.00px, 0); }
          81.25%  { transform: translate3d(-18.48px,  -7.07px, 0); }
          87.5%   { transform: translate3d(-14.14px, -10.00px, 0); }
          93.75%  { transform: translate3d( -7.65px,  -7.07px, 0); }
          100%    { transform: translate3d(  0.00px,   0.00px, 0); }
        }
        .logo-figure-eight {
          will-change: transform;
          animation: figureEight 0.75s linear infinite;
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

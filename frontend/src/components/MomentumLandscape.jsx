export default function MomentumLandscape({ period }) {
  return (
    <div className={`wt-momentum-landscape wt-momentum-landscape--${period}`} aria-hidden="true">
      <svg viewBox="0 0 600 240" preserveAspectRatio="xMidYMax slice">
        <circle className="landscape-glow" cx="465" cy="70" r="60" />
        <circle className="landscape-sun" cx="465" cy="70" r="35" />
        {period === 'night' && <circle cx="480" cy="58" r="30" fill="var(--landscape-sky)" />}
        <g fill="white" opacity=".6">
          <path d="M315 68a13 13 0 0 1 25-4 10 10 0 0 1 14 10h-49a10 10 0 0 1 10-6ZM490 112a10 10 0 0 1 19-4 9 9 0 0 1 13 9h-40a8 8 0 0 1 8-5Z" />
          {period === 'night' && <path d="m370 30 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm165 9 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" />}
        </g>
        <path d="m80 240 140-102 90 52 135-95 155 105v40Z" fill="var(--landscape-far)" />
        <path d="m220 138 26 37-27-13-20 17Zm225-43 38 48-33-16-28 12Z" fill="white" opacity=".45" />
        <path d="m170 240 163-81 75 38 107-62 85 61v44Z" fill="var(--landscape-near)" />
        <g fill="var(--landscape-tree)" opacity=".6">
          {[420, 455, 500, 540, 570, 595].map((x, i) => <path key={x} transform={`translate(${x} ${190 - i * 10}) scale(${.5 + i * .15})`} d="m0-48-12 26h7l-15 26h12l-16 24h20v15h8V28h20L8 4h12L5-22h7Z" />)}
        </g>
      </svg>
    </div>
  )
}

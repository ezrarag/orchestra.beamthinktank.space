'use client'

interface ProgressDotsProps {
  total: number
  current: number
  onSelect: (index: number) => void
}

export default function ProgressDots({ total, current, onSelect }: ProgressDotsProps) {
  return (
    <div className="flex items-center gap-2" aria-label="Slide progress">
      {Array.from({ length: total }).map((_, index) => {
        const active = index === current
        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={active}
            className={`h-2 rounded-full transition-all ${active ? 'w-8 bg-white' : 'w-2 bg-white/45 hover:bg-white/70'}`}
          />
        )
      })}
    </div>
  )
}

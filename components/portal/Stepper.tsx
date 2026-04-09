'use client'

interface StepperProps {
  current: number
}

const STEPS = [
  { n: 1, label: 'Perfil' },
  { n: 2, label: 'Sección' },
  { n: 3, label: 'Contenido' },
  { n: 4, label: 'Revisión' },
]

export default function Stepper({ current }: StepperProps) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-steps">
        {STEPS.map((s) => {
          const status = current > s.n ? 'done' : current === s.n ? 'active' : ''
          return (
            <div key={s.n} className={`ps ${status}`} data-step={s.n}>
              <div className="ps-num">
                {current > s.n ? '✓' : s.n}
              </div>
              <div className="ps-label">{s.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

interface StepperProps {
  current: number // 2=Sección, 3=Contenido, 4=Revisión (step 1 removed)
}

const STEPS = [
  { n: 2, label: 'Sección',   display: 1 },
  { n: 3, label: 'Contenido', display: 2 },
  { n: 4, label: 'Revisión',  display: 3 },
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
                {current > s.n ? '✓' : s.display}
              </div>
              <div className="ps-label">{s.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

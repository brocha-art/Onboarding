import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Brocha · Portal de Artistas',
  description: 'Portal de onboarding para artistas latinoamericanos en Brocha',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app">{children}</div>
      </body>
    </html>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL     = 'Brocha <notificaciones@brocha.art>'

export async function POST(req: NextRequest) {
  try {
    const { artistId } = await req.json()
    if (!artistId) {
      return NextResponse.json({ error: 'Missing artistId' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(artistId)
    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    const { data: artist } = await supabase
      .from('artists')
      .select('name')
      .eq('id', artistId)
      .maybeSingle()

    const artistName = artist?.name || 'Artista'
    const html = getApprovalHtml(artistName)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   user.email,
        subject: '¡Tu contenido fue aprobado en Brocha! 🎉',
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Resend error:', err)
      return NextResponse.json({ error: err }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-approval error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function getApprovalHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>¡Tu contenido fue aprobado!</title>
  <style>
    body,table,td{margin:0;padding:0;}
    @media only screen and (max-width:600px){
      .wrapper-td{padding:16px 12px!important;}
      .card-body{padding:28px 20px 24px!important;}
      .heading{font-size:20px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0e0728;font-family:'Montserrat',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0728;">
    <tr><td align="center" class="wrapper-td" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:linear-gradient(135deg,#1a0d3d,#0e0728);border:1px solid rgba(116,84,232,0.35);border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#7454e8,#fff56e);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="card-body" style="padding:40px 36px 36px;">
          <div style="text-align:center;margin-bottom:28px;">
            <span style="font-size:30px;font-weight:900;color:#fff56e;letter-spacing:-1px;">brocha</span><span style="font-size:30px;font-weight:900;color:#7454e8;">.</span>
          </div>
          <div style="text-align:center;margin-bottom:20px;"><span style="font-size:48px;">🎉</span></div>
          <h1 class="heading" style="margin:0 0 10px;font-size:22px;font-weight:900;color:#ffffff;text-align:center;">¡Contenido aprobado!</h1>
          <p style="margin:0 0 28px;font-size:13px;color:rgba(255,255,255,0.55);text-align:center;line-height:1.7;">
            Hola ${escapeHtml(name)}, ¡buenas noticias! El equipo Brocha revisó tu contenido y quedó aprobado. Ya puedes publicarlo desde tu vitrina.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="https://www.brocha.art/vitrina" style="display:inline-block;background:#fff56e;color:#0e0728;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:13px;font-weight:900;letter-spacing:0.5px;">
              Ir a mi vitrina →
            </a>
          </div>
          <div style="background:rgba(116,84,232,0.08);border:1px solid rgba(116,84,232,0.25);border-radius:14px;padding:18px;margin-bottom:24px;">
            <div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:2;">
              1 · Entra a tu vitrina<br/>
              2 · Revisa tu contenido aprobado<br/>
              3 · Haz clic en <strong style="color:#fff56e;">Publicar</strong> para que quede visible
            </div>
          </div>
          <div style="border-top:1px solid rgba(116,84,232,0.2);margin-bottom:20px;"></div>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);text-align:center;line-height:1.7;">
            Este correo es una notificación automática.<br/>Nadie del equipo Brocha te pedirá contraseñas.
          </p>
        </td></tr>
        <tr><td style="background:rgba(0,0,0,0.2);padding:16px 36px;text-align:center;border-top:1px solid rgba(116,84,232,0.15);">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.22);">© 2025 Brocha · Plataforma para artistas latinoamericanos</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

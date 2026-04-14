import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL     = 'Brocha <notificaciones@brocha.art>'

export async function POST(req: NextRequest) {
  try {
    const { artistId, rejectionReason } = await req.json()
    if (!artistId || !rejectionReason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get artist email via admin API
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(artistId)
    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    // Get artist name
    const { data: artist } = await supabase
      .from('artists')
      .select('name')
      .eq('id', artistId)
      .maybeSingle()

    const artistName = artist?.name || 'Artista'

    const html = getRejectionHtml(artistName, rejectionReason)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to:   user.email,
        subject: 'Actualización sobre tu contenido en Brocha',
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
    console.error('send-rejection error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function getRejectionHtml(name: string, reason: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Actualización sobre tu contenido en Brocha</title>
  <style>
    body,table,td{margin:0;padding:0;}
    @media only screen and (max-width:600px){
      .wrapper-td{padding:16px 12px!important;}
      .card-body{padding:28px 20px 24px!important;}
      .card-footer{padding:14px 20px!important;}
      .heading{font-size:19px!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0e0728;font-family:'Montserrat',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0e0728;">
    <tr><td align="center" class="wrapper-td" style="padding:40px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:linear-gradient(135deg,#1a0d3d,#0e0728);border:1px solid rgba(116,84,232,0.35);border-radius:20px;overflow:hidden;">
        <tr><td style="background:linear-gradient(90deg,#ff6b6b,#7454e8);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="card-body" style="padding:40px 36px 36px;">
          <div style="text-align:center;margin-bottom:28px;">
            <span style="font-size:30px;font-weight:900;color:#fff56e;letter-spacing:-1px;">brocha</span><span style="font-size:30px;font-weight:900;color:#7454e8;">.</span>
          </div>
          <div style="text-align:center;margin-bottom:20px;"><span style="font-size:44px;">📋</span></div>
          <h1 class="heading" style="margin:0 0 10px;font-size:20px;font-weight:800;color:#ffffff;text-align:center;">Revisamos tu contenido</h1>
          <p style="margin:0 0 24px;font-size:13px;color:rgba(255,255,255,0.55);text-align:center;line-height:1.6;">
            Hola ${escapeHtml(name)}, el equipo Brocha revisó el contenido que enviaste y en esta ocasión no pudo ser aprobado.
          </p>
          <div style="background:rgba(255,107,107,0.08);border:1px solid rgba(255,107,107,0.3);border-radius:14px;padding:20px 18px;margin-bottom:24px;">
            <div style="font-size:10px;font-weight:700;color:rgba(255,107,107,0.8);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Motivo</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.7;">${escapeHtml(reason)}</div>
          </div>
          <div style="text-align:center;margin-bottom:28px;">
            <p style="font-size:13px;color:rgba(255,255,255,0.55);line-height:1.7;margin:0 0 18px;">
              Si tienes dudas o quieres conocer los pasos para republicar tu obra, escríbenos directamente.
            </p>
            <a href="mailto:hola@brocha.art" style="display:inline-block;background:#7454e8;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:13px;font-weight:700;letter-spacing:0.5px;">
              Contactar al equipo →
            </a>
          </div>
          <div style="border-top:1px solid rgba(116,84,232,0.2);margin-bottom:20px;"></div>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3);text-align:center;line-height:1.7;">
            Este correo es una notificación automática.<br/>Nadie del equipo Brocha te pedirá contraseñas.
          </p>
        </td></tr>
        <tr><td class="card-footer" style="background:rgba(0,0,0,0.2);padding:16px 36px;text-align:center;border-top:1px solid rgba(116,84,232,0.15);">
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

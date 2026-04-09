/**
 * Brocha — HLS Transcoding Edge Function
 *
 * Flow:
 *   1. Triggered via HTTP POST with { sessionId, videoPath } or { studioId, videoPath, type: 'promo' }
 *   2. Downloads the raw video from Supabase Storage (raw-videos or session-videos bucket)
 *   3. Transcodes to HLS using ffmpeg (via shell) — Supabase Edge Functions run on Deno/Linux
 *   4. Uploads the .m3u8 playlist + .ts segments to the hls-videos bucket
 *   5. Updates the sessions.hls_url (or studios.promo_hls_url) in the DB
 *
 * Deploy:
 *   supabase functions deploy transcode-hls --no-verify-jwt
 *
 * Invoke example:
 *   POST https://<project>.supabase.co/functions/v1/transcode-hls
 *   Authorization: Bearer <service_role_key>
 *   { "sessionId": "uuid", "videoPath": "sessions/module-id/timestamp-abc.mp4" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Admin client — bypasses RLS for DB updates + private bucket access
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const HLS_BUCKET = 'hls-videos'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

async function runCommand(cmd: string[]): Promise<{ success: boolean; stderr: string }> {
  const process = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stderr: 'piped',
    stdout: 'piped',
  })
  const { code, stderr } = await process.output()
  return {
    success: code === 0,
    stderr: new TextDecoder().decode(stderr),
  }
}

async function downloadToTemp(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) throw new Error(`Download failed: ${error?.message}`)

  const tmpPath = `/tmp/${Date.now()}-input.mp4`
  await Deno.writeFile(tmpPath, new Uint8Array(await data.arrayBuffer()))
  return tmpPath
}

async function uploadHLSFiles(
  hlsDir: string,
  outputPrefix: string
): Promise<string> {
  const files = []
  for await (const entry of Deno.readDir(hlsDir)) {
    files.push(entry.name)
  }

  // Upload all .ts segments and the .m3u8 playlist
  for (const fileName of files) {
    const filePath = `${hlsDir}/${fileName}`
    const content = await Deno.readFile(filePath)
    const contentType = fileName.endsWith('.m3u8')
      ? 'application/x-mpegURL'
      : 'video/MP2T'

    const { error } = await supabase.storage
      .from(HLS_BUCKET)
      .upload(`${outputPrefix}/${fileName}`, content, {
        contentType,
        upsert: true,
      })
    if (error) throw new Error(`Upload ${fileName} failed: ${error.message}`)
  }

  // Return public URL of the .m3u8 playlist
  const { data } = supabase.storage
    .from(HLS_BUCKET)
    .getPublicUrl(`${outputPrefix}/playlist.m3u8`)

  return data.publicUrl
}

// ----------------------------------------------------------------
// Main handler
// ----------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: {
    sessionId?: string
    studioId?: string
    videoPath: string
    type?: 'session' | 'promo'
    sourceBucket?: string
  }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { sessionId, studioId, videoPath, type = 'session', sourceBucket } = body

  if (!videoPath) {
    return new Response(JSON.stringify({ error: 'videoPath is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const bucket = sourceBucket ?? (type === 'promo' ? 'studio-videos' : 'session-videos')
  const outputPrefix = type === 'promo'
    ? `promo/${studioId}`
    : `session/${sessionId}`

  try {
    // 1. Mark as processing
    if (sessionId) {
      await supabase.from('sessions').update({ hls_status: 'processing' }).eq('id', sessionId)
    }

    // 2. Download raw video to /tmp
    const inputPath = await downloadToTemp(bucket, videoPath)
    const hlsDir = `/tmp/hls-${Date.now()}`
    await Deno.mkdir(hlsDir, { recursive: true })

    // 3. Transcode with FFmpeg
    // Creates: playlist.m3u8 + segment000.ts, segment001.ts, ...
    const ffmpegArgs = [
      'ffmpeg', '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-start_number', '0',
      '-hls_time', '6',          // 6-second segments
      '-hls_list_size', '0',     // include all segments in playlist
      '-hls_segment_filename', `${hlsDir}/segment%03d.ts`,
      '-f', 'hls',
      `${hlsDir}/playlist.m3u8`,
    ]

    const { success, stderr } = await runCommand(ffmpegArgs)

    if (!success) {
      throw new Error(`FFmpeg failed: ${stderr.slice(-500)}`)
    }

    // 4. Upload .m3u8 + segments to hls-videos bucket
    const hlsUrl = await uploadHLSFiles(hlsDir, outputPrefix)

    // 5. Update DB with HLS URL
    if (sessionId) {
      await supabase
        .from('sessions')
        .update({ hls_url: hlsUrl, hls_status: 'ready' })
        .eq('id', sessionId)
    } else if (studioId) {
      await supabase
        .from('studios')
        .update({ promo_hls_url: hlsUrl })
        .eq('id', studioId)
    }

    // 6. Cleanup temp files
    await Deno.remove(inputPath).catch(() => {})
    await Deno.remove(hlsDir, { recursive: true }).catch(() => {})

    return new Response(
      JSON.stringify({ success: true, hlsUrl }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Transcoding error:', message)

    // Mark session as error
    if (sessionId) {
      await supabase.from('sessions').update({ hls_status: 'error' }).eq('id', sessionId)
    }

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

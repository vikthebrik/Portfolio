#!/usr/bin/env node
/**
 * Turn a full-res video into the site's preview-loop assets and upload them —
 * the drone pillar's one-way ramp (see CLAUDE.md "Media strategy"). The full
 * video is NEVER uploaded: it belongs on YouTube. This script cuts a short,
 * silent, downscaled loop plus a poster frame, pushes both to Vercel Blob at
 * deterministic paths, and prints a ready-to-paste <VideoPreview> snippet.
 *
 * Usage:
 *   npm run video:preview -- <video-file> --youtube <url-or-id>
 *     [--start 1] [--duration 5] [--width 480] [--prefix drone]
 *
 * ffmpeg comes from the ffmpeg-static devDependency (falls back to PATH).
 * Auth: BLOB_READ_WRITE_TOKEN, from the environment or .env — same as
 * scripts/upload-media.mjs.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** Same minimal .env parse as upload-media.mjs (kept local — importing that
 *  module would execute its CLI main()). */
async function loadToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN
  for (const file of ['../.env', '../.env.local']) {
    try {
      const env = await readFile(new URL(file, import.meta.url), 'utf8')
      const line = env.split('\n').find((l) => l.startsWith('BLOB_READ_WRITE_TOKEN='))
      if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
    } catch {
      /* file absent — try the next one */
    }
  }
  return null
}

async function ffmpegPath() {
  try {
    const mod = await import('ffmpeg-static')
    if (mod.default) return mod.default
  } catch {
    /* dep missing — hope for a system ffmpeg */
  }
  return 'ffmpeg'
}

/** Pull "1920x1080" out of ffmpeg's stream info (ffprobe isn't bundled). */
async function probeDimensions(ffmpeg, file) {
  try {
    await run(ffmpeg, ['-hide_banner', '-i', file])
  } catch (err) {
    // ffmpeg exits non-zero with no output file; the stream info is on stderr.
    const m = /Video:.*?\s(\d{2,5})x(\d{2,5})/.exec(err.stderr ?? '')
    if (m) return { w: Number(m[1]), h: Number(m[2]) }
  }
  return null
}

/** Accept a full YouTube URL in any of its shapes, or a bare video id. */
function youtubeId(input) {
  const m =
    /(?:youtu\.be\/|watch\?v=|shorts\/|embed\/|live\/)([\w-]{6,})/.exec(input) ??
    /^([\w-]{6,})$/.exec(input)
  if (!m) {
    console.error(`Could not parse a YouTube id from "${input}"`)
    process.exit(1)
  }
  return m[1]
}

function flag(args, name, fallback) {
  const i = args.indexOf(name)
  return i >= 0 ? args.splice(i, 2)[1] : fallback
}

async function main() {
  const args = process.argv.slice(2)
  const youtube = flag(args, '--youtube', null)
  const start = Number(flag(args, '--start', '1'))
  const duration = Number(flag(args, '--duration', '5'))
  const width = Number(flag(args, '--width', '480'))
  const prefix = flag(args, '--prefix', 'drone')
  const input = args[0]

  if (!input || !youtube) {
    console.error(
      'usage: npm run video:preview -- <video-file> --youtube <url-or-id>\n' +
        '         [--start 1] [--duration 5] [--width 480] [--prefix drone]'
    )
    process.exit(1)
  }

  const token = await loadToken()
  if (!token) {
    console.error('Missing BLOB_READ_WRITE_TOKEN (see scripts/upload-media.mjs).')
    process.exit(1)
  }

  const ffmpeg = await ffmpegPath()
  const id = youtubeId(youtube)
  const base = path
    .basename(input, path.extname(input))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const out = await mkdtemp(path.join(tmpdir(), 'video-preview-'))
  const previewFile = path.join(out, `${base}-preview.mp4`)
  const posterFile = path.join(out, `${base}-poster.jpg`)

  const dims = await probeDimensions(ffmpeg, input)
  const ratio = dims
    ? `${width}/${Math.round((dims.h * (width / dims.w)) / 2) * 2}`
    : '16/9'

  console.log(`Cutting ${duration}s preview @ ${width}px from ${input}…`)
  // Silent, low-bitrate H.264 loop — small enough to live on Blob like an image.
  await run(ffmpeg, [
    '-y', '-ss', String(start), '-t', String(duration), '-i', input,
    '-vf', `scale=${width}:-2:flags=lanczos,fps=24`,
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    previewFile,
  ])
  await run(ffmpeg, [
    '-y', '-ss', String(start), '-i', input,
    '-frames:v', '1', '-vf', `scale=${width * 2}:-2`, '-q:v', '3',
    posterFile,
  ])

  const { put } = await import('@vercel/blob')
  const urls = {}
  for (const [kind, file] of [['preview', previewFile], ['poster', posterFile]]) {
    const buf = await readFile(file)
    const blob = await put(
      ['portfolio', prefix, path.basename(file)].filter(Boolean).join('/'),
      buf,
      { access: 'public', token, addRandomSuffix: false, allowOverwrite: true }
    )
    urls[kind] = blob.url
    console.log(`✓ ${kind} (${(buf.length / 1024).toFixed(0)} KB) → ${blob.url}`)
  }

  console.log(`\nReady to paste:\n
<VideoPreview
  preview="${urls.preview}"
  poster="${urls.poster}"
  youtubeId="${id}"
  title="…"
  ratio="${ratio}"
  caption="…"
/>`)
}

main().catch((err) => {
  console.error(err.stderr ?? err.message ?? err)
  process.exit(1)
})

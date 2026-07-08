#!/usr/bin/env node
/**
 * Upload local media to Vercel Blob and print the public URLs plus ready-to-paste
 * MDX snippets. Media never enters the repo (see CLAUDE.md "Media strategy") —
 * this script is the one-way ramp: local file → Blob URL → frontmatter/MDX.
 *
 * Usage:
 *   npm run media:upload -- <file-or-dir> [...more] [--prefix <folder>]
 *
 * Files land at portfolio/<prefix>/<filename> in the store. Re-uploading the
 * same path overwrites, so the URL for a given file is stable.
 *
 * Auth: BLOB_READ_WRITE_TOKEN, from the environment or .env
 * (Vercel dashboard → Storage → your Blob store → "Read-Write token").
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.pdf'])

/** Minimal .env parse — only to find the Blob token; no dependency on dotenv. */
async function loadToken() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN
  try {
    const env = await readFile(new URL('../.env', import.meta.url), 'utf8')
    const line = env.split('\n').find((l) => l.startsWith('BLOB_READ_WRITE_TOKEN='))
    if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
  } catch {
    /* no .env — fall through to the error below */
  }
  return null
}

/** Recursively collect media files from the CLI args. */
async function collect(paths) {
  const files = []
  for (const p of paths) {
    const s = await stat(p)
    if (s.isDirectory()) {
      const entries = await readdir(p)
      files.push(...(await collect(entries.map((e) => path.join(p, e)))))
    } else if (EXTENSIONS.has(path.extname(p).toLowerCase())) {
      files.push(p)
    }
  }
  return files
}

/**
 * Sniff pixel dimensions from PNG/JPEG headers so the printed <Figure> snippet
 * carries the true aspect ratio (avoids letterboxing). Other formats: skipped.
 */
function dimensions(buf, ext) {
  if (ext === '.png' && buf.length > 24 && buf.readUInt32BE(12) === 0x49484452) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    let i = 2
    while (i + 9 < buf.length && buf[i] === 0xff) {
      const marker = buf[i + 1]
      const len = buf.readUInt16BE(i + 2)
      // SOF0–SOF15 (minus DHT/JPG/DAC) carry the frame size
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) }
      }
      i += 2 + len
    }
  }
  return null
}

function snippet(url, dims, ext) {
  if (ext === '.pdf') {
    return `  → export a preview image of page 1, then:\n    <Figure src="<preview-url>" alt="…" href="${url}" caption="…" />`
  }
  const ratio = dims ? ` ratio="${dims.w}/${dims.h}"` : ''
  return `    <Figure src="${url}" alt="…"${ratio} caption="…" />`
}

async function main() {
  const args = process.argv.slice(2)
  const prefixIdx = args.indexOf('--prefix')
  const prefix = prefixIdx >= 0 ? args.splice(prefixIdx, 2)[1] : ''
  if (args.length === 0) {
    console.error('usage: npm run media:upload -- <file-or-dir> [...more] [--prefix <folder>]')
    process.exit(1)
  }

  const token = await loadToken()
  if (!token) {
    console.error(
      'Missing BLOB_READ_WRITE_TOKEN. Create a Blob store in the Vercel dashboard\n' +
        '(Storage → Create → Blob), copy its Read-Write token, and add\n' +
        'BLOB_READ_WRITE_TOKEN=... to .env (gitignored).'
    )
    process.exit(1)
  }

  const { put } = await import('@vercel/blob')
  const files = await collect(args)
  if (files.length === 0) {
    console.error(`No media files found (looked for: ${[...EXTENSIONS].join(' ')})`)
    process.exit(1)
  }

  console.log(`Uploading ${files.length} file(s)…\n`)
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    const buf = await readFile(file)
    const key = ['portfolio', prefix, path.basename(file)].filter(Boolean).join('/')
    const blob = await put(key, buf, {
      access: 'public',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    console.log(`✓ ${file} (${(buf.length / 1024).toFixed(0)} KB)`)
    console.log(`  ${blob.url}`)
    console.log(snippet(blob.url, dimensions(buf, ext), ext))
    console.log()
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})

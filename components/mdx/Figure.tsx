import Image from 'next/image'

/**
 * A captioned image frame for case-study bodies — the building block for
 * image-forward (design) projects. `src` is an external URL (Vercel Blob etc.,
 * per CLAUDE.md media strategy); the host must be in next.config remotePatterns.
 *
 * `ratio` is the frame's aspect ratio ("w/h"). Pass the image's true ratio
 * (the upload script prints it) to avoid letterboxing — the image is
 * object-contain, never cropped, so an off ratio letterboxes on `surface`
 * rather than cutting the work.
 *
 * `href` renders a "view full ↗" link in the caption — the pattern for PDFs:
 * show a preview image, link the full document.
 */
export function Figure({
  src,
  alt,
  caption,
  ratio = '16/10',
  href,
}: {
  src: string
  alt: string
  caption?: string
  ratio?: string
  href?: string
}) {
  return (
    <figure className="mt-6">
      <div
        className="relative w-full overflow-hidden border border-line bg-surface"
        style={{ aspectRatio: ratio }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 672px"
          className="object-contain"
        />
      </div>
      {caption || href ? (
        <figcaption className="mt-2 text-xs leading-5 text-faint">
          {caption}
          {href ? (
            <>
              {caption ? ' ' : null}
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                className="text-clay underline underline-offset-2"
              >
                view full ↗
              </a>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  )
}

import * as runtime from 'react/jsx-runtime'
import type { ComponentType } from 'react'
import { Figure } from '@/components/mdx/Figure'
import { Gallery } from '@/components/mdx/Gallery'

/**
 * Renders a Velite-compiled MDX `body` (the function-source string emitted by
 * `s.mdx()`) into React. Server-compatible — no 'use client' — so case studies
 * render in the RSC page. The components map styles the prose for the warm-analog
 * look (tokens only, no hardcoded hex).
 */

const useMDXComponent = (code: string): ComponentType<{ components?: Record<string, ComponentType> }> => {
  const fn = new Function(code)
  return fn({ ...runtime }).default
}

const components: Record<string, ComponentType<Record<string, unknown>>> = {
  h1: (props) => <h1 className="mt-10 text-xl tracking-wide text-ink" {...props} />,
  h2: (props) => (
    <h2 className="mt-10 text-lg tracking-wide text-ink" {...props} />
  ),
  h3: (props) => <h3 className="mt-8 text-base text-ink" {...props} />,
  p: (props) => <p className="mt-4 leading-7 text-muted" {...props} />,
  ul: (props) => (
    <ul className="mt-4 list-disc space-y-1 pl-5 text-muted" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-4 list-decimal space-y-1 pl-5 text-muted" {...props} />
  ),
  li: (props) => <li className="leading-7" {...props} />,
  a: (props) => (
    <a className="text-clay underline underline-offset-2" {...props} />
  ),
  code: (props) => (
    <code className="bg-surface px-1 py-0.5 text-[0.85em] text-ink" {...props} />
  ),
  pre: (props) => (
    <pre
      className="mt-4 overflow-x-auto border border-line bg-surface p-4 text-sm text-ink"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="mt-4 border-l-2 border-line pl-4 italic text-faint"
      {...props}
    />
  ),
  // Media components for image-forward case studies (external URLs only).
  Figure: Figure as ComponentType<Record<string, unknown>>,
  Gallery: Gallery as ComponentType<Record<string, unknown>>,
}

export function MDXContent({ code }: { code: string }) {
  const Component = useMDXComponent(code)
  return <Component components={components} />
}

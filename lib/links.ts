/**
 * Identity + contact links — the single source of truth, used by /about, the
 * sidebar footer, and the terminal's `contact` command. Structural (like the
 * category hubs): defined in code, not content. The resume lives on Vercel Blob
 * at a stable path — re-uploading `--prefix resume` replaces it, same URL.
 */

export const IDENTITY = {
  name: 'Vikram Thirumaran',
  role: 'CS + Data Science @ University of Oregon (class of 2027)',
  email: 'vikramthirumaran@gmail.com',
}

export const LINKS = [
  { label: 'github', href: 'https://github.com/vikthebrik' },
  {
    label: 'linkedin',
    href: 'https://www.linkedin.com/in/vikram-thirumaran-412aa82a6/',
  },
  {
    label: 'resume',
    href: 'https://5b2ygyxs1w5e09rf.public.blob.vercel-storage.com/portfolio/resume/vikram-thirumaran-resume.pdf',
  },
  { label: 'email', href: 'mailto:vikramthirumaran@gmail.com' },
  // The drone pillar's live feed until that work lands in the graph.
  { label: 'drone reel', href: 'https://www.instagram.com/viewsbyvik/' },
] as const

/**
 * Identity + contact links — the single source of truth, used by /about, the
 * sidebar footer, and the terminal's `contact` command. Structural (like the
 * category hubs): defined in code, not content. The resume lives on Vercel Blob
 * at a stable path — re-uploading `--prefix resume` replaces it, same URL.
 */

export const IDENTITY = {
  name: 'Vikram Thirumaran',
  role: 'CS + Data Science @ University of Oregon (class of 2027), minors in Math and Cognitive Science',
  // Short form for tight surfaces: the sidebar identity header + the launch intro.
  tagline: 'cs + data science @ oregon — tech · design · drone · research',
  // The launch screen's two-line introduction (shown above "click to launch").
  intro:
    'CS + Data Science at the University of Oregon, class of 2027. I build software and ML studies, design for campus communities, and fly drones — and every piece of it links into one web.',
  email: 'vikramthirumaran@gmail.com',
}

// Selected coursework — each of these has a public repo on the GitHub above.
export const COURSEWORK = [
  { code: 'CS 313', title: 'Intermediate Data Structures' },
  { code: 'CS 315', title: 'Intermediate Algorithms' },
  { code: 'CS 330', title: 'C/C++ & Unix' },
  { code: 'CS 415', title: 'Operating Systems' },
  { code: 'CS 422', title: 'Software Methodology' },
  { code: 'CS 471', title: 'Intro to Artificial Intelligence' },
  { code: 'DSCI 311', title: 'Principles & Techniques of Data Science' },
  { code: 'DSCI 345M', title: 'Probability & Statistics for Data Science' },
  { code: 'DSCI 372M', title: 'Machine Learning for Data Science' },
] as const

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

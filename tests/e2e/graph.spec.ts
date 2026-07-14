import { test, expect } from '@playwright/test'

// The structural skeleton is defined in lib/graph.ts: root + 4 hubs + how-it-works.
const HUBS = ['tech', 'design', 'drone', 'research']

test.describe('the graph', () => {
  test('renders the full web — root, hubs, and project nodes', async ({ page }) => {
    await page.goto('/')
    const graph = page.getByRole('img', { name: /graph of projects/i })
    await expect(graph).toBeVisible()

    await expect(graph.locator('[data-node][aria-label="vikram thirumaran"]')).toBeVisible()
    for (const hub of HUBS) {
      await expect(graph.locator(`[data-node][aria-label="${hub}"]`)).toBeVisible()
    }
    // Structural nodes (6) plus at least one project per populated hub.
    const count = await graph.locator('[data-node]').count()
    expect(count).toBeGreaterThanOrEqual(8)
    // Projects are visible at rest (the intro-less path shows the settled web).
    const project = graph.locator('[data-node][aria-label="MCC Scheduler"]')
    await expect(project).not.toHaveCSS('opacity', '0')
  })

  test('clicking a hub re-roots the web and syncs the URL', async ({ page }) => {
    await page.goto('/')
    await page.locator('[data-node][aria-label="design"]').click()
    await expect(page).toHaveURL(/\?focus=design/)

    // Back/forward traverse the re-root history (History API, no remount).
    await page.goBack()
    await expect(page).not.toHaveURL(/focus=/)
  })

  test('arrow keys walk the edges; Enter activates', async ({ page }) => {
    await page.goto('/')
    await page.locator('[data-node][aria-label="vikram thirumaran"]').focus()
    await page.keyboard.press('ArrowRight')

    // Focus moved to one of root's direct neighbors (a hub or how-it-works).
    const focused = page.locator('[data-node]:focus')
    await expect(focused).toHaveAttribute(
       'aria-label',
       /^(tech|design|drone|research|about)$/
    )

    // Enter = click: a hub re-roots (?focus=), how-it-works routes to /about.
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/(\?focus=|\/about)/)
  })

  test('clicking the centered project opens its case study', async ({ page }) => {
    await page.goto('/?focus=mcc-scheduler')
    await page.locator('[data-node][aria-label="MCC Scheduler"]').click()
    await expect(page).toHaveURL(/\/work\/mcc-scheduler/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('MCC Scheduler')
  })
})

test.describe('the sidebar', () => {
  test('search filters the tree to matches', async ({ page }) => {
    await page.goto('/')
    const tree = page.getByRole('navigation', { name: 'Project tree' })
    await tree.getByRole('button', { name: 'Expand tech' }).click()
    await expect(tree.getByRole('link', { name: 'MCC Scheduler' })).toBeVisible()

    await page.getByRole('searchbox', { name: 'Search projects' }).fill('knight')
    await expect(tree.getByRole('link', { name: /knight/i })).toBeVisible()
    await expect(tree.getByRole('link', { name: 'MCC Scheduler' })).toBeHidden()
  })

  test('shows the contact footer', async ({ page }) => {
    await page.goto('/')
    for (const label of ['github', 'linkedin', 'resume', 'email']) {
      await expect(page.locator('aside').getByRole('link', { name: label })).toBeVisible()
    }
  })

  test('identity header + skill chips (chips drive the shared query)', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toContainText('vikram thirumaran')

    const tree = page.getByRole('navigation', { name: 'Project tree' })
    await page.locator('aside').getByRole('button', { name: '#python' }).click()
    await expect(page.getByRole('searchbox', { name: 'Search projects' })).toHaveValue('python')
    await expect(tree.getByRole('link', { name: /knight/i })).toBeVisible()
    await expect(tree.getByRole('link', { name: 'MCC Scheduler' })).toBeHidden()

    // Clicking the active chip clears the filter.
    await page.locator('aside').getByRole('button', { name: '#python' }).click()
    await tree.getByRole('button', { name: 'Expand tech' }).click()
    await expect(tree.getByRole('link', { name: 'MCC Scheduler' })).toBeVisible()
  })
})

test.describe('the terminal', () => {
  test('opens from the tab and answers `contact`', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /open terminal/i }).click()
    const term = page.getByRole('region', { name: 'Portfolio terminal' })
    await expect(term).toBeVisible()

    await term.getByRole('textbox').fill('contact')
    await term.getByRole('textbox').press('Enter')
    await expect(term).toContainText('github.com/vikthebrik')
  })
})

test.describe('the command palette', () => {
  test('⌘K opens it; typing + Enter jumps to a case study', async ({ page }) => {
    await page.goto('/')
    const palette = page.getByRole('dialog', { name: 'Command palette' })
    await expect(async () => {
      await page.keyboard.press('ControlOrMeta+k')
      await expect(palette).toBeVisible({ timeout: 1000 })
    }).toPass()

    await palette.getByRole('textbox').fill('knight')
    await palette.getByRole('textbox').press('Enter')
    await expect(page).toHaveURL(/\/work\/knights-tour/)
  })

  test('works from a detail page and re-roots via deep link', async ({ page }) => {
    await page.goto('/work/mcc-scheduler')
    const palette = page.getByRole('dialog', { name: 'Command palette' })
    // Re-press until the palette answers — the first ⌘K can race hydration.
    await expect(async () => {
      await page.keyboard.press('ControlOrMeta+k')
      await expect(palette).toBeVisible({ timeout: 1000 })
    }).toPass()
    await palette.getByRole('textbox').fill('design')
    await palette.getByRole('option').filter({ hasText: 're-root the web' }).first().click()
    await expect(page).toHaveURL(/\/\?focus=design/)
  })
})

test.describe('pages', () => {
  test('/about carries the identity block', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByText('Vikram Thirumaran').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'resume' })).toBeVisible()
  })

  test('detail pages carry dedicated back + home buttons', async ({ page }) => {
    // `back` uses real history when there is any.
    await page.goto('/about')
    await page.goto('/work/mcc-scheduler')
    const nav = page.getByRole('navigation', { name: 'Page navigation' })
    await nav.getByRole('button', { name: '‹ back' }).click()
    await expect(page).toHaveURL(/\/about$/)

    // `home` always returns to the overview.
    await page
      .getByRole('navigation', { name: 'Page navigation' })
      .getByRole('link', { name: '⌂ home' })
      .click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('a case study renders content and the minimap', async ({ page }) => {
    await page.goto('/work/mcc-scheduler')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('MCC Scheduler')
    await expect(page.getByText('Architecture')).toBeVisible()
  })

  test('OG cards render', async ({ request }) => {
    for (const path of ['/opengraph-image', '/work/mcc-scheduler/opengraph-image']) {
      const res = await request.get(path)
      expect(res.status()).toBe(200)
      expect(res.headers()['content-type']).toContain('image/png')
    }
  })
})

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('collapses to the sidebar list — no force graph', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('img', { name: /graph of projects/i })).toBeHidden()
    const tree = page.getByRole('navigation', { name: 'Project tree' })
    await tree.getByRole('button', { name: 'Expand tech' }).click()
    await expect(
      tree.getByRole('link', { name: 'MCC Scheduler' })
    ).toBeVisible()
  })
})

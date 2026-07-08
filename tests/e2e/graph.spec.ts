import { test, expect } from '@playwright/test'

// The structural skeleton is defined in lib/graph.ts: root + 4 hubs + how-it-works.
const HUBS = ['tech', 'design', 'drone', 'research']

test.describe('the graph', () => {
  test('renders the full web — root, hubs, and project nodes', async ({ page }) => {
    await page.goto('/')
    const graph = page.getByRole('img', { name: /graph of projects/i })
    await expect(graph).toBeVisible()

    await expect(graph.locator('[data-node][aria-label="portfolio"]')).toBeVisible()
    for (const hub of HUBS) {
      await expect(graph.locator(`[data-node][aria-label="${hub}"]`)).toBeVisible()
    }
    // Structural nodes (6) plus at least one project per populated hub.
    const count = await graph.locator('[data-node]').count()
    expect(count).toBeGreaterThanOrEqual(8)
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
    await page.locator('[data-node][aria-label="portfolio"]').focus()
    await page.keyboard.press('ArrowRight')

    // Focus moved to one of root's direct neighbors (a hub or how-it-works).
    const focused = page.locator('[data-node]:focus')
    await expect(focused).toHaveAttribute(
      'aria-label',
      /^(tech|design|drone|research|how it works)$/
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
    await page.keyboard.press('ControlOrMeta+k')
    const palette = page.getByRole('dialog', { name: 'Command palette' })
    await expect(palette).toBeVisible()

    await palette.getByRole('textbox').fill('knight')
    await palette.getByRole('textbox').press('Enter')
    await expect(page).toHaveURL(/\/work\/knights-tour/)
  })

  test('works from a detail page and re-roots via deep link', async ({ page }) => {
    await page.goto('/work/mcc-scheduler')
    await page.keyboard.press('ControlOrMeta+k')
    const palette = page.getByRole('dialog', { name: 'Command palette' })
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
    await expect(
      page.getByRole('navigation', { name: 'Project tree' }).getByRole('link', { name: 'MCC Scheduler' })
    ).toBeVisible()
  })
})

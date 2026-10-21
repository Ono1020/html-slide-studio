/** @vitest-environment jsdom */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import {
  buildSlidePreview,
  cleanSlideMarkup,
  exportHtmlDeck,
  parseHtmlDeck,
} from './htmlSlides'

describe('parseHtmlDeck', () => {
  it('detects top-level sections and derives slide titles', () => {
    const deck = parseHtmlDeck(
      '<!doctype html><html><head><title>Deck</title></head><body><main><section><h1>First slide</h1><section><p>Nested</p></section></section><section><h2>Second slide</h2></section></main></body></html>',
      'talk.html',
    )

    expect(deck.usesSections).toBe(true)
    expect(deck.slides).toHaveLength(2)
    expect(deck.slides.map((slide) => slide.title)).toEqual(['First slide', 'Second slide'])
    expect(deck.slides[0].html).toContain('<section><p>Nested</p></section>')
  })

  it('treats a document without sections as one slide', () => {
    const deck = parseHtmlDeck('<html><body><h1>One page</h1><p>Text</p></body></html>', 'one.html')

    expect(deck.usesSections).toBe(false)
    expect(deck.slides).toHaveLength(1)
    expect(deck.slides[0].title).toBe('One page')
    expect(() => parseHtmlDeck('  ', 'empty.html')).toThrow('empty')
  })
})

describe('exportHtmlDeck', () => {
  it('replaces slide sections while preserving the document head and surrounding body', () => {
    const source = '<!doctype html><html lang="en"><head><title>Original</title><style>.deck{color:red}</style><script>window.deckReady = true</script></head><body><p>Intro</p><main><section><h1>Old title</h1></section><section><p>Old second</p></section></main><footer>End</footer></body></html>'
    const deck = parseHtmlDeck(source, 'source.html')
    deck.slides[0] = { ...deck.slides[0], html: '<section class="edited"><h1>New title</h1></section>' }
    deck.slides[1] = { ...deck.slides[1], html: '<section><p>New second</p></section>' }

    const exported = new DOMParser().parseFromString(exportHtmlDeck(deck), 'text/html')

    expect(exported.title).toBe('Original')
    expect(exported.head.querySelector('style')?.textContent).toContain('.deck{color:red}')
    expect(exported.head.querySelector('script')?.textContent).toContain('deckReady')
    expect(exported.body.querySelector('p')?.textContent).toBe('Intro')
    expect(Array.from(exported.querySelectorAll('main > section')).map((section) => section.textContent)).toEqual([
      'New title',
      'New second',
    ])
    expect(exported.querySelector('footer')?.textContent).toBe('End')
  })

  it('exports a single body slide without editor-only markup', () => {
    const deck = parseHtmlDeck('<!doctype html><html><head><title>Fallback</title></head><body><h1>Before</h1></body></html>', 'fallback.html')
    deck.slides[0] = { ...deck.slides[0], html: '<h1>After</h1><p>Edited</p>' }

    const exported = exportHtmlDeck(deck)
    const parsed = new DOMParser().parseFromString(exported, 'text/html')

    expect(exported).toMatch(/^<!DOCTYPE html>/)
    expect(parsed.title).toBe('Fallback')
    expect(parsed.body.textContent).toContain('After')
    expect(parsed.body.querySelector('[data-hss-editor-slide]')).toBeNull()
  })
})

describe('slide preview', () => {
  it('renders the edited active slide and injects the isolated edit bridge', () => {
    const deck = parseHtmlDeck('<html><head><title>Deck</title></head><body><section><h1>First</h1></section><section><h1>Second</h1></section></body></html>', 'deck.html')
    deck.slides[1] = { ...deck.slides[1], html: '<section><h1>Updated</h1></section>' }

    const preview = buildSlidePreview(deck, 1, 'test-token')
    const parsed = new DOMParser().parseFromString(preview, 'text/html')

    expect(parsed.querySelector('section[data-hss-editor-slide="test-token"] h1')?.textContent).toBe('Updated')
    expect(parsed.body.querySelectorAll('section[style*="display: none"]').length).toBe(1)
    expect(parsed.body.querySelector('section[data-hss-editor-slide="test-token"]')?.getAttribute('style'))
      .toContain('display: flex')
    expect(parsed.querySelector('script[data-hss-editor-runtime="test-token"]')?.textContent).toContain('slide-update')
    expect(parsed.head.firstElementChild?.getAttribute('data-hss-editor-runtime')).toBe('test-token')
    expect(cleanSlideMarkup('<section data-hss-editor-slide="test-token"><h1>Clean</h1></section>', 'test-token'))
      .toBe('<section><h1>Clean</h1></section>')
  })

  it('makes nested slide text editable and intercepts key handlers before source scripts', async () => {
    const deck = parseHtmlDeck(
      '<html><body><section><div class="copy">Before <strong>nested</strong></div><p>Paragraph</p></section><script>document.addEventListener("keydown", () => document.body.dataset.deckNavigation = "handled");</script></body></html>',
      'deck.html',
    )
    const messages: Array<{ type: string; html?: string }> = []
    const dom = new JSDOM(buildSlidePreview(deck, 0, 'test-token'), {
      runScripts: 'dangerously',
      beforeParse(window) {
        Object.defineProperty(window, 'parent', {
          configurable: true,
          value: { postMessage: (message: { type: string; html?: string }) => messages.push(message) },
        })
      },
    })
    if (dom.window.document.readyState === 'loading') {
      await new Promise<void>((resolve) => {
        dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
      })
    }
    const copy = dom.window.document.querySelector('.copy')!
    const strong = dom.window.document.querySelector('strong')!
    const paragraph = dom.window.document.querySelector('p')!
    expect(copy.getAttribute('contenteditable')).toBe('true')
    expect(strong.hasAttribute('contenteditable')).toBe(false)
    expect(paragraph.getAttribute('contenteditable')).toBe('true')

    const keydown = new dom.window.KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    })
    copy.dispatchEvent(keydown)

    expect(dom.window.document.body.dataset.deckNavigation).toBeUndefined()
    expect(keydown.defaultPrevented).toBe(false)

    copy.textContent = 'After'
    copy.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    const update = messages.findLast((message) => message.type === 'slide-update')
    expect(update?.html).toContain('After')
    expect(update?.html).not.toContain('contenteditable')
    expect(update?.html).not.toContain('data-hss-editor-slide')
    expect(update?.html).not.toContain('data-hss-editor-text')
    dom.window.close()
  })

  it('relays embedded previous and next controls through the editor navigation bridge', () => {
    const deck = parseHtmlDeck(
      '<html><body><div id="deck"><section class="slide"><h1>One</h1><div class="pageno">1 / 2</div></section><section class="slide"><h1>Two</h1><div class="pageno">2 / 2</div></section></div><div class="cnt">1 / 2</div><button id="prev">Previous</button><button id="next">Next</button><script>document.getElementById("next").onclick = () => document.body.dataset.internalIndex = "1";</script></body></html>',
      'deck.html',
    )
    const messages: Array<{ type: string; delta?: number }> = []
    const dom = new JSDOM(buildSlidePreview(deck, 0, 'test-token'), {
      runScripts: 'dangerously',
      beforeParse(window) {
        Object.defineProperty(window, 'parent', {
          configurable: true,
          value: { postMessage: (message: { type: string; delta?: number }) => messages.push(message) },
        })
      },
    })

    dom.window.document.getElementById('next')!.click()

    expect(messages.find((message) => message.type === 'navigate')?.delta).toBe(1)
    expect(dom.window.document.body.dataset.internalIndex).toBeUndefined()
    expect(dom.window.document.querySelector('.cnt')?.textContent).toBe('1 / 2')
    expect(dom.window.document.querySelector('.pageno')?.textContent).toBe('1 / 2')

    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    }))
    expect(messages.findLast((message) => message.type === 'navigate')?.delta).toBe(-1)
    dom.window.close()
  })

  it('synchronizes embedded page counters to the slide selected in the editor', async () => {
    const deck = parseHtmlDeck(
      '<html><body><div id="deck"><section class="slide"><h1>One</h1><div class="pageno">1 / 2</div></section><section class="slide"><h1>Two</h1><div class="pageno">2 / 2</div></section></div><div class="cnt">1 / 2</div></body></html>',
      'deck.html',
    )
    const dom = new JSDOM(buildSlidePreview(deck, 1, 'test-token'), { runScripts: 'dangerously' })
    if (dom.window.document.readyState === 'loading') {
      await new Promise<void>((resolve) => {
        dom.window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
      })
    }

    expect(Array.from(dom.window.document.querySelectorAll('.cnt, #cnt, .pageno'))
      .map((counter) => counter.textContent))
      .toEqual(['2 / 2', '2 / 2', '2 / 2'])
    dom.window.close()
  })
})

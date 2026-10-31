import assert from 'node:assert/strict'
import { test } from 'node:test'
import { JSDOM } from 'jsdom'
import { activeHeadingIndex, findHeadingElement, revealEntry, revealTurnStart } from '../src/client/heading-dom.ts'
import type { TocEntry } from '../src/client/outline.ts'

function entry(depth: number, text: string, occurrence = 0): TocEntry {
  return { depth, text, occurrence }
}

// One transcript shape: a visible row pair for turn 3, a reasoning row whose
// headings must never match, a hidden (folded) row, and another turn's rows.
function freshDom(): JSDOM {
  return new JSDOM(`
    <div id="chat">
      <div data-chat-turn="2"><h2>Other turn</h2></div>
      <div data-chat-turn="3">
        <h2>Plan</h2>
        <div data-variant="think"><h2>Plan</h2><h3>Hidden reasoning</h3></div>
        <h3>Steps</h3>
        <h2>Plan</h2>
      </div>
      <div data-chat-turn="3" hidden><h3>Folded heading</h3></div>
      <div data-chat-turn="3"><h3>Result</h3></div>
    </div>
  `)
}

test('finds headings by level and text within one turn', () => {
  const dom = freshDom()
  const found = findHeadingElement(dom.window.document, 3, entry(3, 'Steps'))
  assert.equal(found?.textContent, 'Steps')
})

test('occurrence ordinals disambiguate duplicate headings', () => {
  const dom = freshDom()
  const document = dom.window.document
  const first = findHeadingElement(document, 3, entry(2, 'Plan', 0))
  const second = findHeadingElement(document, 3, entry(2, 'Plan', 1))
  const third = findHeadingElement(document, 3, entry(2, 'Plan', 2))
  const visible = [...document.querySelectorAll<HTMLElement>('[data-chat-turn="3"]:not([hidden]) h2')]
    .filter(heading => heading.closest('[data-variant="think"]') === null)
  assert.equal(first, visible[0])
  assert.equal(second, visible[1])
  assert.equal(third, null) // only two visible: the think-row copy never counts
})

test('never matches headings inside reasoning rows or hidden rows', () => {
  const dom = freshDom()
  const document = dom.window.document
  assert.equal(findHeadingElement(document, 3, entry(3, 'Hidden reasoning')), null)
  assert.equal(findHeadingElement(document, 3, entry(3, 'Folded heading')), null)
  assert.equal(findHeadingElement(document, 3, entry(2, 'Other turn')), null)
})

test('revealEntry scrolls to the heading, then falls back to the turn opening row', () => {
  const dom = freshDom()
  const window = dom.window
  const scrolled: HTMLElement[] = []
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView(this: HTMLElement): void {
    scrolled.push(this)
  }
  const landed = revealEntry(window.document, 3, entry(3, 'Steps'))
  assert.equal(landed, 'heading')
  assert.equal(scrolled[0]?.textContent, 'Steps')

  const fallback = revealEntry(window.document, 3, entry(3, 'Folded heading'))
  assert.equal(fallback, 'turn')
  assert.equal(scrolled[1]?.querySelector('h2')?.textContent, 'Plan')

  assert.equal(revealEntry(window.document, 9, entry(1, 'Missing')), 'none')
  assert.equal(scrolled.length, 2)
})

test('activeHeadingIndex picks the last heading at or above the reading line', () => {
  const dom = freshDom()
  const document = dom.window.document
  const entries = [entry(2, 'Plan', 0), entry(3, 'Steps', 0), entry(3, 'Result', 0)]
  const elements = entries.map(item => findHeadingElement(document, 3, item)!)
  const tops = [80, 220, 460]
  elements.forEach((el, idx) => {
    el.getBoundingClientRect = () => ({ top: tops[idx]! } as DOMRect)
  })
  assert.equal(activeHeadingIndex(document, 3, entries, 250), 1)
  assert.equal(activeHeadingIndex(document, 3, entries, 50), 0)
  assert.equal(activeHeadingIndex(document, 3, [], 250), -1)
})

test('revealTurnStart scrolls to the turn opening row', () => {
  const dom = freshDom()
  const window = dom.window
  const scrolled: HTMLElement[] = []
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView(this: HTMLElement): void {
    scrolled.push(this)
  }
  assert.equal(revealTurnStart(window.document, 3), true)
  assert.equal(scrolled[0]?.getAttribute('data-chat-turn'), '3')
  assert.equal(revealTurnStart(window.document, 99), false)
})

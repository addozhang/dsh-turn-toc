/**
 * Click-time DOM resolution and scroll-spy helpers for outline entries onto
 * the rendered transcript: the chat rows of one Turn are addressed through
 * their `data-chat-turn` attributes, reasoning rows are excluded by their
 * `data-variant="think"` marker, and hidden (folded) rows are never targets.
 * @module dsh-turn-toc/src/client/heading-dom
 */
import { foldWhitespace, type TocEntry } from './outline.ts'

/**
 * Fraction of the visible reading band where jumped headings land and where
 * the scroll spy evaluates the active Turn / Heading (aligned with the upper
 * reading zone beside the tick rail).
 */
export const READING_LINE_RATIO = 0.28

/**
 * Compute the viewport Y coordinate (in px) of the shared reading line.
 * When the conversation container is mounted, the reading band is the region
 * above the sticky composer; otherwise it falls back to `window.innerHeight`.
 * @param root - document (or a subtree) to query.
 * @returns viewport Y coordinate in px.
 */
export function resolveReadingLineY(root: ParentNode): number {
  const region = root.querySelector<HTMLElement>('[data-conversation-content]')
  if (region !== null) {
    const rect = region.getBoundingClientRect()
    if (rect.height > 0) {
      const composer = root.querySelector<HTMLElement>('[data-composer-seat]')
      const composerHeight = composer?.offsetHeight ?? 152
      const bandHeight = Math.max(200, rect.height - composerHeight)
      return Math.round(rect.top + bandHeight * READING_LINE_RATIO)
    }
  }
  const viewHeight = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 800
  return Math.round(viewHeight * READING_LINE_RATIO)
}

/**
 * All chat rows of one Turn that currently render (not inside any `[hidden]`
 * ancestor).
 * @param root - document (or a subtree) to query.
 * @param turn - Turn number carried by `data-chat-turn`.
 * @returns the visible rows in document order.
 */
export function visibleTurnRows(root: ParentNode, turn: number): HTMLElement[] {
  const rows: HTMLElement[] = []
  for (const row of root.querySelectorAll<HTMLElement>(`[data-chat-turn="${turn}"]`)) {
    if (row.closest('[hidden]') === null) rows.push(row)
  }
  return rows
}

/** One rendered heading of a Turn, in document order. */
interface CollectedHeading {
  readonly depth: number
  readonly text: string
  readonly element: HTMLElement
}

/**
 * Collect every visible heading of one Turn in a single pass. Reasoning rows
 * (`[data-variant="think"]`) and hidden rows never contribute.
 * @param root - document (or a subtree) to query.
 * @param turn - Turn number whose rows hold the headings.
 * @returns the visible headings in document order.
 */
function collectTurnHeadings(root: ParentNode, turn: number): CollectedHeading[] {
  const headings: CollectedHeading[] = []
  for (const row of visibleTurnRows(root, turn)) {
    for (const heading of row.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')) {
      if (heading.closest('[hidden]') !== null) continue
      if (heading.closest('[data-variant="think"]') !== null) continue
      headings.push({
        depth: Number(heading.tagName.slice(1)),
        text: foldWhitespace(heading.textContent ?? ''),
        element: heading,
      })
    }
  }
  return headings
}

/**
 * Resolve each outline entry onto its rendered heading element in one linear
 * walk: entries and DOM headings share source order, so a forward cursor
 * gives each entry the first still-unmatched heading of the same (depth,
 * text) at or after the cursor — duplicate entries consume duplicate
 * headings in sequence. An entry whose heading is folded away resolves to
 * null.
 * @param headings - the Turn's visible headings in document order.
 * @param entries - the Turn's outline entries in output order.
 * @returns the matched element per entry (null when not rendered).
 */
function matchHeadings(
  headings: readonly CollectedHeading[],
  entries: readonly TocEntry[],
): (HTMLElement | null)[] {
  const matched: (HTMLElement | null)[] = []
  let cursor = 0
  for (const entry of entries) {
    let found: HTMLElement | null = null
    for (let index = cursor; index < headings.length; index++) {
      const heading = headings[index]!
      if (heading.depth !== entry.depth || heading.text !== entry.text) continue
      found = heading.element
      cursor = index + 1
      break
    }
    matched.push(found)
  }
  return matched
}

/**
 * Find the rendered heading DOM node for one outline entry. Matched by tag
 * level plus folded text, taking the entry's occurrence ordinal among
 * same-level same-text headings; hidden rows and reasoning rows never match.
 * @param root - document (or a subtree) to query.
 * @param turn - Turn number whose rows hold the heading.
 * @param entry - the outline row to locate.
 * @returns the heading element, or null when the heading is not currently rendered.
 */
export function findHeadingElement(root: ParentNode, turn: number, entry: TocEntry): HTMLElement | null {
  const headings = collectTurnHeadings(root, turn)
  let seen = 0
  for (const heading of headings) {
    if (heading.depth !== entry.depth || heading.text !== entry.text) continue
    if (seen === entry.occurrence) return heading.element
    seen += 1
  }
  return null
}

/**
 * Resolve which outline entry is currently at or above the viewport reading
 * line. Defaults to 0 when all headings sit below the reading line.
 * @param root - document (or a subtree) to query.
 * @param turn - active Turn number.
 * @param entries - the Turn's outline entries.
 * @param readingLineY - viewport Y threshold in px (defaults to `resolveReadingLineY(root)`).
 * @returns the active entry index, or -1 when `entries` is empty.
 */
export function activeHeadingIndex(
  root: ParentNode,
  turn: number,
  entries: readonly TocEntry[],
  readingLineY: number = resolveReadingLineY(root),
): number {
  if (entries.length === 0) return -1
  const tolerancePx = 6
  const matched = matchHeadings(collectTurnHeadings(root, turn), entries)
  let active = 0
  for (let index = 0; index < matched.length; index++) {
    const element = matched[index]
    if (element === null) continue
    const rect = element.getBoundingClientRect()
    if (rect.top <= readingLineY + tolerancePx) active = index
    else break
  }
  return active
}

/**
 * Scroll the transcript to one outline entry: its rendered heading when
 * present, otherwise the Turn's first visible row (the heading sits in
 * content currently folded into a process disclosure).
 * @param root - document (or a subtree) to query.
 * @param turn - Turn number whose rows hold the heading.
 * @param entry - the outline row to reveal.
 * @returns where the scroll landed: the heading itself, the Turn's opening row, or nothing.
 */
export function revealEntry(root: ParentNode, turn: number, entry: TocEntry): 'heading' | 'turn' | 'none' {
  const smooth = !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const readingLineY = resolveReadingLineY(root)
  const heading = findHeadingElement(root, turn, entry)
  if (heading !== null) {
    scrollToTarget(heading, readingLineY, smooth)
    flashTarget(heading)
    return 'heading'
  }
  const row = visibleTurnRows(root, turn)[0]
  if (row === undefined) return 'none'
  scrollToTarget(row, readingLineY, smooth)
  return 'turn'
}

/**
 * Scroll the transcript to the opening row of a specific Turn.
 * @param root - document (or a subtree) to query.
 * @param turn - target Turn number.
 * @returns true when a visible row for `turn` was found and scrolled to.
 */
export function revealTurnStart(root: ParentNode, turn: number): boolean {
  const row = visibleTurnRows(root, turn)[0]
  if (row === undefined) return false
  const smooth = !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const readingLineY = resolveReadingLineY(root)
  scrollToTarget(row, readingLineY, smooth)
  return true
}

function findScrollContainer(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement
  while (current !== null) {
    if (current.scrollHeight > current.clientHeight + 4) {
      const overflowY = typeof getComputedStyle === 'function' ? getComputedStyle(current).overflowY : 'auto'
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return current
    }
    current = current.parentElement
  }
  return null
}

function scrollToTarget(element: HTMLElement, readingLineY: number, smooth: boolean): void {
  const scroller = findScrollContainer(element)
  if (scroller !== null && typeof scroller.scrollTo === 'function') {
    const scrollerRect = scroller.getBoundingClientRect()
    const targetRect = element.getBoundingClientRect()
    if (scrollerRect.height > 0) {
      // Land the target heading right on the reading line (aligned with the
      // upper tick-rail band), leaving ~28% of the reading viewport above it
      // for context and matching the scroll-spy threshold.
      const offsetInScroller = Math.max(24, readingLineY - scrollerRect.top)
      const nextTop = Math.max(0, scroller.scrollTop + (targetRect.top - scrollerRect.top) - offsetInScroller)
      scroller.scrollTo({ top: nextTop, behavior: smooth ? 'smooth' : 'auto' })
      return
    }
  }
  // Fallback for jsdom and minimal DOMs where layout geometry is zero.
  if (typeof element.scrollIntoView !== 'function') return
  element.scrollIntoView(smooth ? { behavior: 'smooth', block: 'center' } : { behavior: 'auto', block: 'center' })
}

function flashTarget(element: HTMLElement): void {
  if (typeof element.setAttribute !== 'function') return
  element.setAttribute('data-dsh-toc-flash', '')
  setTimeout(() => {
    element.removeAttribute('data-dsh-toc-flash')
  }, 1100)
}

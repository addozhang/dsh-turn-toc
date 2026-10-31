/**
 * Right-of-column TurnNavigator-style section outline:
 * - Seated just outside the right edge of the centered message column
 *   (`[data-chat-flow]`), keeping the reader's attention on the right while
 *   staying clear of the outer right-edge `TurnNavigator`.
 * - At rest, renders frameless horizontal tick marks in the exact visual
 *   language of `TurnNavigator` (length graded by heading depth, active
 *   section highlighted, 1-click jump on each tick).
 * - Hovering the tick rail smoothly expands the interactive outline card with
 *   1-click section jumps, subtree folding, prev/next Turn buttons, and a pin
 *   toggle to keep the card open when desired.
 * @module dsh-turn-toc/src/client/TurnTocTrigger
 */
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import {
  IconChevronDownOutlineRegular, IconChevronUpOutlineRegular, MenuSurface,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { AssistantChatData } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { NS } from './locale.ts'
import { activeHeadingIndex, resolveReadingLineY, revealEntry, revealTurnStart } from './heading-dom.ts'
import { turnOutline, type TocEntry } from './outline.ts'

/** The seat's runtime share (session scope: definite `useChat`) plus the namespace translator. */
export type TurnTocTriggerProps = PropsRuntime<'conversation.input.right'> & PropsLocale<typeof NS>

const EMPTY_ENTRIES: readonly TocEntry[] = []
const EMPTY_STEPS: readonly AssistantChatData[] = []
const EMPTY_TURNS: readonly number[] = []

/** Clearance from the message column's right edge. */
const COLUMN_GAP_PX = 16
/** Clearance reserved for the native outer-right `TurnNavigator` (12px + 28px + 12px). */
const OUTER_NAV_CLEARANCE_PX = 52
/**
 * Minimum conversation container width (in px) and right-gutter width required
 * so the hover card can always expand strictly to the right of the message
 * column (`cardLeft = railLeft`) without overlapping the text or `TurnNavigator`.
 */
const MIN_CONTAINER_WIDTH_PX = 1280
const MAX_CARD_WIDTH_PX = 244
const MIN_CARD_WIDTH_PX = 176

/** Computed geometry for the right-of-column tick rail and expanded card. */
interface RightMarginGeometry {
  readonly centerY: number
  readonly railLeft: number
  readonly cardLeft: number
  readonly cardWidth: number
  readonly visible: boolean
}

/** One visible outline row after subtree collapse. */
interface VisibleRow {
  readonly entry: TocEntry
  /** Index into the full entry list; keys the collapse set. */
  readonly index: number
  /** Whether a directly deeper entry follows; draws the subtree chevron. */
  readonly hasChildren: boolean
  /** Whether this row or one of its folded descendants is the active heading. */
  readonly active: boolean
}

/**
 * Keep the rows not hidden by a collapsed ancestor: collapsing entry `i`
 * hides every later entry until one at the same or shallower level. When a
 * collapsed subtree contains `activeIndex`, the collapsed parent row inherits
 * the active highlight.
 * @param entries - the Turn's full outline.
 * @param collapsed - indexes whose subtrees are folded.
 * @param activeIndex - index of the heading currently at the reading line.
 * @returns the rows to render, in output order.
 */
function visibleRows(
  entries: readonly TocEntry[],
  collapsed: ReadonlySet<number>,
  activeIndex: number,
): readonly VisibleRow[] {
  const rows: VisibleRow[] = []
  let hiddenUnder: number | null = null
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!
    if (hiddenUnder !== null) {
      if (entry.depth > hiddenUnder) {
        if (index === activeIndex && rows.length > 0) {
          const parent = rows[rows.length - 1]!
          rows[rows.length - 1] = { ...parent, active: true }
        }
        continue
      }
      hiddenUnder = null
    }
    const hasChildren = index + 1 < entries.length && entries[index + 1]!.depth > entry.depth
    rows.push({ entry, index, hasChildren, active: index === activeIndex })
    if (hasChildren && collapsed.has(index)) hiddenUnder = entry.depth
  }
  return rows
}

/**
 * The Turn whose rows sit at the transcript's reading line: the last Turn
 * whose first row starts at or above the line, else the first on-screen Turn.
 * Hidden rows never count.
 * @returns the resolved Turn number, or null when no transcript is on screen.
 */
function turnAtReadingLine(): number | null {
  const line = resolveReadingLineY(document)
  let current: number | null = null
  let fallback: number | null = null
  for (const row of document.querySelectorAll<HTMLElement>('[data-chat-turn]')) {
    if (row.closest('[hidden]') !== null) continue
    const rect = row.getBoundingClientRect()
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue
    const turn = Number(row.dataset.chatTurn)
    if (!Number.isInteger(turn) || turn < 0) continue
    fallback ??= turn
    if (rect.top <= line + 6) current = turn
  }
  return current ?? fallback
}

/**
 * Measure the right gutter between the centered message column (`[data-chat-flow]`)
 * and the conversation viewport's right edge, reserving clearance for the
 * outer-right `TurnNavigator`.
 * @returns placement geometry, or null when the conversation is not mounted.
 */
function measureRightMargin(): RightMarginGeometry | null {
  const region = document.querySelector<HTMLElement>('[data-conversation-content]')
  const column = document.querySelector<HTMLElement>('[data-chat-flow]')
  if (region === null || column === null) return null
  const regionRect = region.getBoundingClientRect()
  const columnRect = column.getBoundingClientRect()
  if (regionRect.width <= 0 || columnRect.width <= 0) return null

  const composer = document.querySelector<HTMLElement>('[data-composer-seat]')
  const composerHeight = composer?.offsetHeight ?? 152
  const readingBandHeight = Math.max(200, regionRect.height - composerHeight)
  const centerY = Math.round(regionRect.top + readingBandHeight / 2)

  const railLeft = Math.round(columnRect.right + COLUMN_GAP_PX)
  const usableRight = Math.round(regionRect.right - OUTER_NAV_CLEARANCE_PX)
  const gutterWidth = usableRight - railLeft
  const visible = regionRect.width >= MIN_CONTAINER_WIDTH_PX && gutterWidth >= MIN_CARD_WIDTH_PX
  const cardWidth = Math.min(MAX_CARD_WIDTH_PX, Math.max(MIN_CARD_WIDTH_PX, gutterWidth))
  // Always expand strictly to the right from railLeft; never shift left over the message column.
  const cardLeft = railLeft

  return { centerY, railLeft, cardLeft, cardWidth, visible }
}

function sameGeometry(left: RightMarginGeometry | null, right: RightMarginGeometry | null): boolean {
  if (left === right) return true
  if (left === null || right === null) return false
  return left.centerY === right.centerY
    && left.railLeft === right.railLeft
    && left.cardLeft === right.cardLeft
    && left.cardWidth === right.cardWidth
    && left.visible === right.visible
}

export function TurnTocTrigger({ useChat, t }: TurnTocTriggerProps) {
  const [activeTurn, setActiveTurn] = useState<number | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [pinned, setPinned] = useState(false)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set())
  const [geometry, setGeometry] = useState<RightMarginGeometry | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const model = useChat(snapshot => {
    const order = snapshot.order
    const loadedTurns = snapshot.navigation.items().map(item => item.turn)
    const fallbackTurn = loadedTurns.at(-1) ?? null
    const targetTurn = activeTurn ?? fallbackTurn
    const steps = targetTurn === null
      ? EMPTY_STEPS
      : snapshot.nodes.turnDataSource(targetTurn, 'assistant-step').getSnapshot() as readonly AssistantChatData[]
    return {
      order,
      turn: targetTurn,
      turns: loadedTurns.length > 0 ? loadedTurns : EMPTY_TURNS,
      steps,
    }
  })

  const entries = useMemo(
    () => model === null || model.turn === null ? EMPTY_ENTRIES : turnOutline(model.steps),
    [model],
  )
  const turn = model?.turn ?? null
  const turns = model?.turns ?? EMPTY_TURNS
  const minDepth = useMemo(
    () => (entries.length === 0 ? 1 : entries.reduce((min, item) => Math.min(min, item.depth), 6)),
    [entries],
  )

  const latestRef = useRef<{ turn: number | null; entries: readonly TocEntry[] }>({ turn, entries })
  latestRef.current = { turn, entries }

  const scheduleRef = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    let frame: number | null = null
    const compute = (): void => {
      frame = null
      const nextTurn = turnAtReadingLine()
      if (nextTurn !== null) {
        setActiveTurn(previous => (previous === nextTurn ? previous : nextTurn))
      }
      const nextGeo = measureRightMargin()
      setGeometry(previous => (sameGeometry(previous, nextGeo) ? previous : nextGeo))
      const effectiveTurn = nextTurn ?? latestRef.current.turn
      if (effectiveTurn !== null && latestRef.current.entries.length > 0) {
        const nextIdx = activeHeadingIndex(
          document,
          effectiveTurn,
          latestRef.current.entries,
          resolveReadingLineY(document),
        )
        setActiveIdx(previous => (previous === nextIdx ? previous : nextIdx))
      }
    }
    const schedule = (): void => {
      if (frame !== null) return
      if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(compute)
      else compute()
    }
    scheduleRef.current = schedule
    document.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    const region = document.querySelector<HTMLElement>('[data-conversation-content]')
    const observer = typeof ResizeObserver === 'function' && region !== null
      ? new ResizeObserver(schedule)
      : null
    if (observer !== null && region !== null) observer.observe(region)
    schedule()
    return () => {
      scheduleRef.current = null
      if (frame !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
      document.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      observer?.disconnect()
    }
  }, [])

  const structureKey = model?.order
  useLayoutEffect(() => { scheduleRef.current?.() }, [structureKey, entries])

  useLayoutEffect(() => {
    setCollapsed(new Set())
    setActiveIdx(0)
  }, [turn])

  const rows = useMemo(
    () => visibleRows(entries, collapsed, activeIdx),
    [entries, collapsed, activeIdx],
  )

  if (turn === null || entries.length === 0 || geometry === null || !geometry.visible) {
    return <div ref={rootRef} />
  }

  const turnIndex = turns.indexOf(turn)
  const prevTurn = turnIndex > 0 ? turns[turnIndex - 1]! : null
  const nextTurn = turnIndex >= 0 && turnIndex + 1 < turns.length ? turns[turnIndex + 1]! : null

  const isExpanded = pinned || hoverOpen

  const clearHoverTimer = (): void => {
    if (hoverTimerRef.current !== null) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  const onPointerEnter = (): void => {
    clearHoverTimer()
    setHoverOpen(true)
  }

  const onPointerLeave = (): void => {
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      setHoverOpen(false)
    }, 160)
  }

  const toggleSubtree = (index: number): void => {
    setCollapsed(current => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const jumpToTurn = (targetTurn: number): void => {
    setActiveTurn(targetTurn)
    revealTurnStart(document, targetTurn)
  }

  const railStyle: CSSProperties = {
    top: geometry.centerY,
    left: geometry.railLeft,
  }

  const panelStyle: CSSProperties = {
    top: geometry.centerY,
    left: geometry.cardLeft,
    width: geometry.cardWidth,
  }

  return (
    <div ref={rootRef}>
      {createPortal(
        isExpanded
          ? (
            <MenuSurface
              className="dsh-toc-panel"
              data-pinned={pinned ? 'true' : undefined}
              style={panelStyle}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            >
              <div className="dsh-toc-head">
                <button
                  type="button"
                  className="dsh-toc-turnBtn"
                  title={t('toc.turnTop', { turn })}
                  aria-label={t('toc.turnTop', { turn })}
                  onClick={() => { revealTurnStart(document, turn) }}
                >
                  <span className="dsh-toc-turnLabel">{t('toc.turn', { turn })}</span>
                  <span className="dsh-toc-count">{t('toc.count', { count: entries.length })}</span>
                </button>
                <div className="dsh-toc-navGroup">
                  <button
                    type="button"
                    className="dsh-toc-iconBtn"
                    disabled={prevTurn === null}
                    title={prevTurn === null ? undefined : t('toc.prevTurn', { turn: prevTurn })}
                    aria-label={t('toc.prevTurn', { turn: prevTurn ?? turn })}
                    onClick={() => { if (prevTurn !== null) jumpToTurn(prevTurn) }}
                  >
                    <IconChevronUpOutlineRegular size={12} />
                  </button>
                  <button
                    type="button"
                    className="dsh-toc-iconBtn"
                    disabled={nextTurn === null}
                    title={nextTurn === null ? undefined : t('toc.nextTurn', { turn: nextTurn })}
                    aria-label={t('toc.nextTurn', { turn: nextTurn ?? turn })}
                    onClick={() => { if (nextTurn !== null) jumpToTurn(nextTurn) }}
                  >
                    <IconChevronDownOutlineRegular size={12} />
                  </button>
                  <button
                    type="button"
                    className="dsh-toc-iconBtn"
                    aria-pressed={pinned}
                    title={t(pinned ? 'toc.unpin' : 'toc.pin')}
                    aria-label={t(pinned ? 'toc.unpin' : 'toc.pin')}
                    onClick={() => { setPinned(current => !current) }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M9.8 2.2L13.8 6.2L12.4 7.6L10.3 6.9L7.4 9.8L8.1 11.9L6.7 13.3L4.2 10.8L1.9 13.1L1.2 12.4L3.5 10.1L1 7.6L2.4 6.2L4.5 6.9L7.4 4L6.7 1.9L8.1 0.5L9.8 2.2Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <nav className="dsh-toc-list" aria-label={t('toc.panelLabel')}>
                {rows.map(({ entry, index, hasChildren, active }) => (
                  <div
                    key={index}
                    className="dsh-toc-row"
                    data-active={active ? 'true' : undefined}
                    style={{ paddingInlineStart: Math.max(0, entry.depth - minDepth) * 10 + 4 }}
                  >
                    {hasChildren
                      ? (
                        <button
                          type="button"
                          className="dsh-toc-chevron"
                          aria-expanded={!collapsed.has(index)}
                          aria-label={t(collapsed.has(index) ? 'toc.expand' : 'toc.collapse', { title: entry.text })}
                          tabIndex={-1}
                          onClick={() => { toggleSubtree(index) }}
                        >
                          <IconChevronDownOutlineRegular size={10} className={collapsed.has(index) ? undefined : 'dsh-toc-chevronOpen'} />
                        </button>
                      )
                      : <span className="dsh-toc-spacer" aria-hidden="true" />}
                    <button
                      type="button"
                      className="dsh-toc-link"
                      title={entry.text}
                      aria-label={t('toc.jump', { title: entry.text })}
                      aria-current={active ? 'location' : undefined}
                      onClick={() => {
                        setActiveIdx(index)
                        revealEntry(document, turn, entry)
                      }}
                    >
                      {entry.text}
                    </button>
                  </div>
                ))}
              </nav>
            </MenuSurface>
          )
          : (
            <nav
              className="dsh-toc-rail"
              style={railStyle}
              aria-label={t('toc.panelLabel')}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
            >
              <span className="dsh-toc-railTurn">T{turn}</span>
              <div className="dsh-toc-railMarks">
                {entries.map((entry, index) => {
                  const markWidth = Math.max(8, 20 - Math.max(0, entry.depth - minDepth) * 5)
                  return (
                    <button
                      key={index}
                      type="button"
                      className="dsh-toc-mark"
                      data-active={index === activeIdx ? 'true' : undefined}
                      title={entry.text}
                      aria-label={t('toc.jump', { title: entry.text })}
                      style={{ '--dsh-toc-mark-width': `${markWidth}px` } as CSSProperties}
                      onClick={() => {
                        setActiveIdx(index)
                        revealEntry(document, turn, entry)
                      }}
                    />
                  )
                })}
              </div>
            </nav>
          ),
        document.body,
      )}
    </div>
  )
}

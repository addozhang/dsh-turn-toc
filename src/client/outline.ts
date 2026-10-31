/**
 * Pure derivation of the current Turn's heading outline from Assistant reply
 * text. One entry per ATX heading (`#`–`######`) outside fenced code blocks;
 * setext headings (`Title` + `===`) are not recognized.
 * @module dsh-turn-toc/src/client/outline
 */

/** One outline row: an ATX heading in the Turn's reply text, in output order. */
export interface TocEntry {
  /** ATX heading level (1–6); drives outline indentation and DOM `h1`–`h6` matching. */
  readonly depth: number
  /** Heading text with inline Markdown stripped; equals the DOM heading's folded textContent. */
  readonly text: string
  /** Zero-based occurrence ordinal of this exact (depth, folded text) pair inside the Turn; disambiguates duplicates for DOM lookup. */
  readonly occurrence: number
}

/** One Assistant step as the outline consumes it: ordered reply blocks. */
export interface OutlineStepInput {
  readonly blocks: readonly { readonly kind: string; readonly text?: string | undefined }[]
}

/** Structural view of one Turn's `AssistantChatData[]` from the Chat snapshot. */
export type OutlineSource = readonly OutlineStepInput[]

const EMPTY: readonly TocEntry[] = []

/** Opening or closing marker of a fenced code block, when the line opens one. */
interface Fence {
  readonly char: '`' | '~'
  readonly length: number
}

/**
 * The fence marker starting this line, if any (CommonMark allows up to three
 * leading spaces).
 * @param line - one Markdown source line.
 * @returns the marker character and run length, or null for a plain line.
 */
function fenceOf(line: string): Fence | null {
  const match = /^ {0,3}(`{3,}|~{3,})/.exec(line)
  const run = match?.[1]
  if (run === undefined) return null
  return { char: run[0] as '`' | '~', length: run.length }
}

/**
 * Fold all whitespace runs to single spaces and trim the ends, matching how
 * heading DOM textContent compares across split inline nodes.
 * @param value - source text.
 * @returns the folded text.
 */
export function foldWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

/**
 * Strip inline Markdown from one heading's content so the result equals the
 * rendered DOM heading's folded text: code spans, images, links, autolinks,
 * strikethrough, emphasis, backslash escapes, and character entities.
 * @param content - the ATX heading's inline source.
 * @returns the plain text.
 */
function plainText(content: string): string {
  let text = content
    .replace(/`+([^`]|[^`][\s\S]*?[^`])`+/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<((?:https?|mailto):[^>]+)>/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/(\*|_)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
  for (const [entity, value] of Object.entries(NAMED_ENTITIES)) text = text.replaceAll(entity, value)
  text = text.replace(/&#(\d+);/g, (match, code: string) => decodeCodePoint(match, Number(code)))
  text = text.replace(/&#[xX]([0-9a-fA-F]+);/g, (match, code: string) => decodeCodePoint(match, Number.parseInt(code, 16)))
  return foldWhitespace(text)
}

function decodeCodePoint(match: string, code: number): string {
  return Number.isSafeInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
}

/**
 * The ATX heading this line opens, when it opens one. Empty headings and
 * deeper-than-six markers are not headings.
 * @param line - one Markdown source line outside any code fence.
 * @returns level and plain text, or null.
 */
function atxHeading(line: string): { readonly depth: number; readonly text: string } | null {
  const match = /^( {0,3})(#{1,6})(?:[ \t]+(.*))?$/.exec(line)
  if (match === null) return null
  let content = match[3] ?? ''
  content = content.replace(/[ \t]+#+[ \t]*$/, '')
  // A content that is itself only a hash run (`#### ###`) closes the heading empty.
  if (/^#+$/.test(content.trim())) return null
  const text = plainText(content)
  if (text === '') return null
  return { depth: match[2]!.length, text }
}

/**
 * Emit every heading of one reply text block in source order, skipping fenced
 * code spans entirely.
 * @param text - one Assistant text block.
 * @param emit - receiver for each heading's level and plain text.
 */
function collectHeadings(text: string, emit: (depth: number, text: string) => void): void {
  let fence: Fence | null = null
  for (const line of text.split('\n')) {
    const marker = fenceOf(line)
    if (marker !== null) {
      const after = line.slice(line.length - line.trimStart().length + marker.length).trim()
      if (fence === null) fence = marker
      else if (marker.char === fence.char && marker.length >= fence.length && after === '') fence = null
      continue
    }
    if (fence !== null) continue
    const heading = atxHeading(line)
    if (heading !== null) emit(heading.depth, heading.text)
  }
}

/**
 * Derive the outline of one Turn from its Assistant steps.
 * @param steps - the Turn's `assistant-step` data in anchor order.
 * @returns heading entries in output order, or a shared empty array when none.
 */
export function turnOutline(steps: OutlineSource): readonly TocEntry[] {
  const occurrences = new Map<string, number>()
  const entries: TocEntry[] = []
  for (const step of steps) {
    for (const block of step.blocks) {
      if (block.kind !== 'text') continue
      collectHeadings(block.text ?? '', (depth, text) => {
        const key = `${depth}:${text}`
        const occurrence = occurrences.get(key) ?? 0
        occurrences.set(key, occurrence + 1)
        entries.push({ depth, text, occurrence })
      })
    }
  }
  return entries.length === 0 ? EMPTY : entries
}

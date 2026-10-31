/** turn-toc locale namespace and dictionaries. */

/** Namespace for the right-margin turn-outline companion and its copy. */
export const NS = 'turn-toc'

/** Simplified Chinese dictionary; the key-set source of truth. */
export const zh = {
  'toc.panelLabel': '本轮目录',
  'toc.turn': '第 {turn} 轮',
  'toc.count': '{count} 节',
  'toc.jump': '跳转到「{title}」',
  'toc.collapse': '收起「{title}」的子标题',
  'toc.expand': '展开「{title}」的子标题',
  'toc.pin': '固定展开目录',
  'toc.unpin': '取消固定（移出自动收起为刻度）',
  'toc.prevTurn': '上一轮（第 {turn} 轮）',
  'toc.nextTurn': '下一轮（第 {turn} 轮）',
  'toc.turnTop': '回到第 {turn} 轮开头',
} as const

/** English dictionary; keys mirror {@link zh}. */
export const en = {
  'toc.panelLabel': 'Turn outline',
  'toc.turn': 'Turn {turn}',
  'toc.count': '{count} sections',
  'toc.jump': 'Jump to "{title}"',
  'toc.collapse': 'Collapse subsections of "{title}"',
  'toc.expand': 'Expand subsections of "{title}"',
  'toc.pin': 'Pin outline open',
  'toc.unpin': 'Unpin outline (auto-collapse to ticks)',
  'toc.prevTurn': 'Previous turn (Turn {turn})',
  'toc.nextTurn': 'Next turn (Turn {turn})',
  'toc.turnTop': 'Scroll to start of Turn {turn}',
} as const

/** Dictionary keys both locales define. */
export type TocLocaleKey = keyof typeof zh & keyof typeof en

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'turn-toc': TocLocaleKey
  }
}

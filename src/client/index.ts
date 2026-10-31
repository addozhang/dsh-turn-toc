/**
 * Browser half: register the locale dictionaries, the stylesheet, and the
 * turn-outline trigger into the composer's right-side control seat.
 * @module dsh-turn-toc/src/client/index
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { TurnTocTrigger } from './TurnTocTrigger.tsx'
import { NS, en, zh } from './locale.ts'
import { STYLESHEET } from './styles.ts'

export const inject = ['slots', 'locale']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'turn-toc: dictionaries')
  ctx.effect(() => {
    const sheet = document.createElement('style')
    sheet.dataset.dshTurnToc = ''
    sheet.textContent = STYLESHEET
    document.head.append(sheet)
    return () => { sheet.remove() }
  }, 'turn-toc: styles')
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'turn-toc',
    order: 100,
    locale: NS,
  }, TurnTocTrigger))
}

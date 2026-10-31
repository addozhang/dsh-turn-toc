/**
 * The plugin's stylesheet, injected as one `<style data-dsh-turn-toc>` element
 * for the plugin's activation lifetime. Styled in the exact visual language of
 * DSH's native `TurnNavigator`: frameless tick marks at rest, expanding on
 * hover (or pin) into an interactive outline card on the right side of the
 * centered message column (`[data-chat-flow]`), well clear of the outer
 * right-edge `TurnNavigator`.
 * @module dsh-turn-toc/src/client/styles
 */

export const STYLESHEET = `
/* Frameless section-tick rail seated just outside the right edge of the
   centered message column, vertically centered in the reading band. */
.dsh-toc-rail {
  position: fixed;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 28px;
  max-height: 360px;
  padding: 6px 4px;
  border: 0;
  background: transparent;
  transform: translateY(-50%);
}

.dsh-toc-railTurn {
  margin-bottom: 4px;
  padding: 0 2px;
  font-size: 10px;
  line-height: 12px;
  font-weight: 500;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.75;
  user-select: none;
  transition: opacity 140ms ease, color 140ms ease;
}

.dsh-toc-rail:hover .dsh-toc-railTurn {
  opacity: 1;
  color: var(--dsw-alias-label-secondary);
}

.dsh-toc-railMarks {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.dsh-toc-railMarks::-webkit-scrollbar {
  display: none;
}

/* Each mark is a 10px-tall hit target drawing a 2px rounded bar, matching
   TurnNavigator.module.css (.mark / .mark::before). */
.dsh-toc-mark {
  position: relative;
  display: block;
  width: 24px;
  height: 10px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}

.dsh-toc-mark::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: var(--dsh-toc-mark-width, 18px);
  height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-border-l4);
  content: '';
  transform: translateY(-50%) scaleX(0.72);
  transform-origin: left center;
  transition: transform 140ms ease, background-color 140ms ease;
}

.dsh-toc-mark:hover::before,
.dsh-toc-mark:focus-visible::before {
  transform: translateY(-50%) scaleX(0.95);
  background: var(--dsw-alias-label-tertiary);
}

.dsh-toc-mark[data-active='true']::before {
  transform: translateY(-50%) scaleX(1);
  background: var(--dsw-alias-label-primary);
}

/* Interactive outline card anchored on the right of the message column,
   sharing TurnNavigator.preview's elevation and radius tokens. */
.dsh-toc-panel {
  position: fixed;
  z-index: 80;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: min(420px, calc(100vh - 180px));
  overflow: hidden;
  border-radius: var(--dsw-radius-lg);
  transform: translateY(-50%);
  animation: dsh-toc-panel-enter 120ms ease-out;
  --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2);
  --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2);
}

.dsh-toc-panel[data-pinned='true'] {
  z-index: 6;
  box-shadow: var(--dsw-elevation-soft, 0 4px 16px rgba(0, 0, 0, 0.08));
}

@keyframes dsh-toc-panel-enter {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

.dsh-toc-head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 6px 6px 10px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l3);
}

.dsh-toc-turnBtn {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  flex: 1 1 auto;
  min-width: 0;
  padding: 2px 4px;
  border: none;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.dsh-toc-turnBtn:hover,
.dsh-toc-turnBtn:focus-visible {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-turnLabel {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dsh-toc-count {
  flex: none;
  font-size: 11px;
  line-height: 16px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary);
}

.dsh-toc-navGroup {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  flex: none;
}

.dsh-toc-iconBtn {
  display: grid;
  place-items: center;
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

.dsh-toc-iconBtn:hover:not(:disabled),
.dsh-toc-iconBtn:focus-visible:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dsh-toc-iconBtn[aria-pressed='true'] {
  color: var(--dsw-alias-state-business-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-iconBtn:disabled {
  opacity: 0.32;
  cursor: default;
}

.dsh-toc-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 6px 4px 8px 6px;
}

.dsh-toc-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  border-radius: var(--dsw-radius-xs);
}

.dsh-toc-row::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  border-radius: 2px;
  background: transparent;
  transition: background-color 140ms ease;
}

.dsh-toc-row[data-active='true']::before {
  background: var(--dsw-alias-state-business-primary);
}

.dsh-toc-row[data-active='true'] {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-row:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-toc-spacer {
  flex: none;
  width: 14px;
}

.dsh-toc-chevron {
  display: grid;
  place-items: center;
  flex: none;
  width: 14px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

.dsh-toc-chevron:hover {
  color: var(--dsw-alias-label-primary);
}

.dsh-toc-chevron svg {
  transition: transform 120ms ease;
}

/* Expanded subtrees point the chevron down; collapsed ones point right. */
.dsh-toc-chevron svg.dsh-toc-chevronOpen {
  transform: none;
}

.dsh-toc-chevron svg:not(.dsh-toc-chevronOpen) {
  transform: rotate(-90deg);
}

.dsh-toc-link {
  flex: 1 1 auto;
  min-width: 0;
  padding: 3px 6px 3px 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.dsh-toc-row[data-active='true'] .dsh-toc-link {
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.dsh-toc-link:hover,
.dsh-toc-link:focus-visible {
  color: var(--dsw-alias-label-primary);
}

/* Brief target highlight when jumping to a heading in the transcript. */
[data-dsh-toc-flash] {
  border-radius: 4px;
  background: var(--dsw-alias-interactive-bg-hover);
  transition: background-color 400ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .dsh-toc-mark::before,
  .dsh-toc-panel {
    transition: none;
    animation: none;
  }
}
`

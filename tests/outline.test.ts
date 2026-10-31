import assert from 'node:assert/strict'
import { test } from 'node:test'
import { displayOutline, turnOutline } from '../src/client/outline.ts'

function step(text: string): { blocks: { kind: string; text: string }[] } {
  return { blocks: [{ kind: 'text', text }] }
}

test('collects ATX headings across steps in output order', () => {
  const entries = turnOutline([
    step('# 总览\n正文'),
    step('### 实现细节\nmore'),
    step('## 验证\n'),
  ])
  assert.deepEqual(entries, [
    { depth: 1, text: '总览', occurrence: 0 },
    { depth: 3, text: '实现细节', occurrence: 0 },
    { depth: 2, text: '验证', occurrence: 0 },
  ])
})

test('skips headings inside fenced code blocks', () => {
  const entries = turnOutline([
    step('## Real\n\n```js\n# not a heading\nconst a = 1\n```\n\n~~~\n## also fenced\n### deep\n~~~\n'),
  ])
  assert.deepEqual(entries, [{ depth: 2, text: 'Real', occurrence: 0 }])
})

test('longer opening fence needs an equally long closer', () => {
  const entries = turnOutline([
    step('````\n```\n# inside\n```\n````\n# outside'),
  ])
  assert.deepEqual(entries, [{ depth: 1, text: 'outside', occurrence: 0 }])
})

test('skips empty headings, seven markers, and indented headings', () => {
  const entries = turnOutline([
    step('##\n##   \n####### seven\n#### ###\n    ## indented four'),
  ])
  assert.deepEqual(entries, [])
})

test('strips a closing hash run and inline markdown to plain text', () => {
  const entries = turnOutline([
    step('## **Bold** and `code span` ##'),
    step('### [link text](https://example.com) and ![alt](img.png)'),
    step('#### ~~gone~~ _em_ *star* <https://example.com>'),
    step('##### escape \\* and entity &amp; &lt; &#x41;'),
  ])
  assert.deepEqual(entries.map(entry => entry.text), [
    'Bold and code span',
    'link text and alt',
    'gone em star https://example.com',
    'escape * and entity & < A',
  ])
})

test('folds whitespace so split inline nodes still match', () => {
  const entries = turnOutline([step('##  a   b\tc  ')])
  assert.equal(entries[0]?.text, 'a b c')
})

test('counts duplicate (depth, text) occurrences', () => {
  const entries = turnOutline([step('## Same\n\n# Same\n\n## Same')])
  assert.deepEqual(entries, [
    { depth: 2, text: 'Same', occurrence: 0 },
    { depth: 1, text: 'Same', occurrence: 0 },
    { depth: 2, text: 'Same', occurrence: 1 },
  ])
})

test('ignores non-text blocks and empty block lists', () => {
  assert.deepEqual(turnOutline([{ blocks: [{ kind: 'reasoning', text: '# hidden' }] }, { blocks: [] }]), [])
})

test('returns a shared empty array when nothing matches', () => {
  const first = turnOutline([step('plain text only')])
  const second = turnOutline([])
  assert.equal(first, second)
})

test('displayOutline keeps headings up to level 3', () => {
  const entries = turnOutline([step('# A\n## B\n### C\n#### D\n##### E\n###### F')])
  const shown = displayOutline(entries)
  assert.deepEqual(shown.map(entry => entry.text), ['A', 'B', 'C'])
})

test('displayOutline falls back to the shallowest level when all headings are deeper than the cap', () => {
  const entries = turnOutline([step('#### D1\n##### E1\n#### D2')])
  const shown = displayOutline(entries)
  assert.deepEqual(shown.map(entry => `${entry.depth}:${entry.text}`), ['4:D1', '4:D2'])
})

test('displayOutline passes duplicates and empty lists through consistently', () => {
  assert.deepEqual(displayOutline([]), [])
  const entries = turnOutline([step('## Same\n### x\n## Same')])
  const shown = displayOutline(entries)
  assert.deepEqual(shown.map(entry => [entry.depth, entry.text, entry.occurrence]), [
    [2, 'Same', 0], [3, 'x', 0], [2, 'Same', 1],
  ])
})

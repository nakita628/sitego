import { describe, it, expect } from 'vitest'

import { DEFAULT_OPTIONS } from './converter.ts'
import { parseHtml } from './parser.ts'
import { COMMONMARK_RULES, findMatchingRule } from './rules.ts'

function getElement(html: string) {
  const root = parseHtml(html)
  return root.childNodes[0]!
}

function getElementNode(html: string) {
  const el = getElement(html)
  if (el.nodeType !== 1) throw new Error('Expected element node')
  return el
}

describe('findMatchingRule', () => {
  it('matches paragraph rule', () => {
    const node = getElementNode('<p>text</p>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches br rule', () => {
    const node = getElementNode('<br>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches heading rules', () => {
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      const node = getElementNode(`<${tag}>text</${tag}>`)
      const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
      expect(rule).toBeDefined()
    }
  })

  it('matches blockquote rule', () => {
    const node = getElementNode('<blockquote>text</blockquote>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches ul rule', () => {
    const node = getElementNode('<ul><li>item</li></ul>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches ol rule', () => {
    const node = getElementNode('<ol><li>item</li></ol>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches li rule', () => {
    const root = parseHtml('<ul><li>item</li></ul>')
    const ul = root.childNodes[0]!
    if (ul.nodeType === 1) {
      const li = ul.childNodes[0]!
      if (li.nodeType === 1) {
        const rule = findMatchingRule(COMMONMARK_RULES, li, DEFAULT_OPTIONS)
        expect(rule).toBeDefined()
      }
    }
  })

  it('matches hr rule', () => {
    const node = getElementNode('<hr>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches inlined link rule', () => {
    const node = getElementNode('<a href="url">link</a>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('does not match link without href', () => {
    const node = getElementNode('<a>no href</a>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeUndefined()
  })

  it('matches referenced link rule', () => {
    const node = getElementNode('<a href="url">link</a>')
    const options = { ...DEFAULT_OPTIONS, linkStyle: 'referenced' as const }
    const rule = findMatchingRule(COMMONMARK_RULES, node, options)
    expect(rule).toBeDefined()
  })

  it('matches em rule', () => {
    const node = getElementNode('<em>text</em>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches i rule', () => {
    const node = getElementNode('<i>text</i>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches strong rule', () => {
    const node = getElementNode('<strong>text</strong>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches b rule', () => {
    const node = getElementNode('<b>text</b>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches img rule', () => {
    const node = getElementNode('<img src="a.png" alt="alt">')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches fenced code block rule', () => {
    const node = getElementNode('<pre><code>x</code></pre>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeDefined()
  })

  it('matches indented code block rule', () => {
    const node = getElementNode('<pre><code>x</code></pre>')
    const options = { ...DEFAULT_OPTIONS, codeBlockStyle: 'indented' as const }
    const rule = findMatchingRule(COMMONMARK_RULES, node, options)
    expect(rule).toBeDefined()
  })

  it('does not match pre without code child', () => {
    const node = getElementNode('<pre>text</pre>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeUndefined()
  })

  it('returns undefined for unknown element', () => {
    const node = getElementNode('<div>text</div>')
    const rule = findMatchingRule(COMMONMARK_RULES, node, DEFAULT_OPTIONS)
    expect(rule).toBeUndefined()
  })

  it('matches inline code (not inside pre)', () => {
    const root = parseHtml('<p><code>inline</code></p>')
    const p = root.childNodes[0]!
    if (p.nodeType === 1) {
      const code = p.childNodes[0]!
      if (code.nodeType === 1) {
        const rule = findMatchingRule(COMMONMARK_RULES, code, DEFAULT_OPTIONS)
        expect(rule).toBeDefined()
      }
    }
  })
})

describe('COMMONMARK_RULES count', () => {
  it('has 15 rules', () => {
    expect(COMMONMARK_RULES).toHaveLength(15)
  })
})

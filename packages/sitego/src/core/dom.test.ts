import { describe, it, expect } from 'vitest'

import {
  BLOCK_ELEMENTS,
  VOID_ELEMENTS,
  MEANINGFUL_WHEN_BLANK,
  RAW_TEXT_ELEMENTS,
  removeChild,
  getTextContent,
  getAttribute,
  getFirstChild,
  getChildren,
  getLastElementChild,
  getElementsByTagName,
} from './dom.ts'
import { parseHtml } from './parser.ts'

function makeElement(tag: string): ReturnType<typeof parseHtml> {
  return {
    nodeType: 1 as const,
    nodeName: tag.toUpperCase(),
    attributes: new Map(),
    childNodes: [],
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
  }
}

describe('constants', () => {
  it('BLOCK_ELEMENTS contains common block elements', () => {
    for (const tag of ['DIV', 'P', 'H1', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'TABLE']) {
      expect(BLOCK_ELEMENTS.has(tag)).toBe(true)
    }
  })

  it('VOID_ELEMENTS contains self-closing elements', () => {
    for (const tag of ['BR', 'HR', 'IMG', 'INPUT', 'META', 'LINK']) {
      expect(VOID_ELEMENTS.has(tag)).toBe(true)
    }
  })

  it('MEANINGFUL_WHEN_BLANK contains expected elements', () => {
    for (const tag of ['A', 'TABLE', 'TD', 'TH', 'IFRAME']) {
      expect(MEANINGFUL_WHEN_BLANK.has(tag)).toBe(true)
    }
  })

  it('RAW_TEXT_ELEMENTS contains SCRIPT and STYLE', () => {
    expect(RAW_TEXT_ELEMENTS.has('SCRIPT')).toBe(true)
    expect(RAW_TEXT_ELEMENTS.has('STYLE')).toBe(true)
    expect(RAW_TEXT_ELEMENTS.size).toBe(2)
  })
})

describe('removeChild', () => {
  it('removes child from parent', () => {
    const root = parseHtml('<div><p>a</p><p>b</p><p>c</p></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const b = div.childNodes[1]!
      removeChild(div, b)
      expect(div.childNodes).toHaveLength(2)
      expect(b.parentNode).toBeNull()
    }
  })

  it('updates sibling links after removal', () => {
    const root = parseHtml('<div><p>a</p><p>b</p><p>c</p></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const [a, b, c] = div.childNodes
      removeChild(div, b!)
      expect(a!.nextSibling).toBe(c)
      expect(c!.previousSibling).toBe(a)
    }
  })

  it('handles removing first child', () => {
    const root = parseHtml('<div><p>a</p><p>b</p></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const [a, b] = div.childNodes
      removeChild(div, a!)
      expect(b!.previousSibling).toBeNull()
      expect(div.childNodes).toHaveLength(1)
    }
  })

  it('handles removing last child', () => {
    const root = parseHtml('<div><p>a</p><p>b</p></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const [a, b] = div.childNodes
      removeChild(div, b!)
      expect(a!.nextSibling).toBeNull()
    }
  })

  it('does nothing when child is not found', () => {
    const parent = makeElement('div')
    const orphan = makeElement('p')
    removeChild(parent, orphan)
    expect(parent.childNodes).toHaveLength(0)
  })
})

describe('getTextContent', () => {
  it('returns text from text node', () => {
    const root = parseHtml('hello')
    expect(getTextContent(root.childNodes[0]!)).toBe('hello')
  })

  it('returns concatenated text from nested elements', () => {
    const root = parseHtml('<p>hello <strong>world</strong></p>')
    expect(getTextContent(root.childNodes[0]!)).toBe('hello world')
  })

  it('returns empty string for empty element', () => {
    const root = parseHtml('<div></div>')
    expect(getTextContent(root.childNodes[0]!)).toBe('')
  })

  it('returns deeply nested text', () => {
    const root = parseHtml('<div><p><span><em>deep</em></span></p></div>')
    expect(getTextContent(root)).toBe('deep')
  })
})

describe('getAttribute', () => {
  it('returns attribute value', () => {
    const root = parseHtml('<a href="url">x</a>')
    const a = root.childNodes[0]!
    if (a.nodeType === 1) {
      expect(getAttribute(a, 'href')).toBe('url')
    }
  })

  it('returns null for missing attribute', () => {
    const el = makeElement('div')
    expect(getAttribute(el, 'class')).toBeNull()
  })
})

describe('getFirstChild', () => {
  it('returns first child node', () => {
    const root = parseHtml('<div><p>a</p><p>b</p></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const first = getFirstChild(div)
      expect(first).not.toBeNull()
      expect(first!.nodeName).toBe('P')
    }
  })

  it('returns null for empty element', () => {
    const el = makeElement('div')
    expect(getFirstChild(el)).toBeNull()
  })
})

describe('getChildren', () => {
  it('returns only element children (excludes text nodes)', () => {
    const root = parseHtml('<div>text<p>a</p>more<span>b</span></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const children = getChildren(div)
      expect(children).toHaveLength(2)
      expect(children[0]!.nodeName).toBe('P')
      expect(children[1]!.nodeName).toBe('SPAN')
    }
  })

  it('returns empty array for element with only text', () => {
    const root = parseHtml('<p>just text</p>')
    const p = root.childNodes[0]!
    if (p.nodeType === 1) {
      expect(getChildren(p)).toHaveLength(0)
    }
  })
})

describe('getLastElementChild', () => {
  it('returns last element child', () => {
    const root = parseHtml('<div><p>a</p><span>b</span></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const last = getLastElementChild(div)
      expect(last).not.toBeNull()
      expect(last!.nodeName).toBe('SPAN')
    }
  })

  it('returns null for empty element', () => {
    const el = makeElement('div')
    expect(getLastElementChild(el)).toBeNull()
  })

  it('returns null when only text children exist', () => {
    const root = parseHtml('<p>text only</p>')
    const p = root.childNodes[0]!
    if (p.nodeType === 1) {
      expect(getLastElementChild(p)).toBeNull()
    }
  })
})

describe('getElementsByTagName', () => {
  it('finds direct children by tag name', () => {
    const root = parseHtml('<div><p>a</p><p>b</p><span>c</span></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const ps = getElementsByTagName(div, 'p')
      expect(ps).toHaveLength(2)
    }
  })

  it('finds deeply nested elements', () => {
    const root = parseHtml('<div><section><p>deep</p></section></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const ps = getElementsByTagName(div, 'p')
      expect(ps).toHaveLength(1)
      expect(getTextContent(ps[0]!)).toBe('deep')
    }
  })

  it('is case-insensitive', () => {
    const root = parseHtml('<div><P>a</P></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      expect(getElementsByTagName(div, 'p')).toHaveLength(1)
      expect(getElementsByTagName(div, 'P')).toHaveLength(1)
    }
  })

  it('returns empty array when no matches', () => {
    const root = parseHtml('<div><p>a</p></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      expect(getElementsByTagName(div, 'span')).toHaveLength(0)
    }
  })
})

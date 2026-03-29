import { describe, it, expect } from 'vite-plus/test'

import { getTextContent } from './dom.ts'
import { parseHtml } from './parser.ts'
import { collapseWhitespace, augmentNode } from './preprocess.ts'

describe('collapseWhitespace', () => {
  it('collapses multiple spaces into one', () => {
    const root = parseHtml('<p>hello    world</p>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('hello world')
  })

  it('collapses tabs and newlines into spaces', () => {
    const root = parseHtml('<p>hello\n\t\tworld</p>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('hello world')
  })

  it('removes leading whitespace', () => {
    const root = parseHtml('<p>  hello</p>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('hello')
  })

  it('removes trailing whitespace', () => {
    const root = parseHtml('<p>hello  </p>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('hello')
  })

  it('preserves whitespace inside pre', () => {
    const root = parseHtml('<pre>  hello  \n  world  </pre>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('  hello  \n  world  ')
  })

  it('preserves whitespace inside code when preformattedCode is true', () => {
    const root = parseHtml('<code>  spaced  </code>')
    collapseWhitespace(root, true)
    expect(getTextContent(root)).toBe('  spaced  ')
  })

  it('collapses whitespace inside code when preformattedCode is false', () => {
    const root = parseHtml('<code>  spaced  </code>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('spaced')
  })

  it('does nothing for empty elements', () => {
    const root = parseHtml('<div></div>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('')
  })

  it('removes whitespace-only text nodes between block elements', () => {
    const root = parseHtml('<div>\n  <p>a</p>\n  <p>b</p>\n</div>')
    collapseWhitespace(root, false)
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const texts = div.childNodes
        .filter((n) => n.nodeType === 3)
        .map((n) => (n.nodeType === 3 ? n.data : ''))
      for (const t of texts) {
        expect(t.trim()).toBe('')
      }
    }
  })

  it('collapses whitespace between inline elements', () => {
    const root = parseHtml('<p><em>a</em>   <strong>b</strong></p>')
    collapseWhitespace(root, false)
    expect(getTextContent(root)).toBe('a b')
  })
})

describe('augmentNode', () => {
  it('marks block element as isBlock', () => {
    const root = parseHtml('<div>text</div>')
    const div = root.childNodes[0]!
    const augmented = augmentNode(div, { preformattedCode: false })
    expect(augmented.isBlock).toBe(true)
  })

  it('marks inline element as not isBlock', () => {
    const root = parseHtml('<span>text</span>')
    const span = root.childNodes[0]!
    const augmented = augmentNode(span, { preformattedCode: false })
    expect(augmented.isBlock).toBe(false)
  })

  it('marks text node as not isBlock', () => {
    const root = parseHtml('text')
    const text = root.childNodes[0]!
    const augmented = augmentNode(text, { preformattedCode: false })
    expect(augmented.isBlock).toBe(false)
  })

  it('detects blank element', () => {
    const root = parseHtml('<div>   </div>')
    const div = root.childNodes[0]!
    const augmented = augmentNode(div, { preformattedCode: false })
    expect(augmented.isBlank).toBe(true)
  })

  it('detects non-blank element', () => {
    const root = parseHtml('<div>text</div>')
    const div = root.childNodes[0]!
    const augmented = augmentNode(div, { preformattedCode: false })
    expect(augmented.isBlank).toBe(false)
  })

  it('meaningful-when-blank elements are not blank even when empty', () => {
    const root = parseHtml('<a href="url"></a>')
    const a = root.childNodes[0]!
    const augmented = augmentNode(a, { preformattedCode: false })
    expect(augmented.isBlank).toBe(false)
  })

  it('void elements are not blank', () => {
    const root = parseHtml('<div><img src="a.png"></div>')
    collapseWhitespace(root, false)
    const div = root.childNodes[0]!
    const augmented = augmentNode(div, { preformattedCode: false })
    expect(augmented.isBlank).toBe(false)
  })

  it('detects code context', () => {
    const root = parseHtml('<code><em>text</em></code>')
    const code = root.childNodes[0]!
    if (code.nodeType === 1) {
      const em = code.childNodes[0]!
      const augmented = augmentNode(em, { preformattedCode: false })
      expect(augmented.isCode).toBe(true)
    }
  })

  it('non-code context is not isCode', () => {
    const root = parseHtml('<div><em>text</em></div>')
    const div = root.childNodes[0]!
    if (div.nodeType === 1) {
      const em = div.childNodes[0]!
      const augmented = augmentNode(em, { preformattedCode: false })
      expect(augmented.isCode).toBe(false)
    }
  })

  it('block elements have empty flanking whitespace', () => {
    const root = parseHtml('<div>text</div>')
    const div = root.childNodes[0]!
    const augmented = augmentNode(div, { preformattedCode: false })
    expect(augmented.flankingWhitespace).toStrictEqual({ leading: '', trailing: '' })
  })
})

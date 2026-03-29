import { describe, it, expect } from 'vite-plus/test'

import { getTextContent, getAttribute } from './dom.ts'
import { parseHtml } from './parser.ts'

describe('parseHtml', () => {
  describe('basic structure', () => {
    it('returns root element for empty string', () => {
      const root = parseHtml('')
      expect(root.nodeName).toBe('X-TURNDOWN')
      expect(root.childNodes).toHaveLength(0)
    })

    it('parses plain text as text node', () => {
      const root = parseHtml('hello')
      expect(root.childNodes).toHaveLength(1)
      expect(root.childNodes[0]!.nodeType).toBe(3)
      expect(getTextContent(root)).toBe('hello')
    })

    it('parses single element', () => {
      const root = parseHtml('<p>text</p>')
      const p = root.childNodes[0]!
      expect(p.nodeType).toBe(1)
      expect(p.nodeName).toBe('P')
      expect(getTextContent(p)).toBe('text')
    })

    it('parses nested elements', () => {
      const root = parseHtml('<div><p>inner</p></div>')
      const div = root.childNodes[0]!
      expect(div.nodeName).toBe('DIV')
      expect(div.nodeType).toBe(1)
      if (div.nodeType === 1) {
        const p = div.childNodes[0]!
        expect(p.nodeName).toBe('P')
        expect(getTextContent(p)).toBe('inner')
      }
    })

    it('parses multiple sibling elements', () => {
      const root = parseHtml('<p>one</p><p>two</p>')
      expect(root.childNodes).toHaveLength(2)
      expect(getTextContent(root.childNodes[0]!)).toBe('one')
      expect(getTextContent(root.childNodes[1]!)).toBe('two')
    })
  })

  describe('sibling links', () => {
    it('sets previousSibling and nextSibling', () => {
      const root = parseHtml('<p>a</p><p>b</p><p>c</p>')
      const [a, b, c] = root.childNodes
      expect(a!.previousSibling).toBeNull()
      expect(a!.nextSibling).toBe(b)
      expect(b!.previousSibling).toBe(a)
      expect(b!.nextSibling).toBe(c)
      expect(c!.previousSibling).toBe(b)
      expect(c!.nextSibling).toBeNull()
    })

    it('sets parentNode', () => {
      const root = parseHtml('<div><span>x</span></div>')
      const div = root.childNodes[0]!
      expect(div.parentNode).toBe(root)
      if (div.nodeType === 1) {
        expect(div.childNodes[0]!.parentNode).toBe(div)
      }
    })
  })

  describe('attributes', () => {
    it('parses double-quoted attributes', () => {
      const root = parseHtml('<a href="https://example.com">link</a>')
      const a = root.childNodes[0]!
      expect(a.nodeType).toBe(1)
      if (a.nodeType === 1) {
        expect(getAttribute(a, 'href')).toBe('https://example.com')
      }
    })

    it('parses single-quoted attributes', () => {
      const root = parseHtml("<a href='url'>link</a>")
      const a = root.childNodes[0]!
      if (a.nodeType === 1) {
        expect(getAttribute(a, 'href')).toBe('url')
      }
    })

    it('parses unquoted attributes', () => {
      const root = parseHtml('<div id=main>text</div>')
      const div = root.childNodes[0]!
      if (div.nodeType === 1) {
        expect(getAttribute(div, 'id')).toBe('main')
      }
    })

    it('parses boolean attributes (no value)', () => {
      const root = parseHtml('<input disabled>')
      const input = root.childNodes[0]!
      if (input.nodeType === 1) {
        expect(getAttribute(input, 'disabled')).toBe('')
      }
    })

    it('parses multiple attributes', () => {
      const root = parseHtml('<a href="url" title="tip" class="link">x</a>')
      const a = root.childNodes[0]!
      if (a.nodeType === 1) {
        expect(getAttribute(a, 'href')).toBe('url')
        expect(getAttribute(a, 'title')).toBe('tip')
        expect(getAttribute(a, 'class')).toBe('link')
      }
    })

    it('lowercases attribute names', () => {
      const root = parseHtml('<div DATA-ID="1">x</div>')
      const div = root.childNodes[0]!
      if (div.nodeType === 1) {
        expect(getAttribute(div, 'data-id')).toBe('1')
      }
    })

    it('decodes entities in attribute values', () => {
      const root = parseHtml('<a href="a&amp;b">x</a>')
      const a = root.childNodes[0]!
      if (a.nodeType === 1) {
        expect(getAttribute(a, 'href')).toBe('a&b')
      }
    })
  })

  describe('void elements', () => {
    it('parses br as self-closing', () => {
      const root = parseHtml('a<br>b')
      expect(root.childNodes).toHaveLength(3)
      expect(root.childNodes[1]!.nodeName).toBe('BR')
    })

    it('parses hr as self-closing', () => {
      const root = parseHtml('<hr>')
      expect(root.childNodes).toHaveLength(1)
      expect(root.childNodes[0]!.nodeName).toBe('HR')
    })

    it('parses img as self-closing', () => {
      const root = parseHtml('<img src="a.png" alt="test">')
      const img = root.childNodes[0]!
      expect(img.nodeName).toBe('IMG')
      if (img.nodeType === 1) {
        expect(getAttribute(img, 'src')).toBe('a.png')
        expect(getAttribute(img, 'alt')).toBe('test')
        expect(img.childNodes).toHaveLength(0)
      }
    })

    it('parses self-closing syntax />', () => {
      const root = parseHtml('<br/>')
      expect(root.childNodes[0]!.nodeName).toBe('BR')
    })
  })

  describe('comments and special tags', () => {
    it('skips HTML comments', () => {
      const root = parseHtml('a<!-- comment -->b')
      expect(getTextContent(root)).toBe('ab')
    })

    it('skips doctype', () => {
      const root = parseHtml('<!DOCTYPE html><p>text</p>')
      expect(root.childNodes).toHaveLength(1)
      expect(root.childNodes[0]!.nodeName).toBe('P')
    })

    it('skips processing instructions', () => {
      const root = parseHtml('<?xml version="1.0"?><p>text</p>')
      expect(root.childNodes).toHaveLength(1)
    })
  })

  describe('raw text elements', () => {
    it('preserves script content as text', () => {
      const root = parseHtml('<script>var x = 1;</script>')
      const script = root.childNodes[0]!
      expect(script.nodeName).toBe('SCRIPT')
      if (script.nodeType === 1) {
        expect(getTextContent(script)).toBe('var x = 1;')
      }
    })

    it('preserves style content as text', () => {
      const root = parseHtml('<style>body { color: red; }</style>')
      const style = root.childNodes[0]!
      expect(style.nodeName).toBe('STYLE')
      if (style.nodeType === 1) {
        expect(getTextContent(style)).toBe('body { color: red; }')
      }
    })

    it('does not parse HTML inside script', () => {
      const root = parseHtml('<script><div>not parsed</div></script>')
      const script = root.childNodes[0]!
      if (script.nodeType === 1) {
        expect(script.childNodes).toHaveLength(1)
        expect(script.childNodes[0]!.nodeType).toBe(3)
      }
    })
  })

  describe('closing tag matching', () => {
    it('handles mismatched close tags gracefully', () => {
      const root = parseHtml('<div><p>text</div>')
      expect(getTextContent(root)).toBe('text')
    })

    it('handles unclosed tags', () => {
      const root = parseHtml('<p>text')
      expect(getTextContent(root)).toBe('text')
    })
  })

  describe('text node merging', () => {
    it('merges adjacent text nodes', () => {
      const root = parseHtml('hello world')
      expect(root.childNodes).toHaveLength(1)
      expect(root.childNodes[0]!.nodeType).toBe(3)
    })
  })

  describe('entity decoding in text', () => {
    it('decodes entities in text content', () => {
      const root = parseHtml('&lt;div&gt;')
      expect(getTextContent(root)).toBe('<div>')
    })

    it('decodes numeric entities', () => {
      const root = parseHtml('&#65;&#66;')
      expect(getTextContent(root)).toBe('AB')
    })
  })

  describe('uppercases tag names', () => {
    it('normalizes tag names to uppercase', () => {
      const root = parseHtml('<Div><SPAN>x</SPAN></Div>')
      const div = root.childNodes[0]!
      expect(div.nodeName).toBe('DIV')
      if (div.nodeType === 1) {
        expect(div.childNodes[0]!.nodeName).toBe('SPAN')
      }
    })
  })
})

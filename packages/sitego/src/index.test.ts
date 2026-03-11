import { describe, it, expect } from 'vitest'

import { htmlToMarkdown } from './core/converter.ts'

describe('htmlToMarkdown', () => {
  describe('edge cases', () => {
    it('converts empty string', () => {
      expect(htmlToMarkdown('')).toBe('')
    })

    it('converts plain text', () => {
      expect(htmlToMarkdown('Hello world')).toBe('Hello world')
    })

    it('returns empty for blank div', () => {
      expect(htmlToMarkdown('<div>   </div>')).toBe('')
    })
  })

  describe('paragraphs', () => {
    it('converts single paragraph', () => {
      expect(htmlToMarkdown('<p>Hello</p>')).toBe('Hello')
    })

    it('converts multiple paragraphs', () => {
      expect(htmlToMarkdown('<p>Hello</p><p>World</p>')).toBe('Hello\n\nWorld')
    })
  })

  describe('headings', () => {
    it('converts h1-h6 (atx style)', () => {
      expect(htmlToMarkdown('<h1>H1</h1>')).toBe('# H1')
      expect(htmlToMarkdown('<h2>H2</h2>')).toBe('## H2')
      expect(htmlToMarkdown('<h3>H3</h3>')).toBe('### H3')
      expect(htmlToMarkdown('<h4>H4</h4>')).toBe('#### H4')
      expect(htmlToMarkdown('<h5>H5</h5>')).toBe('##### H5')
      expect(htmlToMarkdown('<h6>H6</h6>')).toBe('###### H6')
    })

    it('converts h1 (setext style)', () => {
      expect(htmlToMarkdown('<h1>Title</h1>', { headingStyle: 'setext' })).toBe('Title\n=====')
    })

    it('converts h2 (setext style)', () => {
      expect(htmlToMarkdown('<h2>Subtitle</h2>', { headingStyle: 'setext' })).toBe(
        'Subtitle\n--------',
      )
    })

    it('falls back to atx for h3+ in setext mode', () => {
      expect(htmlToMarkdown('<h3>H3</h3>', { headingStyle: 'setext' })).toBe('### H3')
    })
  })

  describe('inline formatting', () => {
    it('converts strong', () => {
      expect(htmlToMarkdown('<strong>bold</strong>')).toBe('**bold**')
    })

    it('converts b', () => {
      expect(htmlToMarkdown('<b>bold</b>')).toBe('**bold**')
    })

    it('converts strong with __ delimiter', () => {
      expect(htmlToMarkdown('<strong>bold</strong>', { strongDelimiter: '__' })).toBe('__bold__')
    })

    it('converts em', () => {
      expect(htmlToMarkdown('<em>italic</em>')).toBe('_italic_')
    })

    it('converts i', () => {
      expect(htmlToMarkdown('<i>italic</i>')).toBe('_italic_')
    })

    it('converts em with * delimiter', () => {
      expect(htmlToMarkdown('<em>italic</em>', { emDelimiter: '*' })).toBe('*italic*')
    })

    it('returns empty for blank strong', () => {
      expect(htmlToMarkdown('<p>a<strong>  </strong>b</p>')).toBe('ab')
    })

    it('returns empty for blank em', () => {
      expect(htmlToMarkdown('<p>a<em>  </em>b</p>')).toBe('ab')
    })

    it('converts nested bold and italic', () => {
      expect(htmlToMarkdown('<p>This is <strong>bold and <em>italic</em></strong> text</p>')).toBe(
        'This is **bold and _italic_** text',
      )
    })
  })

  describe('inline code', () => {
    it('converts code', () => {
      expect(htmlToMarkdown('<code>foo</code>')).toBe('`foo`')
    })

    it('handles backtick in code', () => {
      expect(htmlToMarkdown('<code>a`b</code>')).toBe('``a`b``')
    })
  })

  describe('code blocks', () => {
    it('converts fenced code block', () => {
      expect(htmlToMarkdown('<pre><code>const x = 1</code></pre>')).toBe('```\nconst x = 1\n```')
    })

    it('converts fenced code block with language', () => {
      expect(htmlToMarkdown('<pre><code class="language-js">const x = 1</code></pre>')).toBe(
        '```js\nconst x = 1\n```',
      )
    })

    it('converts indented code block', () => {
      expect(
        htmlToMarkdown('<pre><code>const x = 1</code></pre>', { codeBlockStyle: 'indented' }),
      ).toBe('    const x = 1')
    })

    it('converts fenced code block with tilde fence', () => {
      expect(htmlToMarkdown('<pre><code>code</code></pre>', { fence: '~~~' })).toBe(
        '~~~\ncode\n~~~',
      )
    })

    it('increases fence length when content contains backticks', () => {
      expect(htmlToMarkdown('<pre><code>```\ncode\n```</code></pre>')).toBe(
        '````\n```\ncode\n```\n````',
      )
    })
  })

  describe('links', () => {
    it('converts inlined link', () => {
      expect(htmlToMarkdown('<a href="https://example.com">Link</a>')).toBe(
        '[Link](https://example.com)',
      )
    })

    it('converts link with title', () => {
      expect(htmlToMarkdown('<a href="https://example.com" title="Example">Link</a>')).toBe(
        '[Link](https://example.com "Example")',
      )
    })

    it('escapes parentheses in URL', () => {
      expect(htmlToMarkdown('<a href="https://en.wikipedia.org/wiki/Foo_(bar)">Link</a>')).toBe(
        '[Link](https://en.wikipedia.org/wiki/Foo_\\(bar\\))',
      )
    })

    it('converts referenced link (full style)', () => {
      expect(
        htmlToMarkdown('<a href="https://example.com">Link</a>', {
          linkStyle: 'referenced',
          linkReferenceStyle: 'full',
        }),
      ).toBe('[Link][1]\n\n[1]: https://example.com')
    })

    it('converts referenced link (collapsed style)', () => {
      expect(
        htmlToMarkdown('<a href="https://example.com">Link</a>', {
          linkStyle: 'referenced',
          linkReferenceStyle: 'collapsed',
        }),
      ).toBe('[Link][]\n\n[Link]: https://example.com')
    })

    it('converts referenced link (shortcut style)', () => {
      expect(
        htmlToMarkdown('<a href="https://example.com">Link</a>', {
          linkStyle: 'referenced',
          linkReferenceStyle: 'shortcut',
        }),
      ).toBe('[Link]\n\n[Link]: https://example.com')
    })

    it('converts multiple referenced links', () => {
      expect(
        htmlToMarkdown('<p><a href="url1">A</a> and <a href="url2">B</a></p>', {
          linkStyle: 'referenced',
          linkReferenceStyle: 'full',
        }),
      ).toBe('[A][1] and [B][2]\n\n[1]: url1\n[2]: url2')
    })
  })

  describe('images', () => {
    it('converts image', () => {
      expect(htmlToMarkdown('<img src="img.png" alt="Alt text">')).toBe('![Alt text](img.png)')
    })

    it('converts image with title', () => {
      expect(htmlToMarkdown('<img src="img.png" alt="Alt" title="Title">')).toBe(
        '![Alt](img.png "Title")',
      )
    })

    it('returns empty for image without src', () => {
      expect(htmlToMarkdown('<img alt="alt">')).toBe('')
    })
  })

  describe('lists', () => {
    it('converts unordered list', () => {
      expect(htmlToMarkdown('<ul><li>One</li><li>Two</li><li>Three</li></ul>')).toBe(
        '*   One\n*   Two\n*   Three',
      )
    })

    it('converts unordered list with - bullet', () => {
      expect(htmlToMarkdown('<ul><li>a</li><li>b</li></ul>', { bulletListMarker: '-' })).toBe(
        '-   a\n-   b',
      )
    })

    it('converts ordered list', () => {
      expect(htmlToMarkdown('<ol><li>One</li><li>Two</li><li>Three</li></ol>')).toBe(
        '1.  One\n2.  Two\n3.  Three',
      )
    })

    it('converts ordered list with start attribute', () => {
      expect(htmlToMarkdown('<ol start="5"><li>a</li><li>b</li></ol>')).toBe('5.  a\n6.  b')
    })

    it('converts nested list', () => {
      expect(htmlToMarkdown('<ul><li>One<ul><li>Nested</li></ul></li><li>Two</li></ul>')).toBe(
        '*   One\n    *   Nested\n*   Two',
      )
    })
  })

  describe('blockquotes', () => {
    it('converts blockquote', () => {
      expect(htmlToMarkdown('<blockquote>Quote</blockquote>')).toBe('> Quote')
    })

    it('converts nested blockquote', () => {
      expect(htmlToMarkdown('<blockquote><blockquote>deep</blockquote></blockquote>')).toBe(
        '> > deep',
      )
    })
  })

  describe('horizontal rule', () => {
    it('converts hr', () => {
      expect(htmlToMarkdown('<hr>')).toBe('* * *')
    })
  })

  describe('line breaks', () => {
    it('converts br', () => {
      expect(htmlToMarkdown('Line one<br>Line two')).toBe('Line one  \nLine two')
    })
  })

  describe('stripping elements', () => {
    it('strips script tags', () => {
      expect(htmlToMarkdown('<p>Hello</p><script>alert(1)</script><p>World</p>')).toBe(
        'Hello\n\nWorld',
      )
    })

    it('strips style tags', () => {
      expect(htmlToMarkdown('<p>a</p><style>.x{}</style><p>b</p>')).toBe('a\n\nb')
    })

    it('strips noscript tags', () => {
      expect(htmlToMarkdown('<p>a</p><noscript>no</noscript><p>b</p>')).toBe('a\n\nb')
    })
  })

  describe('entities', () => {
    it('decodes HTML entities', () => {
      expect(htmlToMarkdown('&amp; &lt; &gt; &quot;')).toBe('& < > "')
    })
  })

  describe('escaping', () => {
    it('escapes markdown special characters', () => {
      expect(htmlToMarkdown('<p>Price: $10 * 2 = $20</p>')).toBe('Price: $10 \\* 2 = $20')
    })
  })
})

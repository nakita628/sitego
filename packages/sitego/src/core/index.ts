import {
  cleanAttribute,
  decodeEntities,
  escapeMarkdown,
  trimLeadingNewlines,
  trimNewlines,
  trimTrailingNewlines,
} from '../utils/index.ts'

export function htmlToMarkdown(
  html: string,
  userOptions?: Partial<{
    readonly headingStyle: 'setext' | 'atx'
    readonly hr: string
    readonly bulletListMarker: '*' | '-' | '+'
    readonly codeBlockStyle: 'indented' | 'fenced'
    readonly fence: '```' | '~~~'
    readonly emDelimiter: '_' | '*'
    readonly strongDelimiter: '**' | '__'
    readonly linkStyle: 'inlined' | 'referenced'
    readonly linkReferenceStyle: 'full' | 'collapsed' | 'shortcut'
    readonly br: string
    readonly preformattedCode: boolean
  }>,
) {
  if (!html) return ''

  type HtmlTextNode = {
    readonly nodeType: 3
    readonly nodeName: '#text'
    data: string
    parentNode: HtmlElementNode | null
    nextSibling: HtmlNode | null
    previousSibling: HtmlNode | null
  }
  type HtmlElementNode = {
    readonly nodeType: 1
    readonly nodeName: string
    readonly attributes: Map<string, string>
    readonly childNodes: HtmlNode[]
    parentNode: HtmlElementNode | null
    nextSibling: HtmlNode | null
    previousSibling: HtmlNode | null
  }
  type HtmlNode = HtmlTextNode | HtmlElementNode
  type AugmentedNode = HtmlNode & {
    readonly isBlock: boolean
    readonly isCode: boolean
    readonly isBlank: boolean
    readonly flankingWhitespace: { readonly leading: string; readonly trailing: string }
  }

  const options = {
    headingStyle: 'atx',
    hr: '* * *',
    bulletListMarker: '*',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full',
    br: '  ',
    preformattedCode: false,
    ...userOptions,
  } as const

  const BLOCK_ELEMENTS: ReadonlySet<string> = new Set([
    'ADDRESS',
    'ARTICLE',
    'ASIDE',
    'AUDIO',
    'BLOCKQUOTE',
    'BODY',
    'CANVAS',
    'CENTER',
    'DD',
    'DIR',
    'DIV',
    'DL',
    'DT',
    'FIELDSET',
    'FIGCAPTION',
    'FIGURE',
    'FOOTER',
    'FORM',
    'FRAMESET',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'HEADER',
    'HGROUP',
    'HR',
    'HTML',
    'ISINDEX',
    'LI',
    'MAIN',
    'MENU',
    'NAV',
    'NOFRAMES',
    'NOSCRIPT',
    'OL',
    'OUTPUT',
    'P',
    'PRE',
    'SECTION',
    'TABLE',
    'TBODY',
    'TD',
    'TFOOT',
    'TH',
    'THEAD',
    'TR',
    'UL',
  ])
  const VOID_ELEMENTS: ReadonlySet<string> = new Set([
    'AREA',
    'BASE',
    'BR',
    'COL',
    'COMMAND',
    'EMBED',
    'HR',
    'IMG',
    'INPUT',
    'KEYGEN',
    'LINK',
    'META',
    'PARAM',
    'SOURCE',
    'TRACK',
    'WBR',
  ])
  const MEANINGFUL_WHEN_BLANK: ReadonlySet<string> = new Set([
    'A',
    'TABLE',
    'THEAD',
    'TBODY',
    'TFOOT',
    'TH',
    'TD',
    'IFRAME',
    'SCRIPT',
    'AUDIO',
    'VIDEO',
  ])
  const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['SCRIPT', 'STYLE'])
  const REMOVE_ELEMENTS: ReadonlySet<string> = new Set([...RAW_TEXT_ELEMENTS, 'NOSCRIPT'])
  const WS = /\s/
  const NOT_ATTR_NAME_END = /[^\s=/>]/
  const NOT_UNQUOTED_VALUE_END = /[^\s>]/

  type ConversionRule = {
    readonly filter: string | readonly string[] | ((node: HtmlElementNode) => boolean)
    readonly replacement: (
      content: string,
      node: AugmentedNode & HtmlElementNode,
      references: string[],
    ) => string
    readonly append?: (references: string[]) => string
  }

  const removeChild = (parent: HtmlElementNode, child: HtmlNode) => {
    const idx = parent.childNodes.indexOf(child)
    if (idx === -1) return
    if (child.previousSibling) child.previousSibling.nextSibling = child.nextSibling
    if (child.nextSibling) child.nextSibling.previousSibling = child.previousSibling
    parent.childNodes.splice(idx, 1)
    child.parentNode = null
    child.previousSibling = null
    child.nextSibling = null
  }

  const getTextContent = (node: HtmlNode): string => {
    if (node.nodeType === 3) return node.data
    return node.childNodes.reduce((acc, c) => acc + getTextContent(c), '')
  }

  const getAttribute = (node: HtmlElementNode, name: string) => node.attributes.get(name) ?? null

  const getFirstChild = (node: HtmlElementNode) => node.childNodes[0] ?? null

  const getChildren = (node: HtmlElementNode) =>
    node.childNodes.filter((c): c is HtmlElementNode => c.nodeType === 1)

  const getLastElementChild = (node: HtmlElementNode) => {
    const children = getChildren(node)
    return children[children.length - 1] ?? null
  }

  const hasDescendant = (
    node: HtmlElementNode,
    predicate: (n: HtmlElementNode) => boolean,
  ): boolean => {
    for (const child of node.childNodes) {
      if (child.nodeType !== 1) continue
      if (predicate(child) || hasDescendant(child, predicate)) return true
    }
    return false
  }

  const createElement = (tagName: string): HtmlElementNode => ({
    nodeType: 1,
    nodeName: tagName.toUpperCase(),
    attributes: new Map(),
    childNodes: [],
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
  })

  const createTextNode = (data: string): HtmlTextNode => ({
    nodeType: 3,
    nodeName: '#text',
    data,
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
  })

  const appendChild = (parent: HtmlElementNode, child: HtmlNode) => {
    const prev = parent.childNodes.at(-1) ?? null
    child.parentNode = parent
    child.previousSibling = prev
    if (prev) prev.nextSibling = child
    parent.childNodes.push(child)
  }

  const skipWhile = (state: { html: string; pos: number }, re: RegExp) => {
    while (state.pos < state.html.length && re.test(state.html.charAt(state.pos))) state.pos++
  }

  const parseAttributesInto = (
    state: { html: string; pos: number },
    attrs: Map<string, string>,
  ) => {
    while (state.pos < state.html.length) {
      skipWhile(state, WS)

      const ch = state.html.charAt(state.pos)
      if (ch === '>') {
        state.pos++
        return
      }
      if (ch === '/' && state.html.charAt(state.pos + 1) === '>') {
        state.pos += 2
        return
      }

      const nameStart = state.pos
      skipWhile(state, NOT_ATTR_NAME_END)
      const name = state.html.slice(nameStart, state.pos).toLowerCase()
      if (!name) {
        state.pos++
        continue
      }

      skipWhile(state, WS)

      if (state.html.charAt(state.pos) !== '=') {
        attrs.set(name, '')
        continue
      }
      state.pos++

      skipWhile(state, WS)

      const quote = state.html.charAt(state.pos)
      if (quote === '"' || quote === "'") {
        state.pos++
        const valueStart = state.pos
        const endQuote = state.html.indexOf(quote, state.pos)
        if (endQuote === -1) {
          attrs.set(name, decodeEntities(state.html.slice(valueStart)))
          state.pos = state.html.length
        } else {
          attrs.set(name, decodeEntities(state.html.slice(valueStart, endQuote)))
          state.pos = endQuote + 1
        }
      } else {
        const valueStart = state.pos
        skipWhile(state, NOT_UNQUOTED_VALUE_END)
        attrs.set(name, decodeEntities(state.html.slice(valueStart, state.pos)))
      }
    }
  }

  const parseOpenTag = (state: { html: string; pos: number }) => {
    const tagNameMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(state.html.slice(state.pos))
    if (!tagNameMatch?.[1]) return null

    const tagName = tagNameMatch[1].toUpperCase()
    const elem = createElement(tagName)
    state.pos += tagNameMatch[0].length

    parseAttributesInto(state, elem.attributes)

    const selfClosing = state.html.charAt(state.pos - 1) === '/' || VOID_ELEMENTS.has(tagName)
    return { element: elem, selfClosing }
  }

  const parseHtml = (input: string) => {
    const root = createElement('X-TURNDOWN')
    root.attributes.set('id', 'turndown-root')
    const stack: HtmlElementNode[] = [root]
    const state = { html: input, pos: 0 }

    while (state.pos < state.html.length) {
      const current = stack[stack.length - 1]

      if (state.html.charAt(state.pos) === '<') {
        if (state.html.startsWith('<!--', state.pos)) {
          const endIdx = state.html.indexOf('-->', state.pos + 4)
          state.pos = endIdx === -1 ? state.html.length : endIdx + 3
          continue
        }

        if (state.html.startsWith('<!', state.pos) || state.html.startsWith('<?', state.pos)) {
          const endIdx = state.html.indexOf('>', state.pos + 2)
          state.pos = endIdx === -1 ? state.html.length : endIdx + 1
          continue
        }

        if (state.html.startsWith('</', state.pos)) {
          const closeEnd = state.html.indexOf('>', state.pos + 2)
          if (closeEnd !== -1) {
            const tagName = state.html
              .slice(state.pos + 2, closeEnd)
              .trim()
              .toUpperCase()
            const idx = stack.findLastIndex((n, i) => i > 0 && n.nodeName === tagName)
            if (idx !== -1) stack.length = idx
            state.pos = closeEnd + 1
            continue
          }
        }

        const tagResult = parseOpenTag(state)
        if (tagResult && current) {
          appendChild(current, tagResult.element)

          if (!tagResult.selfClosing && !VOID_ELEMENTS.has(tagResult.element.nodeName)) {
            stack.push(tagResult.element)

            if (RAW_TEXT_ELEMENTS.has(tagResult.element.nodeName)) {
              const closeTag = `</${tagResult.element.nodeName.toLowerCase()}>`
              const closeIdx = state.html.toLowerCase().indexOf(closeTag, state.pos)
              if (closeIdx !== -1) {
                const rawText = state.html.slice(state.pos, closeIdx)
                if (rawText) appendChild(tagResult.element, createTextNode(rawText))
                state.pos = closeIdx + closeTag.length
                stack.pop()
              }
            }
          }
          continue
        }
      }

      const nextTag = state.html.indexOf('<', state.pos)
      const end = nextTag === -1 ? state.html.length : nextTag
      const text = decodeEntities(state.html.slice(state.pos, end))
      if (text && current) {
        const lastChild = current.childNodes.at(-1)
        if (lastChild && lastChild.nodeType === 3) {
          lastChild.data += text
        } else {
          appendChild(current, createTextNode(text))
        }
      }
      state.pos = end
    }

    return root
  }

  const isPre: (n: HtmlNode) => boolean = options.preformattedCode
    ? (n) => n.nodeName === 'PRE' || n.nodeName === 'CODE'
    : (n) => n.nodeName === 'PRE'

  const nextTraversalNode = (prev: HtmlNode | null, current: HtmlNode) => {
    if ((prev && prev.parentNode === current) || isPre(current)) {
      return current.nextSibling ?? current.parentNode
    }
    if (current.nodeType === 1) {
      return current.childNodes[0] ?? current.nextSibling ?? current.parentNode
    }
    return current.nextSibling ?? current.parentNode
  }

  const collapseWhitespace = (element: HtmlElementNode) => {
    if (element.childNodes.length === 0 || isPre(element)) return

    let prevText: HtmlTextNode | null = null
    let keepLeadingWs = false
    let prev: HtmlNode | null = null
    let node: HtmlNode | null = nextTraversalNode(prev, element)

    while (node && node !== element) {
      if (node.nodeType === 3) {
        const text = node.data.replace(/[ \r\n\t]+/g, ' ')
        const trimmedText =
          (!prevText || prevText.data.endsWith(' ')) && !keepLeadingWs && text[0] === ' '
            ? text.slice(1)
            : text

        if (!trimmedText) {
          const next = node.nextSibling ?? node.parentNode
          if (node.parentNode) removeChild(node.parentNode, node)
          node = next
          continue
        }

        node.data = trimmedText
        prevText = node
      } else if (node.nodeType === 1) {
        if (BLOCK_ELEMENTS.has(node.nodeName) || node.nodeName === 'BR') {
          if (prevText) prevText.data = prevText.data.replace(/ $/, '')
          prevText = null
          keepLeadingWs = false
        } else if (VOID_ELEMENTS.has(node.nodeName) || isPre(node)) {
          prevText = null
          keepLeadingWs = true
        } else if (prevText) {
          keepLeadingWs = false
        }
      }

      const nextNode = nextTraversalNode(prev, node)
      prev = node
      node = nextNode
    }

    if (prevText) {
      prevText.data = prevText.data.replace(/ $/, '')
      if (!prevText.data && prevText.parentNode) removeChild(prevText.parentNode, prevText)
    }
  }

  const isCodeContext = (node: HtmlNode): boolean =>
    node.nodeName === 'CODE' || (node.parentNode !== null && isCodeContext(node.parentNode))

  const isFlankedByWhitespace = (side: 'left' | 'right', node: HtmlNode) => {
    const sibling = side === 'left' ? node.previousSibling : node.nextSibling
    const regExp = side === 'left' ? / $/ : /^ /
    if (!sibling) return false
    if (sibling.nodeType === 3) return regExp.test(sibling.data)
    if (options.preformattedCode && sibling.nodeName === 'CODE') return false
    if (sibling.nodeType === 1 && !BLOCK_ELEMENTS.has(sibling.nodeName)) {
      return regExp.test(getTextContent(sibling))
    }
    return false
  }

  const computeFlankingWhitespace = (node: HtmlNode) => {
    const m = getTextContent(node).match(
      /^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/,
    )
    if (!m) return { leading: '', trailing: '' }

    const leadingAscii = m[2] ?? ''
    const leadingNonAscii = m[3] ?? ''
    const trailingAscii = m[6] ?? ''
    const trailingNonAscii = m[5] ?? ''

    const flankedLeft = isFlankedByWhitespace('left', node)
    const flankedRight = isFlankedByWhitespace('right', node)

    return {
      leading: leadingAscii && flankedLeft ? leadingNonAscii : (m[1] ?? ''),
      trailing: trailingAscii && flankedRight ? trailingNonAscii : (m[4] ?? ''),
    }
  }

  const augmentNode = (node: HtmlNode): AugmentedNode => {
    const nodeIsBlock = node.nodeType === 1 && BLOCK_ELEMENTS.has(node.nodeName)
    const nodeIsCode = isCodeContext(node)
    const nodeIsBlank =
      node.nodeType === 1 &&
      !VOID_ELEMENTS.has(node.nodeName) &&
      !MEANINGFUL_WHEN_BLANK.has(node.nodeName) &&
      /^\s*$/.test(getTextContent(node)) &&
      !hasDescendant(
        node,
        (n) => VOID_ELEMENTS.has(n.nodeName) || MEANINGFUL_WHEN_BLANK.has(n.nodeName),
      )

    const flankingWhitespace =
      nodeIsBlock || (options.preformattedCode && nodeIsCode)
        ? { leading: '', trailing: '' }
        : computeFlankingWhitespace(node)

    return Object.assign(node, {
      isBlock: nodeIsBlock,
      isCode: nodeIsCode,
      isBlank: nodeIsBlank,
      flankingWhitespace,
    })
  }

  const olItemPrefix = (parent: HtmlElementNode | null, node: HtmlElementNode) => {
    if (!parent || parent.nodeName !== 'OL') return null
    const start = getAttribute(parent, 'start')
    const index = getChildren(parent).indexOf(node)
    return `${start ? Number(start) + index : index + 1}.  `
  }

  const COMMONMARK_RULES: readonly ConversionRule[] = [
    {
      filter: 'p',
      replacement: (content) => `\n\n${content}\n\n`,
    },
    {
      filter: 'br',
      replacement: () => `${options.br}\n`,
    },
    {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      replacement: (content, node) => {
        const hLevel = Number(node.nodeName.charAt(1))
        if (options.headingStyle === 'setext' && hLevel < 3) {
          const underline = (hLevel === 1 ? '=' : '-').repeat(content.length)
          return `\n\n${content}\n${underline}\n\n`
        }
        return `\n\n${'#'.repeat(hLevel)} ${content}\n\n`
      },
    },
    {
      filter: 'blockquote',
      replacement: (content) => `\n\n${trimNewlines(content).replace(/^/gm, '> ')}\n\n`,
    },
    {
      filter: ['ul', 'ol'],
      replacement: (content, node) => {
        const parent = node.parentNode
        if (parent && parent.nodeName === 'LI' && getLastElementChild(parent) === node) {
          return `\n${content}`
        }
        return `\n\n${content}\n\n`
      },
    },
    {
      filter: 'li',
      replacement: (content, node) => {
        const parent = node.parentNode
        const prefix = olItemPrefix(parent, node) ?? `${options.bulletListMarker}   `

        const isParagraph = content.endsWith('\n')
        const trimmed = trimNewlines(content) + (isParagraph ? '\n' : '')
        const indented = trimmed.replace(/\n/gm, `\n${' '.repeat(prefix.length)}`)
        return `${prefix}${indented}${node.nextSibling ? '\n' : ''}`
      },
    },
    {
      filter: (node) =>
        options.codeBlockStyle === 'indented' &&
        node.nodeName === 'PRE' &&
        getFirstChild(node) !== null &&
        getFirstChild(node)!.nodeName === 'CODE',
      replacement: (_content, node) => {
        const first = getFirstChild(node)
        if (!first) return ''
        return `\n\n    ${getTextContent(first).replace(/\n/g, '\n    ')}\n\n`
      },
    },
    {
      filter: (node) =>
        options.codeBlockStyle === 'fenced' &&
        node.nodeName === 'PRE' &&
        getFirstChild(node) !== null &&
        getFirstChild(node)!.nodeName === 'CODE',
      replacement: (_content, node) => {
        const first = getFirstChild(node)
        if (!first || first.nodeType !== 1) return ''
        const className = getAttribute(first, 'class') ?? ''
        const langMatch = className.match(/language-(\S+)/)
        const language = langMatch ? langMatch[1] : ''
        const code = getTextContent(first)

        const fenceChar = options.fence.charAt(0)
        const fenceInCodeRegex = new RegExp(`^${fenceChar}{3,}`, 'gm')
        const matches = code.match(fenceInCodeRegex)
        const fenceSize = matches
          ? matches.reduce((max, m) => (m.length >= max ? m.length + 1 : max), 3)
          : 3
        const fence = fenceChar.repeat(fenceSize)

        return `\n\n${fence}${language}\n${code.replace(/\n$/, '')}\n${fence}\n\n`
      },
    },
    {
      filter: 'hr',
      replacement: () => `\n\n${options.hr}\n\n`,
    },
    {
      filter: (node) =>
        options.linkStyle === 'inlined' &&
        node.nodeName === 'A' &&
        getAttribute(node, 'href') !== null,
      replacement: (content, node) => {
        const href = (getAttribute(node, 'href') ?? '').replace(/([()])/g, '\\$1')
        const rawTitle = cleanAttribute(getAttribute(node, 'title'))
        const title = rawTitle ? ` "${rawTitle.replace(/"/g, '\\"')}"` : ''
        return `[${content}](${href}${title})`
      },
    },
    {
      filter: (node) =>
        options.linkStyle === 'referenced' &&
        node.nodeName === 'A' &&
        getAttribute(node, 'href') !== null,
      replacement: (content, node, references) => {
        const href = getAttribute(node, 'href') ?? ''
        const rawTitle = cleanAttribute(getAttribute(node, 'title'))
        const title = rawTitle ? ` "${rawTitle}"` : ''

        switch (options.linkReferenceStyle) {
          case 'collapsed':
            references.push(`[${content}]: ${href}${title}`)
            return `[${content}][]`
          case 'shortcut':
            references.push(`[${content}]: ${href}${title}`)
            return `[${content}]`
          default: {
            const id = references.length + 1
            references.push(`[${id}]: ${href}${title}`)
            return `[${content}][${id}]`
          }
        }
      },
      append: (references) => {
        if (references.length === 0) return ''
        const result = `\n\n${references.join('\n')}\n\n`
        references.length = 0
        return result
      },
    },
    {
      filter: ['em', 'i'],
      replacement: (content) =>
        content.trim() ? `${options.emDelimiter}${content}${options.emDelimiter}` : '',
    },
    {
      filter: ['strong', 'b'],
      replacement: (content) =>
        content.trim() ? `${options.strongDelimiter}${content}${options.strongDelimiter}` : '',
    },
    {
      filter: (node) => {
        const hasSiblings = node.previousSibling !== null || node.nextSibling !== null
        const parent = node.parentNode
        return (
          node.nodeName === 'CODE' &&
          !(parent !== null && parent.nodeName === 'PRE' && !hasSiblings)
        )
      },
      replacement: (content) => {
        if (!content) return ''
        const normalized = content.replace(/\r?\n|\r/g, ' ')
        const extraSpace = /^`|^ .*?[^ ].* $|`$/.test(normalized) ? ' ' : ''
        const matches: readonly string[] = normalized.match(/`+/gm) ?? []
        const findDelimiter = (d: string): string =>
          matches.includes(d) ? findDelimiter(`${d}\``) : d
        const delimiter = findDelimiter('`')
        return `${delimiter}${extraSpace}${normalized}${extraSpace}${delimiter}`
      },
    },
    {
      filter: 'img',
      replacement: (_content, node) => {
        const alt = cleanAttribute(getAttribute(node, 'alt'))
        const src = getAttribute(node, 'src') ?? ''
        const title = cleanAttribute(getAttribute(node, 'title'))
        const titlePart = title ? ` "${title}"` : ''
        return src ? `![${alt}](${src}${titlePart})` : ''
      },
    },
  ]

  const findMatchingRule = (node: HtmlElementNode) => {
    const lower = node.nodeName.toLowerCase()
    return COMMONMARK_RULES.find(({ filter }) => {
      if (typeof filter === 'string') return filter === lower
      if (typeof filter === 'function') return filter(node)
      return filter.includes(lower)
    })
  }

  const joinOutput = (output: string, replacement: string) => {
    const s1 = trimTrailingNewlines(output)
    const s2 = trimLeadingNewlines(replacement)
    const nlCount = Math.max(output.length - s1.length, replacement.length - s2.length)
    return `${s1}${'\n\n'.substring(0, nlCount)}${s2}`
  }

  const replacementForElement = (
    node: AugmentedNode & HtmlElementNode,
    references: string[],
  ): string => {
    if (REMOVE_ELEMENTS.has(node.nodeName)) return ''
    if (node.isBlank) return node.isBlock ? '\n\n' : ''

    const rule = findMatchingRule(node)
    const content = processNode(node, references)
    const hasFlanking = node.flankingWhitespace.leading || node.flankingWhitespace.trailing
    const trimmedContent = hasFlanking ? content.trim() : content

    const converted = rule
      ? rule.replacement(trimmedContent, node, references)
      : node.isBlock
        ? `\n\n${trimmedContent}\n\n`
        : trimmedContent

    return `${node.flankingWhitespace.leading}${converted}${node.flankingWhitespace.trailing}`
  }

  const processNode = (parentNode: HtmlElementNode, references: string[]): string =>
    parentNode.childNodes.reduce((output, child) => {
      const node = augmentNode(child)
      if (node.nodeType === 3) {
        return joinOutput(output, node.isCode ? node.data : escapeMarkdown(node.data))
      }
      return joinOutput(output, replacementForElement(node, references))
    }, '')

  const root = parseHtml(html)
  collapseWhitespace(root)
  const references: string[] = []
  const output = processNode(root, references)
  const appended = COMMONMARK_RULES.reduce(
    (acc, rule) => (rule.append ? joinOutput(acc, rule.append(references)) : acc),
    output,
  )
  return appended.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '')
}

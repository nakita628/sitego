import { trimNewlines, cleanAttribute } from '../utils/index.ts'
import type { DEFAULT_OPTIONS } from './converter.ts'
import type { HtmlElementNode } from './dom.ts'
import {
  getAttribute,
  getFirstChild,
  getChildren,
  getLastElementChild,
  getTextContent,
} from './dom.ts'
import type { AugmentedNode } from './preprocess.ts'

type ConversionRule = {
  readonly filter:
    | string
    | readonly string[]
    | ((node: HtmlElementNode, options: typeof DEFAULT_OPTIONS) => boolean)
  readonly replacement: (
    content: string,
    node: AugmentedNode & HtmlElementNode,
    options: typeof DEFAULT_OPTIONS,
    references: string[],
  ) => string
  readonly append?: (options: typeof DEFAULT_OPTIONS, references: string[]) => string
}

export const COMMONMARK_RULES: readonly ConversionRule[] = [
  {
    filter: 'p',
    replacement: (content) => `\n\n${content}\n\n`,
  },
  {
    filter: 'br',
    replacement: (_content, _node, options) => `${options.br}\n`,
  },
  {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: (content, node, options) => {
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
    replacement: (content, node, options) => {
      const parent = node.parentNode
      const prefix = olItemPrefix(parent, node) ?? `${options.bulletListMarker}   `

      const isParagraph = content.endsWith('\n')
      const trimmed = trimNewlines(content) + (isParagraph ? '\n' : '')
      const indented = trimmed.replace(/\n/gm, `\n${' '.repeat(prefix.length)}`)
      return `${prefix}${indented}${node.nextSibling ? '\n' : ''}`
    },
  },
  {
    filter: (node, options) =>
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
    filter: (node, options) =>
      options.codeBlockStyle === 'fenced' &&
      node.nodeName === 'PRE' &&
      getFirstChild(node) !== null &&
      getFirstChild(node)!.nodeName === 'CODE',
    replacement: (_content, node, options) => {
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
    replacement: (_content, _node, options) => `\n\n${options.hr}\n\n`,
  },
  {
    filter: (node, options) =>
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
    filter: (node, options) =>
      options.linkStyle === 'referenced' &&
      node.nodeName === 'A' &&
      getAttribute(node, 'href') !== null,
    replacement: (content, node, options, references) => {
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
    append: (_options, references) => {
      if (references.length === 0) return ''
      const result = `\n\n${references.join('\n')}\n\n`
      references.length = 0
      return result
    },
  },
  {
    filter: ['em', 'i'],
    replacement: (content, _node, options) =>
      content.trim() ? `${options.emDelimiter}${content}${options.emDelimiter}` : '',
  },
  {
    filter: ['strong', 'b'],
    replacement: (content, _node, options) =>
      content.trim() ? `${options.strongDelimiter}${content}${options.strongDelimiter}` : '',
  },
  {
    filter: (node) => {
      const hasSiblings = node.previousSibling !== null || node.nextSibling !== null
      const parent = node.parentNode
      return (
        node.nodeName === 'CODE' && !(parent !== null && parent.nodeName === 'PRE' && !hasSiblings)
      )
    },
    replacement: (content) => {
      if (!content) return ''
      const normalized = content.replace(/\r?\n|\r/g, ' ')
      const extraSpace = /^`|^ .*?[^ ].* $|`$/.test(normalized) ? ' ' : ''
      const matches = normalized.match(/`+/gm) ?? []
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

function olItemPrefix(parent: HtmlElementNode | null, node: HtmlElementNode) {
  if (!parent || parent.nodeName !== 'OL') return null
  const start = getAttribute(parent, 'start')
  const index = getChildren(parent).indexOf(node)
  return `${start ? Number(start) + index : index + 1}.  `
}

export function findMatchingRule(
  rules: readonly ConversionRule[],
  node: HtmlElementNode,
  options: typeof DEFAULT_OPTIONS,
) {
  const lower = node.nodeName.toLowerCase()
  return rules.find(({ filter }) => {
    if (typeof filter === 'string') return filter === lower
    if (typeof filter === 'function') return filter(node, options)
    return filter.includes(lower)
  })
}

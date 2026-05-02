import type { HtmlNode, HtmlElementNode, HtmlTextNode } from './dom.ts'
import {
  BLOCK_ELEMENTS,
  VOID_ELEMENTS,
  MEANINGFUL_WHEN_BLANK,
  removeChild,
  getTextContent,
  hasDescendant,
} from './dom.ts'

export function collapseWhitespace(element: HtmlElementNode, preformattedCode: boolean) {
  const isPre = preformattedCode
    ? (n: HtmlNode) => n.nodeName === 'PRE' || n.nodeName === 'CODE'
    : (n: HtmlNode) => n.nodeName === 'PRE'

  if (element.childNodes.length === 0 || isPre(element)) return

  let prevText: HtmlTextNode | null = null
  let keepLeadingWs = false
  let prev: HtmlNode | null = null
  let node: HtmlNode | null = nextTraversalNode(prev, element, isPre)

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

    const nextNode = nextTraversalNode(prev, node, isPre)
    prev = node
    node = nextNode
  }

  if (prevText) {
    prevText.data = prevText.data.replace(/ $/, '')
    if (!prevText.data && prevText.parentNode) removeChild(prevText.parentNode, prevText)
  }
}

function nextTraversalNode(
  prev: HtmlNode | null,
  current: HtmlNode,
  isPre: (n: HtmlNode) => boolean,
) {
  if ((prev && prev.parentNode === current) || isPre(current)) {
    return current.nextSibling ?? current.parentNode
  }
  if (current.nodeType === 1) {
    return current.childNodes[0] ?? current.nextSibling ?? current.parentNode
  }
  return current.nextSibling ?? current.parentNode
}

export type AugmentedNode = HtmlNode & {
  readonly isBlock: boolean
  readonly isCode: boolean
  readonly isBlank: boolean
  readonly flankingWhitespace: { readonly leading: string; readonly trailing: string }
}

export function augmentNode(
  node: HtmlNode,
  options: { readonly preformattedCode: boolean },
): AugmentedNode {
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
      : computeFlankingWhitespace(node, options)

  return Object.assign(node, {
    isBlock: nodeIsBlock,
    isCode: nodeIsCode,
    isBlank: nodeIsBlank,
    flankingWhitespace,
  })
}

function isCodeContext(node: HtmlNode): boolean {
  return node.nodeName === 'CODE' || (node.parentNode !== null && isCodeContext(node.parentNode))
}

function computeFlankingWhitespace(
  node: HtmlNode,
  options: { readonly preformattedCode: boolean },
) {
  const m = getTextContent(node).match(
    /^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/,
  )
  if (!m) return { leading: '', trailing: '' }

  const leadingAscii = m[2] ?? ''
  const leadingNonAscii = m[3] ?? ''
  const trailingAscii = m[6] ?? ''
  const trailingNonAscii = m[5] ?? ''

  const flankedLeft = isFlankedByWhitespace('left', node, options)
  const flankedRight = isFlankedByWhitespace('right', node, options)

  return {
    leading: leadingAscii && flankedLeft ? leadingNonAscii : (m[1] ?? ''),
    trailing: trailingAscii && flankedRight ? trailingNonAscii : (m[4] ?? ''),
  }
}

function isFlankedByWhitespace(
  side: 'left' | 'right',
  node: HtmlNode,
  options: { readonly preformattedCode: boolean },
) {
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

import type { HtmlNode, HtmlElementNode, HtmlTextNode } from './dom.ts'
import {
  BLOCK_ELEMENTS,
  VOID_ELEMENTS,
  MEANINGFUL_WHEN_BLANK,
  removeChild,
  getTextContent,
  getElementsByTagName,
} from './dom.ts'

/**
 * Collapses whitespace in a DOM tree following HTML rendering rules.
 *
 * @remarks
 * Consecutive whitespace characters (spaces, tabs, newlines) are collapsed
 * into a single space. Leading/trailing whitespace around block elements
 * is removed. Content inside `pre` (and optionally `code` when
 * `preformattedCode` is true) is preserved as-is. Empty text nodes
 * are removed from the tree.
 *
 * This function mutates the tree in place.
 *
 * @param element - The root element to process
 * @param preformattedCode - When true, also preserves whitespace inside `code` elements
 */
export function collapseWhitespace(element: HtmlElementNode, preformattedCode: boolean): void {
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
): HtmlNode | null {
  if ((prev && prev.parentNode === current) || isPre(current)) {
    return current.nextSibling ?? current.parentNode
  }
  if (current.nodeType === 1) {
    return current.childNodes[0] ?? current.nextSibling ?? current.parentNode
  }
  return current.nextSibling ?? current.parentNode
}

/**
 * An HTML node extended with computed metadata for Markdown conversion.
 *
 * @remarks
 * Created by {@link augmentNode} during the conversion pipeline.
 * These properties are used by conversion rules to determine output formatting.
 */
export type AugmentedNode = HtmlNode & {
  readonly isBlock: boolean
  readonly isCode: boolean
  readonly isBlank: boolean
  readonly flankingWhitespace: { readonly leading: string; readonly trailing: string }
}

/**
 * Augments an HTML node with computed metadata for the conversion pipeline.
 *
 * @remarks
 * Computes `isBlock`, `isCode`, `isBlank`, and `flankingWhitespace`
 * properties that conversion rules use to determine spacing and output.
 * This function mutates the node via `Object.assign`.
 *
 * @param node - The HTML node to augment
 * @param options - Options controlling preformatted code handling
 * @returns The same node with augmented properties
 */
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
    /^\s*$/i.test(getTextContent(node)) &&
    !Array.from(VOID_ELEMENTS).some(
      (tag) => getElementsByTagName(node as HtmlElementNode, tag).length > 0,
    ) &&
    !Array.from(MEANINGFUL_WHEN_BLANK).some(
      (tag) => getElementsByTagName(node as HtmlElementNode, tag).length > 0,
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
): { readonly leading: string; readonly trailing: string } {
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
): boolean {
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

export type HtmlTextNode = {
  readonly nodeType: 3
  readonly nodeName: '#text'
  data: string
  parentNode: HtmlElementNode | null
  nextSibling: HtmlNode | null
  previousSibling: HtmlNode | null
}

export type HtmlElementNode = {
  readonly nodeType: 1
  readonly nodeName: string
  readonly attributes: Map<string, string>
  readonly childNodes: HtmlNode[]
  parentNode: HtmlElementNode | null
  nextSibling: HtmlNode | null
  previousSibling: HtmlNode | null
}

export type HtmlNode = HtmlTextNode | HtmlElementNode

export const BLOCK_ELEMENTS: ReadonlySet<string> = new Set([
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

export const VOID_ELEMENTS: ReadonlySet<string> = new Set([
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

export const MEANINGFUL_WHEN_BLANK: ReadonlySet<string> = new Set([
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

export const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['SCRIPT', 'STYLE'])

export function removeChild(parent: HtmlElementNode, child: HtmlNode) {
  const idx = parent.childNodes.indexOf(child)
  if (idx === -1) return
  if (child.previousSibling) child.previousSibling.nextSibling = child.nextSibling
  if (child.nextSibling) child.nextSibling.previousSibling = child.previousSibling
  parent.childNodes.splice(idx, 1)
  child.parentNode = null
  child.previousSibling = null
  child.nextSibling = null
}

export function getTextContent(node: HtmlNode): string {
  if (node.nodeType === 3) return node.data
  return node.childNodes.reduce((acc, c) => acc + getTextContent(c), '')
}

export function getAttribute(node: HtmlElementNode, name: string) {
  return node.attributes.get(name) ?? null
}

export function getFirstChild(node: HtmlElementNode) {
  return node.childNodes[0] ?? null
}

export function getChildren(node: HtmlElementNode) {
  return node.childNodes.filter((c): c is HtmlElementNode => c.nodeType === 1)
}

export function getLastElementChild(node: HtmlElementNode) {
  const children = getChildren(node)
  return children[children.length - 1] ?? null
}

export function getElementsByTagName(node: HtmlElementNode, tag: string) {
  const upperTag = tag.toUpperCase()
  const result: HtmlElementNode[] = []
  const visit = (n: HtmlElementNode) => {
    for (const child of n.childNodes) {
      if (child.nodeType !== 1) continue
      if (child.nodeName === upperTag) result.push(child)
      visit(child)
    }
  }
  visit(node)
  return result
}

export function hasDescendant(
  node: HtmlElementNode,
  predicate: (n: HtmlElementNode) => boolean,
): boolean {
  for (const child of node.childNodes) {
    if (child.nodeType !== 1) continue
    if (predicate(child) || hasDescendant(child, predicate)) return true
  }
  return false
}

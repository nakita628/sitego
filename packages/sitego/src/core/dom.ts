/** A DOM text node (nodeType 3). */
export type HtmlTextNode = {
  readonly nodeType: 3
  readonly nodeName: '#text'
  data: string
  parentNode: HtmlElementNode | null
  nextSibling: HtmlNode | null
  previousSibling: HtmlNode | null
}

/** A DOM element node (nodeType 1). Tag names are stored in uppercase. */
export type HtmlElementNode = {
  readonly nodeType: 1
  readonly nodeName: string
  readonly attributes: Map<string, string>
  readonly childNodes: HtmlNode[]
  parentNode: HtmlElementNode | null
  nextSibling: HtmlNode | null
  previousSibling: HtmlNode | null
}

/** Discriminated union of text and element nodes. */
export type HtmlNode = HtmlTextNode | HtmlElementNode

/** Block-level HTML elements (uppercase). Used for whitespace collapsing and newline insertion. */
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

/** Self-closing HTML elements that cannot have children (uppercase). */
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

/** Elements that should not be treated as blank even when they contain no visible text. */
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

/** Elements whose content is treated as raw text (not parsed as HTML). */
export const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['SCRIPT', 'STYLE'])

/**
 * Removes a child node from its parent, updating sibling links.
 *
 * @remarks
 * No-op if the child is not found in the parent's childNodes.
 * After removal, the child's `parentNode`, `previousSibling`, and `nextSibling`
 * are set to `null`.
 *
 * @param parent - The parent element
 * @param child - The child node to remove
 */
export function removeChild(parent: HtmlElementNode, child: HtmlNode): void {
  const idx = parent.childNodes.indexOf(child)
  if (idx === -1) return
  if (child.previousSibling) child.previousSibling.nextSibling = child.nextSibling
  if (child.nextSibling) child.nextSibling.previousSibling = child.previousSibling
  parent.childNodes.splice(idx, 1)
  child.parentNode = null
  child.previousSibling = null
  child.nextSibling = null
}

/**
 * Recursively extracts all text content from a node and its descendants.
 *
 * @param node - The node to extract text from
 * @returns Concatenated text of all descendant text nodes
 */
export function getTextContent(node: HtmlNode): string {
  if (node.nodeType === 3) return node.data
  return node.childNodes.map((c) => getTextContent(c)).join('')
}

/**
 * Gets an attribute value from an element.
 *
 * @param node - The element node
 * @param name - Attribute name (case-sensitive, stored lowercase by parser)
 * @returns The attribute value, or `null` if not present
 */
export function getAttribute(node: HtmlElementNode, name: string): string | null {
  return node.attributes.get(name) ?? null
}

export function getFirstChild(node: HtmlElementNode): HtmlNode | null {
  return node.childNodes[0] ?? null
}

export function getChildren(node: HtmlElementNode): readonly HtmlElementNode[] {
  return node.childNodes.filter((c): c is HtmlElementNode => c.nodeType === 1)
}

export function getLastElementChild(node: HtmlElementNode): HtmlElementNode | null {
  const children = getChildren(node)
  return children[children.length - 1] ?? null
}

/**
 * Finds all descendant elements matching a tag name (case-insensitive).
 *
 * @param node - The root element to search within
 * @param tag - Tag name to match
 * @returns Array of matching element nodes in document order
 */
export function getElementsByTagName(
  node: HtmlElementNode,
  tag: string,
): readonly HtmlElementNode[] {
  const upperTag = tag.toUpperCase()
  return node.childNodes.reduce<readonly HtmlElementNode[]>((acc, child) => {
    if (child.nodeType !== 1) return acc
    const matched = child.nodeName === upperTag ? [...acc, child] : acc
    return [...matched, ...getElementsByTagName(child, tag)]
  }, [])
}

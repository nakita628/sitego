import { decodeEntities } from '../utils/index.ts'
import type { HtmlElementNode, HtmlNode, HtmlTextNode } from './dom.ts'
import { VOID_ELEMENTS, RAW_TEXT_ELEMENTS } from './dom.ts'

function charAt(s: string, i: number): string {
  return s[i] ?? ''
}

function createElement(tagName: string): HtmlElementNode {
  return {
    nodeType: 1,
    nodeName: tagName.toUpperCase(),
    attributes: new Map(),
    childNodes: [],
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
  }
}

function createTextNode(data: string): HtmlTextNode {
  return {
    nodeType: 3,
    nodeName: '#text',
    data,
    parentNode: null,
    nextSibling: null,
    previousSibling: null,
  }
}

function appendChild(parent: HtmlElementNode, child: HtmlNode): void {
  const prev = parent.childNodes.at(-1) ?? null
  child.parentNode = parent
  child.previousSibling = prev
  if (prev) prev.nextSibling = child
  parent.childNodes.push(child)
}

/**
 * Parses an HTML string into a DOM-like tree structure.
 *
 * @remarks
 * This is a self-contained HTML parser that replaces the `domino` dependency.
 * It handles comments, doctype, void elements, raw text elements
 * (`script`/`style`), and entity decoding. Tag names are normalized
 * to uppercase. Adjacent text nodes are merged automatically.
 *
 * The returned root element is a synthetic `X-TURNDOWN` element
 * wrapping all parsed content.
 *
 * @param html - Raw HTML string to parse
 * @returns Root element node containing the parsed tree
 */
export function parseHtml(html: string): HtmlElementNode {
  const root = createElement('X-TURNDOWN')
  root.attributes.set('id', 'turndown-root')
  const stack: HtmlElementNode[] = [root]
  const state = { html, pos: 0 }

  while (state.pos < state.html.length) {
    const current = stack[stack.length - 1]

    if (charAt(state.html, state.pos) === '<') {
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
          for (let i = stack.length - 1; i > 0; i--) {
            if (stack[i]?.nodeName === tagName) {
              stack.length = i
              break
            }
          }
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

function parseOpenTag(state: {
  html: string
  pos: number
}): { readonly element: HtmlElementNode; readonly selfClosing: boolean } | null {
  const tagNameMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(state.html.slice(state.pos))
  if (!tagNameMatch?.[1]) return null

  const tagName = tagNameMatch[1].toUpperCase()
  const elem = createElement(tagName)
  state.pos += tagNameMatch[0].length

  parseAttributesInto(state, elem.attributes)

  const selfClosing = charAt(state.html, state.pos - 1) === '/' || VOID_ELEMENTS.has(tagName)
  return { element: elem, selfClosing }
}

function parseAttributesInto(
  state: { html: string; pos: number },
  attrs: Map<string, string>,
): void {
  while (state.pos < state.html.length) {
    while (state.pos < state.html.length && /\s/.test(charAt(state.html, state.pos))) state.pos++

    if (charAt(state.html, state.pos) === '>') {
      state.pos++
      return
    }
    if (charAt(state.html, state.pos) === '/' && charAt(state.html, state.pos + 1) === '>') {
      state.pos += 2
      return
    }

    const nameStart = state.pos
    while (state.pos < state.html.length && !/[\s=/>]/.test(charAt(state.html, state.pos))) {
      state.pos++
    }
    const name = state.html.slice(nameStart, state.pos).toLowerCase()
    if (!name) {
      state.pos++
      continue
    }

    while (state.pos < state.html.length && /\s/.test(charAt(state.html, state.pos))) state.pos++

    if (charAt(state.html, state.pos) !== '=') {
      attrs.set(name, '')
      continue
    }
    state.pos++

    while (state.pos < state.html.length && /\s/.test(charAt(state.html, state.pos))) state.pos++

    const quote = charAt(state.html, state.pos)
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
      while (state.pos < state.html.length && !/[\s>]/.test(charAt(state.html, state.pos))) {
        state.pos++
      }
      attrs.set(name, decodeEntities(state.html.slice(valueStart, state.pos)))
    }
  }
}

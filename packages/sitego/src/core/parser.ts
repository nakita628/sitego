import { decodeEntities } from '../utils/index.ts'
import type { HtmlElementNode, HtmlNode, HtmlTextNode } from './dom.ts'
import { VOID_ELEMENTS, RAW_TEXT_ELEMENTS } from './dom.ts'

type ParserState = { html: string; pos: number }

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

function appendChild(parent: HtmlElementNode, child: HtmlNode) {
  const prev = parent.childNodes.at(-1) ?? null
  child.parentNode = parent
  child.previousSibling = prev
  if (prev) prev.nextSibling = child
  parent.childNodes.push(child)
}

const WS = /\s/
const NOT_ATTR_NAME_END = /[^\s=/>]/
const NOT_UNQUOTED_VALUE_END = /[^\s>]/

function skipWhile(state: ParserState, re: RegExp) {
  while (state.pos < state.html.length && re.test(state.html.charAt(state.pos))) state.pos++
}

export function parseHtml(html: string) {
  const root = createElement('X-TURNDOWN')
  root.attributes.set('id', 'turndown-root')
  const stack: HtmlElementNode[] = [root]
  const state: ParserState = { html, pos: 0 }

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

function parseOpenTag(state: ParserState) {
  const tagNameMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(state.html.slice(state.pos))
  if (!tagNameMatch?.[1]) return null

  const tagName = tagNameMatch[1].toUpperCase()
  const elem = createElement(tagName)
  state.pos += tagNameMatch[0].length

  parseAttributesInto(state, elem.attributes)

  const selfClosing = state.html.charAt(state.pos - 1) === '/' || VOID_ELEMENTS.has(tagName)
  return { element: elem, selfClosing }
}

function parseAttributesInto(state: ParserState, attrs: Map<string, string>) {
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

import { escapeMarkdown, trimLeadingNewlines, trimTrailingNewlines } from '../utils/index.ts'
import type { HtmlNode, HtmlElementNode } from './dom.ts'
import { RAW_TEXT_ELEMENTS } from './dom.ts'
import { parseHtml } from './parser.ts'
import type { AugmentedNode } from './preprocess.ts'
import { collapseWhitespace, augmentNode } from './preprocess.ts'
import { COMMONMARK_RULES, findMatchingRule } from './rules.ts'

/**
 * Default conversion options for {@link htmlToMarkdown}.
 *
 * @remarks
 * All options can be overridden by passing a partial object to `htmlToMarkdown`.
 * Option names and values mirror the turndown API for compatibility.
 */
export const DEFAULT_OPTIONS = {
  headingStyle: 'atx' as 'setext' | 'atx',
  hr: '* * *',
  bulletListMarker: '*' as '*' | '-' | '+',
  codeBlockStyle: 'fenced' as 'indented' | 'fenced',
  fence: '```' as '```' | '~~~',
  emDelimiter: '_' as '_' | '*',
  strongDelimiter: '**' as '**' | '__',
  linkStyle: 'inlined' as 'inlined' | 'referenced',
  linkReferenceStyle: 'full' as 'full' | 'collapsed' | 'shortcut',
  br: '  ',
  preformattedCode: false,
}

const REMOVE_ELEMENTS: ReadonlySet<string> = new Set([...RAW_TEXT_ELEMENTS, 'NOSCRIPT'])

/**
 * Converts an HTML string to CommonMark Markdown.
 *
 * @remarks
 * The conversion pipeline is: parse HTML → collapse whitespace → apply
 * CommonMark rules → post-process (append references, trim output).
 * No external dependencies are used — the HTML parser is built-in.
 *
 * @param html - Raw HTML string to convert
 * @param userOptions - Partial overrides for {@link DEFAULT_OPTIONS}
 * @returns Converted Markdown string, or empty string if input is empty
 */
export function htmlToMarkdown(
  html: string,
  userOptions?: Partial<typeof DEFAULT_OPTIONS>,
): string {
  if (!html) return ''

  const options = { ...DEFAULT_OPTIONS, ...userOptions }
  const root = parseHtml(html)
  collapseWhitespace(root, options.preformattedCode)
  const references: string[] = []
  const output = processNode(root, options, references)
  return postProcess(output, options, references)
}

function processNode(
  parentNode: HtmlElementNode,
  options: typeof DEFAULT_OPTIONS,
  references: string[],
): string {
  return parentNode.childNodes.reduce((output: string, child: HtmlNode) => {
    const node = augmentNode(child, options)

    if (node.nodeType === 3) {
      return joinOutput(output, node.isCode ? node.data : escapeMarkdown(node.data))
    }
    if (node.nodeType === 1) {
      return joinOutput(
        output,
        replacementForElement(node as AugmentedNode & HtmlElementNode, options, references),
      )
    }
    return output
  }, '')
}

function replacementForElement(
  node: AugmentedNode & HtmlElementNode,
  options: typeof DEFAULT_OPTIONS,
  references: string[],
): string {
  if (REMOVE_ELEMENTS.has(node.nodeName)) return ''
  if (node.isBlank) return node.isBlock ? '\n\n' : ''

  const rule = findMatchingRule(COMMONMARK_RULES, node, options)
  const content = processNode(node, options, references)
  const hasFlanking = node.flankingWhitespace.leading || node.flankingWhitespace.trailing
  const trimmedContent = hasFlanking ? content.trim() : content

  const converted = rule
    ? rule.replacement(trimmedContent, node, options, references)
    : node.isBlock
      ? `\n\n${trimmedContent}\n\n`
      : trimmedContent

  return `${node.flankingWhitespace.leading}${converted}${node.flankingWhitespace.trailing}`
}

function joinOutput(output: string, replacement: string): string {
  const s1 = trimTrailingNewlines(output)
  const s2 = trimLeadingNewlines(replacement)
  const nlCount = Math.max(output.length - s1.length, replacement.length - s2.length)
  return `${s1}${'\n\n'.substring(0, nlCount)}${s2}`
}

function postProcess(
  output: string,
  options: typeof DEFAULT_OPTIONS,
  references: string[],
): string {
  const appended = COMMONMARK_RULES.reduce((acc, rule) => {
    return rule.append ? joinOutput(acc, rule.append(options, references)) : acc
  }, output)
  return appended.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '')
}

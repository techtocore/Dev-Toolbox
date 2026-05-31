import { marked } from 'marked';

/**
 * Helpers for turning raw model output into something a tool can present.
 *
 * Two concerns:
 *  1. Reasoning models (e.g. Qwen3.5) may wrap chain-of-thought in
 *     `<think>…</think>`. We split that out so tools can show the answer
 *     cleanly and optionally reveal the reasoning.
 *  2. Tools frequently want JSON or rendered markdown; small, dependency-free
 *     extractors live here so each tool doesn't reinvent them.
 */

const THINK_BLOCK = /<think>([\s\S]*?)<\/think>/gi;
const OPEN_THINK = /<think>([\s\S]*)$/i; // unterminated (still streaming)

export interface SplitOutput {
  /** Answer text with any think block removed. */
  text: string;
  /** Concatenated reasoning content, if present. */
  thinking?: string;
}

/**
 * Separates `<think>` reasoning from the final answer. Tolerant of a partial,
 * still-streaming think block (treats everything after an unterminated
 * `<think>` as reasoning so the UI never flashes raw tags).
 */
export function splitThinking(raw: string): SplitOutput {
  if (!raw) {
    return { text: '' };
  }

  const reasoning: string[] = [];
  let text = raw.replace(THINK_BLOCK, (_m, inner: string) => {
    reasoning.push(inner.trim());
    return '';
  });

  const open = text.match(OPEN_THINK);
  if (open) {
    reasoning.push(open[1].trim());
    text = text.slice(0, open.index).trimEnd();
  }

  const thinking = reasoning.filter(Boolean).join('\n\n').trim();
  return { text: text.trim(), thinking: thinking || undefined };
}

/**
 * Extracts the first JSON object/array from a string, tolerating models that
 * wrap JSON in prose or ```json fences. Returns `undefined` if nothing parses.
 */
export function extractJson<T = unknown>(raw: string): T | undefined {
  if (!raw) {
    return undefined;
  }
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;

  const start = candidate.search(/[[{]/);
  if (start === -1) {
    return undefined;
  }
  // Walk to the matching closing bracket to isolate the JSON span.
  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < candidate.length; i++) {
    if (candidate[i] === open) depth++;
    else if (candidate[i] === close) depth--;
    if (depth === 0) {
      try {
        return JSON.parse(candidate.slice(start, i + 1)) as T;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Renders markdown to HTML. The returned string is bound via Angular's
 * `[innerHTML]`, which sanitizes it (stripping scripts/event handlers), so no
 * extra sanitization is needed here.
 */
export function renderMarkdown(text: string): string {
  if (!text) {
    return '';
  }
  return marked.parse(text, { async: false }) as string;
}

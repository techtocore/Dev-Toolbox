export interface RegexEvaluationRequest {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
  replace: boolean;
  maxMatches: number;
  maxOutputLength: number;
}

export interface RegexEvaluationResult {
  positions: { index: number; length: number }[];
  replaceOutput: string;
}

export function evaluateRegex(request: RegexEvaluationRequest): RegexEvaluationResult {
  const global = request.flags.includes('g');
  const matchingFlags = global ? request.flags : `${request.flags}g`;
  const regex = new RegExp(request.pattern, matchingFlags);
  const positions: { index: number; length: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(request.text)) !== null) {
    if (positions.length >= request.maxMatches) {
      throw new Error(`Too many matches (>${request.maxMatches.toLocaleString()}). Refine your pattern.`);
    }
    positions.push({ index: match.index, length: match[0].length });
    if (!global) {
      break;
    }
    if (match[0].length === 0) {
      regex.lastIndex = advanceStringIndex(request.text, regex.lastIndex, request.flags.includes('u'));
    }
  }

  let replaceOutput = '';
  if (request.replace) {
    const estimatedLength = estimateReplacementLength(request.text.length, positions, request.replacement);
    if (estimatedLength > request.maxOutputLength) {
      throw new Error('Replacement output would exceed the 10 MB safety limit.');
    }
    replaceOutput = request.text.replace(
      new RegExp(request.pattern, request.flags),
      request.replacement
    );
    if (replaceOutput.length > request.maxOutputLength) {
      throw new Error('Replacement output exceeds the 10 MB safety limit.');
    }
  }

  return { positions, replaceOutput };
}

function advanceStringIndex(text: string, index: number, unicode: boolean): number {
  if (!unicode || index + 1 >= text.length) {
    return index + 1;
  }
  const first = text.charCodeAt(index);
  const second = text.charCodeAt(index + 1);
  return first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff
    ? index + 2
    : index + 1;
}

function estimateReplacementLength(
  textLength: number,
  positions: { index: number; length: number }[],
  replacement: string
): number {
  const matchCount = positions.length;
  const totalMatchLength = positions.reduce((sum, position) => sum + position.length, 0);
  const matchReferences = countMatches(replacement, /\$&|\$[1-9]\d?|\$<[^>]+>/g);
  const contextReferences = countMatches(replacement, /\$[`']/g);

  return textLength
    + matchCount * replacement.length
    + matchReferences * totalMatchLength
    + contextReferences * textLength * matchCount;
}

function countMatches(value: string, expression: RegExp): number {
  return value.match(expression)?.length ?? 0;
}
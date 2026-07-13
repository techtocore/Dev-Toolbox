/// <reference lib="webworker" />

import { evaluateRegex, RegexEvaluationRequest, RegexEvaluationResult } from './regex-engine';

export interface RegexWorkerResponse {
  result?: RegexEvaluationResult;
  error?: string;
}

addEventListener('message', ({ data }: MessageEvent<RegexEvaluationRequest>) => {
  try {
    postMessage({ result: evaluateRegex(data) } satisfies RegexWorkerResponse);
  } catch (error) {
    postMessage({
      error: error instanceof Error ? error.message : 'Regex evaluation failed'
    } satisfies RegexWorkerResponse);
  }
});
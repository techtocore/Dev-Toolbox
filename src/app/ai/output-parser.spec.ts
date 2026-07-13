import { extractJson, splitThinking } from './output-parser';

describe('output parser', () => {
  describe('extractJson', () => {
    it('extracts objects containing bracket characters inside strings', () => {
      const result = extractJson<{ pattern: string; note: string }>(
        'Result: {"pattern":"}","note":"array [value] and escaped \\"quote\\""}'
      );

      expect(result).toEqual({
        pattern: '}',
        note: 'array [value] and escaped "quote"'
      });
    });

    it('extracts nested arrays and objects from a JSON fence', () => {
      expect(extractJson('```json\n[{"items":[1,{"ok":true}]}]\n```'))
        .toEqual([{ items: [1, { ok: true }] }]);
    });

    it('continues to a later parseable candidate after malformed JSON', () => {
      expect(extractJson('Bad: {not json}. Good: {"valid":true}'))
        .toEqual({ valid: true });
    });

    it('returns undefined when no balanced JSON value is present', () => {
      expect(extractJson('Explanation only {"unfinished": true')).toBeUndefined();
    });
  });

  it('keeps the final answer separate from model thinking', () => {
    expect(splitThinking('<think>reasoning</think>answer'))
      .toEqual({ text: 'answer', thinking: 'reasoning' });
  });
});
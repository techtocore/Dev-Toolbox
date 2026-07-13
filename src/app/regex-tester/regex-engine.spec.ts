import { evaluateRegex, RegexEvaluationRequest } from './regex-engine';

function request(overrides: Partial<RegexEvaluationRequest> = {}): RegexEvaluationRequest {
  return {
    pattern: '\\d+',
    flags: 'g',
    text: 'a1 b22',
    replacement: '#',
    replace: false,
    maxMatches: 10_000,
    maxOutputLength: 10 * 1024 * 1024,
    ...overrides
  };
}

describe('regex engine', () => {
  it('returns every match position for global patterns', () => {
    expect(evaluateRegex(request()).positions).toEqual([
      { index: 1, length: 1 },
      { index: 4, length: 2 }
    ]);
  });

  it('returns only the first position without the global flag', () => {
    expect(evaluateRegex(request({ flags: '' })).positions).toEqual([
      { index: 1, length: 1 }
    ]);
  });

  it('applies replacement inside the worker engine', () => {
    expect(evaluateRegex(request({ replace: true })).replaceOutput).toBe('a# b#');
  });

  it('rejects replacement output that exceeds its safety budget', () => {
    expect(() => evaluateRegex(request({
      pattern: '.',
      text: 'abcdef',
      replacement: 'long',
      replace: true,
      maxOutputLength: 10
    }))).toThrowError('Replacement output would exceed the 10 MB safety limit.');
  });
});
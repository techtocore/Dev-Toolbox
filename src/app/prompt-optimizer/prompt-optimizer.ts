import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ToastService } from '../services/toast.service';

interface AnalysisResult {
  category: string;
  status: 'good' | 'warning' | 'error';
  weight: number;
  message: string;
  suggestion?: string;
}

type TargetModel = 'generic' | 'claude' | 'gpt' | 'gemini';

@Component({
  selector: 'app-prompt-optimizer',
  standalone: false,
  templateUrl: './prompt-optimizer.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./prompt-optimizer.scss']
})
export class PromptOptimizer {
  prompt: string = `Summarize this text`;
  targetModel: TargetModel = 'generic';

  analysisResults: AnalysisResult[] = [];
  score: number = 0;

  // Heuristic patterns for prompt-engineering best practices.
  private patterns = {
    role:           /(?:^|\n)\s*(?:you are|act as|role:|persona:|as an?\s+(?:expert|experienced|senior))\b/i,
    task:           /\b(?:task|instruction|goal|objective|please)\s*[:\-]/i,
    context:        /\b(?:context|background|given that|here(?:'s| is)|reference)\s*[:\-]/i,
    // Directive phrases ("respond with", "output format", "format as/your/the",
    // "return a/the/...") match without a delimiter since they can't occur
    // incidentally; bare verbs ("output", "format", "return") require a
    // delimiter so prose like "the output was wrong" doesn't inflate the score.
    format:         /\b(?:respond with|reply with|output\s+format|format\s+(?:as|your|the)|return\s+(?:a|the|your|in|as)|(?:output|format|return)\s*[:\-])/i,
    examples:       /\b(?:example|for instance|e\.g\.|sample(?: input| output)?)\s*[:\-]?/i,
    fewShot:        /(?:input\s*:[\s\S]+?output\s*:|###[\s\S]+###|<example>[\s\S]+<\/example>)/i,
    constraints:    /\b(?:do not|don't|avoid|never|must not|should not|only|always|exclusively)\b/i,
    xmlTags:        /<\s*([a-z][a-z0-9_-]*)\s*>[\s\S]*<\s*\/\s*\1\s*>/i,
    cot:            /\b(?:think step[- ]by[- ]step|let'?s think|chain[- ]of[- ]thought|show your (?:work|reasoning)|reason about|explain your reasoning)\b/i,
    jsonOutput:     /(?:return|respond|reply|output)[^.]*\b(?:json|object|array)\b/i,
    delimiter:      /(?:^|\n)\s*(?:---+|===+|###+|```|<\/?[a-z][a-z0-9_-]*>)/i,
    prefilled:      /\n\s*(?:assistant|response|answer)\s*:\s*$/i,
    safety:         /\b(?:if you cannot|if unsure|when uncertain|do not (?:guess|hallucinate|invent)|cite (?:sources?|evidence)|answer only if)\b/i,
  };

  private issues = {
    vague:    ['it', 'this', 'that', 'something', 'thing', 'stuff', 'somehow'],
    filler:   ['please', 'kindly', 'would you', 'could you', 'i want you to', 'i would like'],
    redundant:['very', 'really', 'quite', 'just', 'actually', 'basically', 'literally'],
    politeness:['please', 'kindly', 'thanks', 'thank you']
  };

  constructor(private toastService: ToastService) {
    this.analyzePrompt();
  }

  /**
   * System prompt for the on-device "Rewrite with AI" feature. Tailors the
   * guidance to the selected provider so the rewrite matches how that model
   * family is best prompted.
   */
  get aiSystem(): string {
    const provider: Record<TargetModel, string> = {
      generic: 'a general-purpose LLM',
      claude:
        'Anthropic Claude (which responds best to XML tags such as <task>, <context>, ' +
        '<output_format> and <rules>)',
      gpt:
        'OpenAI GPT / o-series (favour a clear instruction split and an explicit output schema)',
      gemini:
        'Google Gemini (favour an explicit JSON output schema for extraction or classification tasks)',
    };
    return [
      'You are a world-class prompt engineer.',
      `Rewrite the user's prompt so it follows prompt-engineering best practices for ${provider[this.targetModel]}.`,
      'Apply, where appropriate: a concrete role/persona, an explicit task statement, relevant',
      'context, a clearly specified output format, necessary constraints/guardrails, and isolation',
      'of any untrusted input.',
      "Preserve the user's original intent and keep any concrete details, examples or {{placeholders}} they included.",
      'Do NOT answer or execute the prompt — only improve the prompt itself.',
      'Output ONLY the improved prompt as plain text: no preamble, no commentary, no code fences,',
      'and no surrounding quotes.',
    ].join(' ');
  }

  /** Apply an AI-generated rewrite: clean it up, replace, and re-score. */
  applyAiRewrite(raw: string): void {
    let text = (raw ?? '').trim();
    // Strip a single wrapping pair of code fences, if present.
    const fence = text.match(/^```[a-z]*\s*([\s\S]*?)\s*```$/i);
    if (fence) {
      text = fence[1].trim();
    }
    // Strip a single pair of matching surrounding quotes — but only when the
    // first/last quotes are an actual wrapping pair, i.e. the same quote char
    // does not reappear in the interior. This leaves text like
    // '"Summarize X" and then "do Y"' untouched.
    if (text.length >= 2) {
      const inner = text.slice(1, -1);
      const wrapped =
        (text.startsWith('"') && text.endsWith('"') && inner.indexOf('"') === -1) ||
        (text.startsWith('“') && text.endsWith('”') && inner.indexOf('”') === -1 && inner.indexOf('“') === -1) ||
        (text.startsWith("'") && text.endsWith("'") && inner.indexOf("'") === -1);
      if (wrapped) {
        text = inner.trim();
      }
    }
    if (!text) {
      this.toastService.error('The model returned an empty rewrite. Try again.');
      return;
    }
    this.prompt = text;
    this.analyzePrompt();
    this.toastService.success(`Prompt rewritten — re-scored at ${this.score}%`);
  }

  analyzePrompt(): void {
    this.analysisResults = [];

    const prompt = this.prompt;
    if (!prompt.trim()) {
      this.analysisResults.push({
        category: 'General', status: 'error', weight: 1,
        message: 'Empty prompt',
        suggestion: 'Enter a prompt to analyze.'
      });
      this.score = 0;
      return;
    }

    const length = prompt.length;
    const wordCount = prompt.trim().split(/\s+/).length;

    // 1. Length
    if (length < 30) {
      this.analysisResults.push({
        category: 'Length', status: 'error', weight: 2,
        message: `Very short prompt (${length} chars)`,
        suggestion: 'Short prompts under-specify the task. Add a role, task statement, context, and output format.'
      });
    } else if (length > 8000) {
      this.analysisResults.push({
        category: 'Length', status: 'warning', weight: 1,
        message: `Very long prompt (${length} chars, ~${Math.round(length / 4)} tokens)`,
        suggestion: 'Consider moving stable instructions into a cached system prompt and only varying the per-request payload.'
      });
    } else {
      this.analysisResults.push({
        category: 'Length', status: 'good', weight: 1,
        message: `Reasonable length (${length} chars, ${wordCount} words)`
      });
    }

    // 2. Role / persona
    this.push(
      this.patterns.role.test(prompt), 'Role', 2,
      'Defines a role or persona',
      'Start with "You are a [specific expert]" — concrete personas measurably improve grounding.'
    );

    // 3. Task clarity
    this.push(
      this.patterns.task.test(prompt), 'Task', 3,
      'Clear task statement',
      'Use an explicit "Task:" or imperative verb up top (e.g. "Extract...", "Summarize...", "Classify...").'
    );

    // 4. Context
    this.push(
      this.patterns.context.test(prompt), 'Context', 2,
      'Provides context / background',
      'Add background ("Context: ...") so the model knows why it\'s doing the task — improves relevance.'
    );

    // 5. Output format
    this.push(
      this.patterns.format.test(prompt) || this.patterns.jsonOutput.test(prompt),
      'Output format', 3,
      'Specifies output format',
      'State the format: "Reply with a JSON object containing keys X, Y, Z" or "Use Markdown bullets".'
    );

    // 6. Examples / few-shot
    const hasExamples = this.patterns.fewShot.test(prompt) || this.patterns.examples.test(prompt);
    this.push(
      hasExamples, 'Examples (few-shot)', 2,
      'Includes examples or few-shot demonstrations',
      'Add 1–3 input→output examples. Few-shot remains the single highest-ROI technique for accuracy.'
    );

    // 7. Constraints / guardrails
    if (this.patterns.constraints.test(prompt)) {
      this.analysisResults.push({
        category: 'Constraints', status: 'good', weight: 1,
        message: 'States constraints or boundaries'
      });
    }

    // 8. Structure (XML tags / delimiters)
    const hasXml = this.patterns.xmlTags.test(prompt);
    const hasDelim = this.patterns.delimiter.test(prompt);
    if (hasXml) {
      this.analysisResults.push({
        category: 'Structure', status: 'good', weight: 2,
        message: 'Uses XML-style tags to delimit sections'
      });
    } else if (hasDelim) {
      this.analysisResults.push({
        category: 'Structure', status: 'good', weight: 1,
        message: 'Uses delimiters (---, ###, code fences) to separate sections'
      });
    } else if (length > 250) {
      const suggestion = this.targetModel === 'claude'
        ? 'Wrap inputs in XML tags like <context>...</context>, <example>...</example>. Claude is trained to attend to them.'
        : 'Separate sections with delimiters (### Headers, --- separators, or XML tags) — improves parsability.';
      this.analysisResults.push({
        category: 'Structure', status: 'warning', weight: 1,
        message: 'No structural delimiters in a long prompt',
        suggestion
      });
    }

    // 9. Chain of Thought
    const isReasoningLikely = length > 400 || /\b(?:complex|multi[- ]step|analy[sz]e|reason|deduce)\b/i.test(prompt);
    if (this.patterns.cot.test(prompt)) {
      this.analysisResults.push({
        category: 'Reasoning', status: 'good', weight: 1,
        message: 'Invokes chain-of-thought reasoning'
      });
    } else if (isReasoningLikely) {
      const suggestion = this.targetModel === 'claude' || this.targetModel === 'gpt'
        ? 'For reasoning-capable models (Claude extended thinking, o-series), CoT cues are mostly unnecessary — they reason by default. Otherwise, add "Think step by step before answering."'
        : 'Add "Think step by step, then provide your final answer" for non-reasoning models.';
      this.analysisResults.push({
        category: 'Reasoning', status: 'warning', weight: 1,
        message: 'Complex task without an explicit reasoning cue',
        suggestion
      });
    }

    // 10. Safety / grounding
    if (this.patterns.safety.test(prompt)) {
      this.analysisResults.push({
        category: 'Grounding', status: 'good', weight: 1,
        message: 'Includes uncertainty/grounding instructions'
      });
    } else if (/\b(?:fact|cite|source|reference|accurate|truth)\b/i.test(prompt)) {
      this.analysisResults.push({
        category: 'Grounding', status: 'warning', weight: 1,
        message: 'Task implies factual accuracy but no hedging instruction',
        suggestion: 'Add: "If you are unsure, say so explicitly rather than guessing."'
      });
    }

    // 11. Vague language
    const vagueWords = this.issues.vague.filter(w =>
      new RegExp(`\\b${w}\\b`, 'i').test(prompt)
    );
    if (vagueWords.length >= 2) {
      this.analysisResults.push({
        category: 'Clarity', status: 'warning', weight: 1,
        message: `Vague pronouns / fillers: ${vagueWords.join(', ')}`,
        suggestion: 'Replace pronouns with the actual referent (e.g. "the user\'s comment" instead of "it").'
      });
    }

    // 12. Conciseness
    const fillerWords = this.issues.filler.filter(w =>
      new RegExp(`\\b${w}\\b`, 'i').test(prompt)
    );
    if (fillerWords.length >= 3) {
      this.analysisResults.push({
        category: 'Conciseness', status: 'warning', weight: 1,
        message: 'Heavy use of filler / politeness words',
        suggestion: 'LLMs don\'t need politeness. Replace "Could you please kindly..." with the imperative.'
      });
    }

    // 13. Prompt-injection risk on user-supplied content
    if (/\{\{.*?\}\}|\$\{.*?\}|user input/i.test(prompt) && !hasXml && !hasDelim) {
      this.analysisResults.push({
        category: 'Injection risk', status: 'warning', weight: 2,
        message: 'Embeds user input without isolating delimiters',
        suggestion: 'Wrap untrusted input in XML tags and tell the model to treat tag contents as data, not instructions.'
      });
    }

    // 14. Provider-specific recommendation
    if (this.targetModel === 'claude' && !hasXml && length > 200) {
      this.analysisResults.push({
        category: 'Claude-specific', status: 'warning', weight: 1,
        message: 'No XML tags',
        suggestion: 'Claude responds especially well to <task>, <context>, <example>, <output_format> tags.'
      });
    }
    if (this.targetModel === 'gpt' && !/\bsystem\s*:/i.test(prompt) && length > 400) {
      this.analysisResults.push({
        category: 'GPT-specific', status: 'warning', weight: 1,
        message: 'Single long instruction block',
        suggestion: 'Split persona + standing rules into the system message and keep the user message focused on the request.'
      });
    }
    if (this.targetModel === 'gemini' && !this.patterns.jsonOutput.test(prompt) && /extract|classify|parse/i.test(prompt)) {
      this.analysisResults.push({
        category: 'Gemini-specific', status: 'warning', weight: 1,
        message: 'Extraction task without explicit JSON output',
        suggestion: 'For extraction tasks on Gemini, pair the prompt with `responseMimeType: "application/json"` + `responseSchema`.'
      });
    }

    // Score: weighted ratio of good results vs total weight.
    let goodWeight = 0;
    let totalWeight = 0;
    this.analysisResults.forEach(r => {
      totalWeight += r.weight;
      if (r.status === 'good') goodWeight += r.weight;
    });
    this.score = totalWeight > 0 ? Math.round((goodWeight / totalWeight) * 100) : 0;
  }

  private push(
    passed: boolean,
    category: string,
    weight: number,
    okMessage: string,
    suggestion: string
  ): void {
    if (passed) {
      this.analysisResults.push({ category, status: 'good', weight, message: okMessage });
    } else {
      this.analysisResults.push({
        category, status: 'warning', weight,
        message: `Missing: ${category.toLowerCase()}`,
        suggestion
      });
    }
  }

  getScoreClass(): string {
    if (this.score >= 80) return 'text-success';
    if (this.score >= 60) return 'text-warning';
    return 'text-danger';
  }

  getScoreLabel(): string {
    if (this.score >= 85) return 'Excellent';
    if (this.score >= 70) return 'Strong';
    if (this.score >= 50) return 'Needs work';
    return 'Poor';
  }

  applyOptimization(): void {
    let optimized = this.prompt.trim();

    if (!this.patterns.role.test(optimized)) {
      optimized = `You are an expert assistant.\n\n${optimized}`;
    }
    if (!this.patterns.format.test(optimized) && !this.patterns.jsonOutput.test(optimized)) {
      optimized += `\n\nOutput format: respond in Markdown.`;
    }
    if (this.targetModel === 'claude' && !this.patterns.xmlTags.test(optimized) && optimized.length > 200) {
      optimized = optimized.replace(/Context\s*:\s*([\s\S]*?)(?=\n\n|$)/i, '<context>\n$1\n</context>');
    }
    if (!optimized.includes('\n\n')) {
      optimized = optimized.replace(/\.\s+/g, '.\n\n');
    }

    this.prompt = optimized;
    this.analyzePrompt();
  }

  loadExample(type: string): void {
    switch (type) {
      case 'poor':
        this.prompt = 'Summarize this text about AI';
        break;
      case 'good':
        this.prompt = `You are an expert technical writer.

Task: Summarize the following text about AI in 3-5 bullet points.

Context: This summary will be used in a technical newsletter for software developers.

Requirements:
- Focus on key technical concepts
- Use clear, concise language
- Include specific examples if mentioned
- Do not include opinions or speculation

Output format: Markdown bullet points

Text to summarize: [paste text here]`;
        break;
      case 'excellent':
        this.prompt = `You are a senior data scientist specializing in machine learning literature review.

<task>
Extract structured metadata about the ML approach described in the abstract below.
</task>

<context>
This extraction feeds a comparative literature review of image-classification methods. Accuracy matters more than verbosity.
</context>

<output_format>
Return a single JSON object matching this schema, and nothing else:
{
  "model_name": string,
  "dataset": string,
  "accuracy": { "metric": string, "value": string },
  "innovations": string[]
}
</output_format>

<rules>
- Only extract information explicitly stated in the abstract.
- If a field is not mentioned, use null.
- Do not infer architecture from model name alone.
- If you are uncertain about a value, set it to null rather than guessing.
</rules>

<example>
<input>
We propose ResNet-50 trained on ImageNet achieving 92.1% top-1 accuracy using residual connections.
</input>
<output>
{
  "model_name": "ResNet-50",
  "dataset": "ImageNet",
  "accuracy": { "metric": "top-1", "value": "92.1%" },
  "innovations": ["residual connections"]
}
</output>
</example>

<abstract>
[paste abstract here]
</abstract>`;
        break;
    }
    this.analyzePrompt();
  }

  clearPrompt(): void {
    this.prompt = '';
    this.analyzePrompt();
  }
}

import { Component } from '@angular/core';

interface AnalysisResult {
  category: string;
  status: 'good' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

@Component({
  selector: 'app-prompt-optimizer',
  standalone: false,
  templateUrl: './prompt-optimizer.html',
  styleUrls: ['./prompt-optimizer.scss']
})
export class PromptOptimizer {
  prompt: string = `Summarize this text`;

  analysisResults: AnalysisResult[] = [];
  score: number = 0;

  // Best practices patterns
  bestPractices = {
    hasRole: /(?:you are|act as|role:|as an?)\s+\w+/i,
    hasTask: /(?:please|task:|instruction:|goal:)/i,
    hasContext: /(?:context:|background:|given that)/i,
    hasFormat: /(?:format:|output:|return|respond with)/i,
    hasExamples: /(?:example:|for instance|such as|e\.g\.)/i,
    hasFewShot: /(?:input:|output:|###)/i,
    hasConstraints: /(?:do not|avoid|never|must not|should not)/i,
    tooShort: 10, // characters
    tooLong: 4000 // characters
  };

  // Common issues
  issues = {
    vague: ['it', 'this', 'that', 'something', 'thing', 'stuff'],
    filler: ['please', 'kindly', 'would you', 'could you', 'i want you to'],
    redundant: ['very', 'really', 'quite', 'just', 'actually']
  };

  constructor() {
    this.analyzePrompt();
  }

  analyzePrompt(): void {
    this.analysisResults = [];

    if (!this.prompt.trim()) {
      this.analysisResults.push({
        category: 'General',
        status: 'error',
        message: 'Empty prompt',
        suggestion: 'Enter a prompt to analyze'
      });
      this.score = 0;
      return;
    }

    // Check length
    const length = this.prompt.length;
    if (length < this.bestPractices.tooShort) {
      this.analysisResults.push({
        category: 'Length',
        status: 'error',
        message: `Prompt is too short (${length} characters)`,
        suggestion: 'Add more context and specific instructions'
      });
    } else if (length > this.bestPractices.tooLong) {
      this.analysisResults.push({
        category: 'Length',
        status: 'warning',
        message: `Prompt is very long (${length} characters)`,
        suggestion: 'Consider breaking into smaller, focused prompts'
      });
    } else {
      this.analysisResults.push({
        category: 'Length',
        status: 'good',
        message: `Good length (${length} characters)`
      });
    }

    // Check for role/persona
    if (this.bestPractices.hasRole.test(this.prompt)) {
      this.analysisResults.push({
        category: 'Role',
        status: 'good',
        message: 'Defines a role or persona'
      });
    } else {
      this.analysisResults.push({
        category: 'Role',
        status: 'warning',
        message: 'No explicit role defined',
        suggestion: 'Start with "You are a [role]..." to set context'
      });
    }

    // Check for clear task
    if (this.bestPractices.hasTask.test(this.prompt)) {
      this.analysisResults.push({
        category: 'Task',
        status: 'good',
        message: 'Clear task instruction present'
      });
    } else {
      this.analysisResults.push({
        category: 'Task',
        status: 'warning',
        message: 'Task could be more explicit',
        suggestion: 'Use "Task: [specific action]" or "Please [action]"'
      });
    }

    // Check for context
    if (this.bestPractices.hasContext.test(this.prompt)) {
      this.analysisResults.push({
        category: 'Context',
        status: 'good',
        message: 'Provides context'
      });
    } else {
      this.analysisResults.push({
        category: 'Context',
        status: 'warning',
        message: 'No explicit context provided',
        suggestion: 'Add "Context: ..." to provide background information'
      });
    }

    // Check for output format
    if (this.bestPractices.hasFormat.test(this.prompt)) {
      this.analysisResults.push({
        category: 'Format',
        status: 'good',
        message: 'Specifies output format'
      });
    } else {
      this.analysisResults.push({
        category: 'Format',
        status: 'warning',
        message: 'Output format not specified',
        suggestion: 'Specify desired format (e.g., "Return as JSON", "Use bullet points")'
      });
    }

    // Check for examples
    if (this.bestPractices.hasExamples.test(this.prompt) || this.bestPractices.hasFewShot.test(this.prompt)) {
      this.analysisResults.push({
        category: 'Examples',
        status: 'good',
        message: 'Includes examples or few-shot learning'
      });
    } else {
      this.analysisResults.push({
        category: 'Examples',
        status: 'warning',
        message: 'No examples provided',
        suggestion: 'Add examples to improve accuracy: "Example: Input: ... Output: ..."'
      });
    }

    // Check for constraints
    if (this.bestPractices.hasConstraints.test(this.prompt)) {
      this.analysisResults.push({
        category: 'Constraints',
        status: 'good',
        message: 'Includes constraints or boundaries'
      });
    }

    // Check for vague language
    const vagueWords = this.issues.vague.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(this.prompt)
    );
    if (vagueWords.length > 0) {
      this.analysisResults.push({
        category: 'Clarity',
        status: 'warning',
        message: `Contains vague words: ${vagueWords.join(', ')}`,
        suggestion: 'Replace vague terms with specific nouns or descriptions'
      });
    }

    // Check for redundant/filler words
    const fillerWords = this.issues.filler.filter(word =>
      new RegExp(`\\b${word}\\b`, 'i').test(this.prompt)
    );
    if (fillerWords.length > 2) {
      this.analysisResults.push({
        category: 'Conciseness',
        status: 'warning',
        message: 'Contains filler words',
        suggestion: 'Remove unnecessary politeness and get straight to the instruction'
      });
    }

    // Check for structure (paragraphs, sections)
    const hasStructure = this.prompt.includes('\n\n') ||
                         this.prompt.match(/\n(?:\d+\.|[-*]|\w+:)/);
    if (hasStructure) {
      this.analysisResults.push({
        category: 'Structure',
        status: 'good',
        message: 'Well-structured with sections or lists'
      });
    } else if (length > 200) {
      this.analysisResults.push({
        category: 'Structure',
        status: 'warning',
        message: 'Long prompt without clear structure',
        suggestion: 'Break into sections with headers or numbered lists'
      });
    }

    // Calculate score
    const goodCount = this.analysisResults.filter(r => r.status === 'good').length;
    const totalChecks = this.analysisResults.length;
    this.score = Math.round((goodCount / totalChecks) * 100);
  }

  getScoreClass(): string {
    if (this.score >= 80) return 'text-success';
    if (this.score >= 60) return 'text-warning';
    return 'text-danger';
  }

  getScoreLabel(): string {
    if (this.score >= 80) return 'Excellent';
    if (this.score >= 60) return 'Good';
    if (this.score >= 40) return 'Needs Improvement';
    return 'Poor';
  }

  applyOptimization(): void {
    let optimized = this.prompt;

    // Add role if missing
    if (!this.bestPractices.hasRole.test(optimized)) {
      optimized = `You are a helpful AI assistant.\n\n${optimized}`;
    }

    // Structure improvement
    if (!optimized.includes('\n') && optimized.length > 100) {
      // Try to break into sections
      optimized = optimized.replace(/\.\s+/g, '.\n\n');
    }

    this.prompt = optimized;
    this.analyzePrompt();
  }

  loadExample(type: string): void {
    switch(type) {
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
        this.prompt = `You are a senior data scientist specializing in machine learning.

Task: Extract key information about machine learning models from the following research paper abstract.

Context: This is for a literature review comparing different ML approaches for image classification.

Required fields to extract:
- Model architecture name
- Dataset used
- Accuracy metrics
- Key innovations or techniques

Output format: JSON object with keys: model_name, dataset, accuracy, innovations (array)

Constraints:
- Only extract information explicitly stated in the text
- If a field is not mentioned, use null
- For accuracy, include both the metric name and value

Example:
Input: "We propose ResNet-50 trained on ImageNet achieving 92.1% top-1 accuracy using residual connections."
Output: {
  "model_name": "ResNet-50",
  "dataset": "ImageNet",
  "accuracy": "92.1% top-1",
  "innovations": ["residual connections"]
}

Abstract: [paste abstract here]`;
        break;
    }
    this.analyzePrompt();
  }

  clearPrompt(): void {
    this.prompt = '';
    this.analyzePrompt();
  }
}

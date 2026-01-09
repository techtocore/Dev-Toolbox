import { Component } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface PromptVariable {
  name: string;
  value: string;
  description?: string;
}

interface SavedPromptTemplate {
  name: string;
  template: string;
  variables: PromptVariable[];
}

@Component({
  selector: 'app-prompt-template',
  standalone: false,
  templateUrl: './prompt-template.html',
  styleUrls: ['./prompt-template.scss']
})
export class PromptTemplate {
  template: string = `You are a helpful assistant. Please help the user with the following task:

Task: {{task}}
Context: {{context}}
Output Format: {{format}}`;

  variables: PromptVariable[] = [
    { name: 'task', value: 'Summarize the main points', description: 'The main task or instruction' },
    { name: 'context', value: 'Customer feedback from Q4 2025', description: 'Additional context' },
    { name: 'format', value: 'Bullet points', description: 'Desired output format' }
  ];

  output: string = '';
  savedTemplates: SavedPromptTemplate[] = [];
  currentTemplateName: string = '';
  showSaveDialog: boolean = false;
  showLoadDialog: boolean = false;

  // Predefined templates
  predefinedTemplates: SavedPromptTemplate[] = [
    {
      name: 'Code Review',
      template: `Review the following code and provide feedback:

Language: {{language}}
Code:
\`\`\`
{{code}}
\`\`\`

Focus on: {{focus_areas}}`,
      variables: [
        { name: 'language', value: 'Python', description: 'Programming language' },
        { name: 'code', value: 'def example():\n    pass', description: 'Code to review' },
        { name: 'focus_areas', value: 'performance, security, best practices', description: 'What to focus on' }
      ]
    },
    {
      name: 'Text Summarization',
      template: `Summarize the following text in {{length}} style:

Text: {{text}}

Output format: {{format}}`,
      variables: [
        { name: 'length', value: 'concise', description: 'Summary length (brief, concise, detailed)' },
        { name: 'text', value: 'Your text here...', description: 'Text to summarize' },
        { name: 'format', value: 'bullet points', description: 'Output format' }
      ]
    },
    {
      name: 'Data Extraction',
      template: `Extract the following information from the text:

Fields to extract: {{fields}}

Text: {{text}}

Return as JSON with keys: {{json_keys}}`,
      variables: [
        { name: 'fields', value: 'name, email, phone', description: 'Fields to extract' },
        { name: 'text', value: 'Contact: John Doe, john@example.com, 555-0100', description: 'Source text' },
        { name: 'json_keys', value: 'name, email, phone', description: 'JSON key names' }
      ]
    },
    {
      name: 'Translation',
      template: `Translate the following text from {{source_lang}} to {{target_lang}}:

Text: {{text}}

Tone: {{tone}}`,
      variables: [
        { name: 'source_lang', value: 'English', description: 'Source language' },
        { name: 'target_lang', value: 'Spanish', description: 'Target language' },
        { name: 'text', value: 'Hello, how are you?', description: 'Text to translate' },
        { name: 'tone', value: 'formal', description: 'Desired tone' }
      ]
    }
  ];

  constructor(private utilityService: UtilityService) {
    this.loadTemplatesFromStorage();
    this.generateOutput();
  }

  generateOutput(): void {
    this.output = this.template;

    // Replace all variables in the template
    this.variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, 'g');
      this.output = this.output.replace(regex, variable.value);
    });
  }

  detectVariables(): void {
    // Find all {{variable}} patterns in the template
    const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const matches = this.template.matchAll(regex);
    const detectedVars = new Set<string>();

    for (const match of matches) {
      detectedVars.add(match[1]);
    }

    // Add new variables that don't exist
    detectedVars.forEach(varName => {
      if (!this.variables.find(v => v.name === varName)) {
        this.variables.push({
          name: varName,
          value: '',
          description: ''
        });
      }
    });

    // Remove variables that no longer exist in template
    this.variables = this.variables.filter(v => detectedVars.has(v.name));

    this.generateOutput();
  }

  addVariable(): void {
    const newVarNum = this.variables.length + 1;
    this.variables.push({
      name: `variable${newVarNum}`,
      value: '',
      description: ''
    });
  }

  removeVariable(index: number): void {
    this.variables.splice(index, 1);
    this.generateOutput();
  }

  copyToClipboard(): void {
    this.utilityService.copyToClipboard(this.output);
  }

  downloadPrompt(): void {
    this.utilityService.downloadFile(this.output, 'text/plain', 'prompt.txt');
  }

  saveTemplate(): void {
    if (!this.currentTemplateName.trim()) {
      return;
    }

    const template: SavedPromptTemplate = {
      name: this.currentTemplateName,
      template: this.template,
      variables: JSON.parse(JSON.stringify(this.variables)) // Deep copy
    };

    // Check if template with same name exists
    const existingIndex = this.savedTemplates.findIndex(t => t.name === template.name);
    if (existingIndex >= 0) {
      this.savedTemplates[existingIndex] = template;
    } else {
      this.savedTemplates.push(template);
    }

    this.saveTemplatesToStorage();
    this.showSaveDialog = false;
    this.currentTemplateName = '';
  }

  loadTemplate(template: SavedPromptTemplate): void {
    this.template = template.template;
    this.variables = JSON.parse(JSON.stringify(template.variables)); // Deep copy
    this.generateOutput();
    this.showLoadDialog = false;
  }

  loadPredefinedTemplate(template: SavedPromptTemplate): void {
    this.loadTemplate(template);
  }

  deleteTemplate(index: number): void {
    this.savedTemplates.splice(index, 1);
    this.saveTemplatesToStorage();
  }

  clearTemplate(): void {
    this.template = '';
    this.variables = [];
    this.output = '';
  }

  private saveTemplatesToStorage(): void {
    localStorage.setItem('promptTemplates', JSON.stringify(this.savedTemplates));
  }

  private loadTemplatesFromStorage(): void {
    const stored = localStorage.getItem('promptTemplates');
    if (stored) {
      try {
        this.savedTemplates = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load templates from storage', e);
      }
    }
  }
}

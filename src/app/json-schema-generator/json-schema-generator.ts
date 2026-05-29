import { Component } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface SchemaField {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
  items?: any;
  properties?: any;
}

@Component({
  selector: 'app-json-schema-generator',
  standalone: false,
  templateUrl: './json-schema-generator.html',
  styleUrls: ['./json-schema-generator.scss']
})
export class JsonSchemaGenerator {
  fields: SchemaField[] = [
    { name: 'name', type: 'string', description: 'Full name', required: true },
    { name: 'email', type: 'string', description: 'Email address', required: true },
    { name: 'age', type: 'integer', description: 'Age in years', required: false }
  ];

  schemaTitle: string = 'Person';
  schemaDescription: string = 'A person object with basic information';

  fieldTypes = [
    { value: 'string', label: 'String' },
    { value: 'integer', label: 'Integer' },
    { value: 'number', label: 'Number' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' },
    { value: 'enum', label: 'Enum' }
  ];

  arrayItemType: string = 'string';
  showEnumInput: boolean = false;
  currentEnumField: number = -1;
  enumValues: string = '';

  outputFormat:
    | 'json-schema'
    | 'anthropic-tool'
    | 'openai-tool'
    | 'openai-structured'
    | 'gemini-structured' = 'json-schema';

  // Predefined templates
  templates = [
    {
      name: 'User Profile',
      title: 'UserProfile',
      description: 'A user profile object',
      fields: [
        { name: 'username', type: 'string', description: 'Username', required: true },
        { name: 'email', type: 'string', description: 'Email address', required: true },
        { name: 'age', type: 'integer', description: 'Age', required: false },
        { name: 'isPremium', type: 'boolean', description: 'Premium status', required: false }
      ]
    },
    {
      name: 'Product',
      title: 'Product',
      description: 'An e-commerce product',
      fields: [
        { name: 'id', type: 'string', description: 'Product ID', required: true },
        { name: 'name', type: 'string', description: 'Product name', required: true },
        { name: 'price', type: 'number', description: 'Price in USD', required: true },
        { name: 'inStock', type: 'boolean', description: 'Availability', required: true },
        { name: 'tags', type: 'array', description: 'Product tags', required: false }
      ]
    },
    {
      name: 'Task',
      title: 'Task',
      description: 'A task or todo item',
      fields: [
        { name: 'title', type: 'string', description: 'Task title', required: true },
        { name: 'description', type: 'string', description: 'Task description', required: false },
        { name: 'status', type: 'enum', description: 'Task status', required: true, enum: ['pending', 'in_progress', 'completed'] },
        { name: 'priority', type: 'integer', description: 'Priority (1-5)', required: false }
      ]
    }
  ];

  constructor(private utilityService: UtilityService) {}

  addField(): void {
    this.fields.push({
      name: `field${this.fields.length + 1}`,
      type: 'string',
      description: '',
      required: false
    });
  }

  removeField(index: number): void {
    this.fields.splice(index, 1);
  }

  updateEnumValues(field: SchemaField, value: string): void {
    field.enum = value
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);
  }

  onTypeChange(field: SchemaField, index: number): void {
    if (field.type === 'enum') {
      this.showEnumInput = true;
      this.currentEnumField = index;
      this.enumValues = field.enum?.join(', ') || '';
    } else {
      delete field.enum;
    }

    if (field.type === 'array') {
      field.items = { type: 'string' };
    } else {
      delete field.items;
    }
  }

  saveEnumValues(): void {
    if (this.currentEnumField >= 0) {
      const field = this.fields[this.currentEnumField];
      field.enum = this.enumValues
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
    }
    this.showEnumInput = false;
    this.currentEnumField = -1;
    this.enumValues = '';
  }

  generateSchema(): any {
    const properties: any = {};
    const required: string[] = [];

    this.fields.forEach(field => {
      const propDef: any = {
        description: field.description
      };

      if (field.type === 'enum' && field.enum) {
        propDef.type = 'string';
        propDef.enum = field.enum;
      } else if (field.type === 'array' && field.items) {
        propDef.type = 'array';
        propDef.items = field.items;
      } else {
        propDef.type = field.type;
      }

      properties[field.name] = propDef;

      if (field.required) {
        required.push(field.name);
      }
    });

    const schema: any = {
      type: 'object',
      properties: properties
    };

    if (this.schemaTitle) {
      schema.title = this.schemaTitle;
    }

    if (this.schemaDescription) {
      schema.description = this.schemaDescription;
    }

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  get generatedSchema(): string {
    const schema = this.generateSchema();

    switch (this.outputFormat) {
      case 'anthropic-tool':
        return this.generateAnthropicToolFormat(schema);
      case 'openai-tool':
        return this.generateOpenAIToolFormat(schema);
      case 'openai-structured':
        return this.generateOpenAIStructuredFormat(schema);
      case 'gemini-structured':
        return this.generateGeminiStructuredFormat(schema);
      default:
        return JSON.stringify(schema, null, 2);
    }
  }

  private get toolName(): string {
    const base = (this.schemaTitle || 'extract_data')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return base || 'extract_data';
  }

  generateAnthropicToolFormat(schema: any): string {
    const example = {
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      tools: [
        {
          name: this.toolName,
          description:
            schema.description ||
            `Extract data conforming to the ${schema.title || 'schema'}.`,
          input_schema: schema
        }
      ],
      tool_choice: { type: 'tool', name: this.toolName },
      messages: [
        {
          role: 'user',
          content: 'Extract the structured fields from the following text:\n\n<text>\n...\n</text>'
        }
      ]
    };
    return JSON.stringify(example, null, 2);
  }

  generateOpenAIToolFormat(schema: any): string {
    // Modern OpenAI Chat Completions tools API.
    const example = {
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: 'You extract structured data from text.' },
        { role: 'user', content: 'Extract the structured fields from the following text...' }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: this.toolName,
            description:
              schema.description ||
              `Extract data conforming to the ${schema.title || 'schema'}.`,
            parameters: schema,
            strict: true
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: this.toolName } }
    };
    return JSON.stringify(example, null, 2);
  }

  generateOpenAIStructuredFormat(schema: any): string {
    // OpenAI Structured Outputs (response_format json_schema). Requires `strict: true`
    // and every property listed in `required`. Mirrors the schema as-is.
    const strictSchema = this.toStrictSchema(schema);

    const example = {
      model: 'gpt-5.1',
      messages: [
        { role: 'system', content: 'You extract structured data from text.' },
        { role: 'user', content: 'Extract the structured fields from the following text...' }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: this.toolName,
          description: schema.description || `Structured ${schema.title || 'output'}`,
          strict: true,
          schema: strictSchema
        }
      }
    };
    return JSON.stringify(example, null, 2);
  }

  generateGeminiStructuredFormat(schema: any): string {
    // Gemini structured output via generationConfig.responseSchema.
    // Gemini's schema dialect ignores $schema, title, description on the root;
    // we strip them for clarity.
    const responseSchema = this.toGeminiSchema(schema);

    const example = {
      model: 'gemini-3-pro',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Extract the structured fields from the following text...' }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    };
    return JSON.stringify(example, null, 2);
  }

  // OpenAI Structured Outputs requires every property in `required` and no
  // additional properties. Apply both recursively.
  private toStrictSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    const out: any = Array.isArray(schema) ? [] : { ...schema };

    if (out.type === 'object' && out.properties) {
      out.required = Object.keys(out.properties);
      out.additionalProperties = false;
      const props: any = {};
      for (const key of Object.keys(out.properties)) {
        props[key] = this.toStrictSchema(out.properties[key]);
      }
      out.properties = props;
    }
    if (out.type === 'array' && out.items) {
      out.items = this.toStrictSchema(out.items);
    }
    return out;
  }

  private toGeminiSchema(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;
    // Strip JSON-Schema-isms Gemini doesn't accept on the root.
    const { $schema, title, ...rest } = schema;
    if (rest.properties) {
      const props: any = {};
      for (const key of Object.keys(rest.properties)) {
        props[key] = this.toGeminiSchema(rest.properties[key]);
      }
      rest.properties = props;
    }
    if (rest.items) {
      rest.items = this.toGeminiSchema(rest.items);
    }
    return rest;
  }

  copyToClipboard(): void {
    this.utilityService.copyToClipboard(this.generatedSchema);
  }

  downloadSchema(): void {
    const filename = `${this.schemaTitle.toLowerCase().replace(/\s+/g, '-')}-schema.json`;
    this.utilityService.downloadFile(this.generatedSchema, 'application/json', filename);
  }

  loadTemplate(template: any): void {
    this.schemaTitle = template.title;
    this.schemaDescription = template.description;
    this.fields = JSON.parse(JSON.stringify(template.fields));
  }

  clearAll(): void {
    this.fields = [];
    this.schemaTitle = '';
    this.schemaDescription = '';
  }

  importPanelOpen = false;
  importJsonInput = '';
  importError = '';

  toggleImportPanel(): void {
    this.importPanelOpen = !this.importPanelOpen;
    this.importError = '';
  }

  doImport(): void {
    this.importError = '';
    if (!this.importJsonInput.trim()) {
      this.importError = 'Paste a sample JSON object first.';
      return;
    }
    try {
      const obj = JSON.parse(this.importJsonInput);
      const sample = Array.isArray(obj)
        ? (obj[0] ?? {})
        : obj;
      if (typeof sample !== 'object' || sample === null) {
        this.importError = 'Expected an object (or array of objects). Got primitive.';
        return;
      }
      this.inferSchemaFromObject(sample);
      this.importPanelOpen = false;
      this.importJsonInput = '';
    } catch (e: any) {
      this.importError = `Could not parse JSON: ${e?.message || 'invalid input'}`;
    }
  }

  importFromJSON(): void {
    // Legacy entry point — open the inline panel instead of using prompt().
    this.toggleImportPanel();
  }

  inferSchemaFromObject(obj: any): void {
    this.fields = Object.keys(obj).map(key => {
      const value = obj[key];
      const fieldType = this.inferType(value);
      const field: SchemaField = {
        name: key,
        type: fieldType,
        description: `Inferred ${fieldType} field`,
        required: value !== null && value !== undefined
      };
      if (fieldType === 'array') {
        const sample = Array.isArray(value) && value.length > 0 ? value[0] : null;
        field.items = { type: this.inferType(sample) };
      }
      return field;
    });
  }

  private inferType(value: any): string {
    if (value === null || value === undefined) return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    return 'string';
  }
}

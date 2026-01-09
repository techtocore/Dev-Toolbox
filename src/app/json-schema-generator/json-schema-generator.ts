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

  outputFormat: 'json-schema' | 'anthropic' | 'openai' = 'json-schema';

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

    if (this.outputFormat === 'anthropic') {
      return this.generateAnthropicFormat(schema);
    } else if (this.outputFormat === 'openai') {
      return this.generateOpenAIFormat(schema);
    }

    return JSON.stringify(schema, null, 2);
  }

  generateAnthropicFormat(schema: any): string {
    const anthropicExample = {
      model: 'claude-sonnet-4.5',
      messages: [
        {
          role: 'user',
          content: 'Extract the following information...'
        }
      ],
      tools: [
        {
          name: 'extract_data',
          description: `Extract data according to the ${schema.title || 'schema'}`,
          input_schema: schema
        }
      ],
      tool_choice: { type: 'tool', name: 'extract_data' }
    };

    return JSON.stringify(anthropicExample, null, 2);
  }

  generateOpenAIFormat(schema: any): string {
    const openAIExample = {
      model: 'gpt-4',
      messages: [
        {
          role: 'user',
          content: 'Extract the following information...'
        }
      ],
      functions: [
        {
          name: 'extract_data',
          description: `Extract data according to the ${schema.title || 'schema'}`,
          parameters: schema
        }
      ],
      function_call: { name: 'extract_data' }
    };

    return JSON.stringify(openAIExample, null, 2);
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

  importFromJSON(): void {
    const input = prompt('Paste a sample JSON object:');
    if (!input) return;

    try {
      const obj = JSON.parse(input);
      this.inferSchemaFromObject(obj);
    } catch (e) {
      alert('Invalid JSON');
    }
  }

  inferSchemaFromObject(obj: any, prefix: string = ''): void {
    this.fields = [];

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const fieldName = prefix ? `${prefix}.${key}` : key;

      let fieldType: string;
      if (Array.isArray(value)) {
        fieldType = 'array';
      } else if (value === null) {
        fieldType = 'string';
      } else if (typeof value === 'object') {
        fieldType = 'object';
      } else if (typeof value === 'boolean') {
        fieldType = 'boolean';
      } else if (typeof value === 'number') {
        fieldType = Number.isInteger(value) ? 'integer' : 'number';
      } else {
        fieldType = 'string';
      }

      this.fields.push({
        name: fieldName,
        type: fieldType,
        description: `Inferred ${fieldType} field`,
        required: true
      });
    });
  }
}

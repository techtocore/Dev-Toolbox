import { Injectable } from '@angular/core';

export interface Tool {
  name: string;
  description: string;
  route: string;
  category: string;
  icon?: string;
  keywords?: string[];
}

/**
 * ToolsService - Centralized service for managing all tools in the Dev-Toolbox
 * 
 * HOW TO ADD A NEW TOOL:
 * 1. Add a new Tool object to the 'tools' array below with these properties:
 *    - name: Display name of the tool
 *    - description: Brief description of what the tool does
 *    - route: Angular route path (e.g., '/myNewTool')
 *    - category: One of the existing categories or create a new one
 *    - icon: (optional) Bootstrap icon class (e.g., 'bi-wrench')
 *    - keywords: (optional) Array of search terms for better discoverability
 * 
 * 2. That's it! The tool will automatically appear in:
 *    - Sidebar menu (under its category)
 *    - Home page search (with autocomplete)
 *    - Search results (filterable by name, description, category, or keywords)
 * 
 * Example:
 * {
 *   name: 'My New Tool',
 *   description: 'Does something useful',
 *   route: '/myNewTool',
 *   category: 'Development Tools',
 *   icon: 'bi-wrench',
 *   keywords: ['tool', 'useful', 'helper']
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class ToolsService {
  private tools: Tool[] = [
    {
      name: 'Base64 Encode/Decode',
      description: 'Convert text to/from Base64 encoding',
      route: '/base64',
      category: 'Cryptography',
      icon: 'bi-file-earmark-binary',
      keywords: ['base64', 'encode', 'decode', 'encoding']
    },
    {
      name: 'URL Encode/Decode',
      description: 'Encode/decode URL parameters and strings',
      route: '/urlEncode',
      category: 'Cryptography',
      icon: 'bi-link-45deg',
      keywords: ['url', 'encode', 'decode', 'uri', 'percent']
    },
    {
      name: 'Hash Generator',
      description: 'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes',
      route: '/hashGenerator',
      category: 'Cryptography',
      icon: 'bi-hash',
      keywords: ['hash', 'md5', 'sha', 'sha1', 'sha256', 'sha512', 'checksum']
    },
    {
      name: 'JWT Decoder',
      description: 'Decode and inspect JWT tokens',
      route: '/jwtDecoder',
      category: 'Cryptography',
      icon: 'bi-shield-lock',
      keywords: ['jwt', 'json', 'web', 'token', 'decode', 'bearer']
    },
    {
      name: 'Certificate Information',
      description: 'Extract and view X.509 certificate details',
      route: '/certinfo',
      category: 'Cryptography',
      icon: 'bi-award',
      keywords: ['certificate', 'cert', 'x509', 'ssl', 'tls', 'pem']
    },
    {
      name: 'Markdown Editor',
      description: 'Live markdown preview and editing',
      route: '/markdown',
      category: 'Text Processing',
      icon: 'bi-markdown',
      keywords: ['markdown', 'md', 'editor', 'preview', 'wysiwyg']
    },
    {
      name: 'Word Counter',
      description: 'Analyze text statistics (words, characters, lines)',
      route: '/wordCount',
      category: 'Text Processing',
      icon: 'bi-calculator',
      keywords: ['word', 'count', 'character', 'text', 'statistics']
    },
    {
      name: 'Diff Checker',
      description: 'Compare two text blocks with side-by-side difference highlighting',
      route: '/diffChecker',
      category: 'Text Processing',
      icon: 'bi-file-diff',
      keywords: ['diff', 'compare', 'difference', 'text', 'compare']
    },
    {
      name: 'JSON Formatter',
      description: 'Validate and pretty-print JSON with syntax highlighting',
      route: '/jsonFormatter',
      category: 'Parsing & Formatting',
      icon: 'bi-braces',
      keywords: ['json', 'format', 'pretty', 'validate', 'parse']
    },
    {
      name: 'Timestamp Converter',
      description: 'Convert between Unix timestamps, ISO 8601, and human-readable formats',
      route: '/timestampConverter',
      category: 'Parsing & Formatting',
      icon: 'bi-clock-history',
      keywords: ['timestamp', 'unix', 'epoch', 'date', 'time', 'iso', 'convert']
    },
    {
      name: 'Numeric Summary',
      description: 'Statistical analysis of numeric data',
      route: '/numericSummary',
      category: 'Statistics',
      icon: 'bi-graph-up',
      keywords: ['statistics', 'numeric', 'mean', 'median', 'mode', 'stats', 'analysis']
    },
    {
      name: 'UUID Generator',
      description: 'Generate multiple UUIDs (v4) at once',
      route: '/uuidGenerator',
      category: 'Development Tools',
      icon: 'bi-fingerprint',
      keywords: ['uuid', 'guid', 'generate', 'random', 'unique']
    },
    {
      name: 'Color Converter',
      description: 'Convert between HEX, RGB, and HSL color formats',
      route: '/colorConverter',
      category: 'Development Tools',
      icon: 'bi-palette',
      keywords: ['color', 'hex', 'rgb', 'hsl', 'convert', 'picker']
    },
    {
      name: 'Regex Tester',
      description: 'Test regular expressions with live matching and highlighting',
      route: '/regexTester',
      category: 'Development Tools',
      icon: 'bi-regex',
      keywords: ['regex', 'regexp', 'regular', 'expression', 'pattern', 'match', 'test']
    }
  ];

  constructor() { }

  getAllTools(): Tool[] {
    return this.tools;
  }

  searchTools(query: string): Tool[] {
    if (!query || query.trim() === '') {
      return this.tools;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return this.tools.filter(tool => {
      const nameMatch = tool.name.toLowerCase().includes(searchTerm);
      const descMatch = tool.description.toLowerCase().includes(searchTerm);
      const categoryMatch = tool.category.toLowerCase().includes(searchTerm);
      const keywordMatch = tool.keywords?.some(k => k.toLowerCase().includes(searchTerm));
      
      return nameMatch || descMatch || categoryMatch || keywordMatch;
    });
  }

  getToolsByCategory(category: string): Tool[] {
    return this.tools.filter(tool => tool.category === category);
  }

  getCategories(): string[] {
    return [...new Set(this.tools.map(tool => tool.category))];
  }

  getMenuData() {
    const categories = this.getCategories();
    const menuData: any[] = [
      {
        "text": "Home",
        "icon": "bi bi-house",
        "link": "/"
      }
    ];

    categories.forEach(category => {
      const tools = this.getToolsByCategory(category);
      menuData.push({
        "text": category,
        "items": tools.map(tool => ({
          "text": tool.name,
          "link": tool.route
        }))
      });
    });

    return menuData;
  }
}

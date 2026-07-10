import { Injectable } from '@angular/core';

export interface Tool {
  name: string;
  description: string;
  route: string;
  category: string;
  icon?: string;
  keywords?: string[];
  /** Highlighted on the homepage as a flagship/representative tool. */
  featured?: boolean;
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
    // ── AI & Machine Learning ───────────────────────────────────────────────
    // Led by the flagship on-device LLM — the app's standout capability.
    {
      name: 'Local AI (Chat)',
      description: 'Run a small language model fully in your browser via WebGPU — no server, fully private',
      route: '/localAi',
      category: 'AI & Machine Learning',
      icon: 'bi-cpu',
      keywords: ['local', 'ai', 'llm', 'webgpu', 'offline', 'private', 'on-device', 'slm', 'qwen', 'chat', 'webllm'],
      featured: true
    },
    {
      name: 'Token Counter & Cost Estimator',
      description: 'Estimate token counts and API costs for different LLM providers',
      route: '/tokenCounter',
      category: 'AI & Machine Learning',
      icon: 'bi-calculator',
      keywords: ['token', 'cost', 'llm', 'openai', 'anthropic', 'pricing', 'estimate']
    },
    {
      name: 'Prompt Optimizer',
      description: 'Score prompts against best practices, then rewrite them with an on-device AI',
      route: '/promptOptimizer',
      category: 'AI & Machine Learning',
      icon: 'bi-lightbulb',
      keywords: ['prompt', 'optimize', 'improve', 'llm', 'ai', 'best', 'practices', 'rewrite', 'slm', 'local', 'on-device']
    },
    {
      name: 'Prompt Template Builder',
      description: 'Create reusable prompt templates with variables for LLM interactions',
      route: '/promptTemplate',
      category: 'AI & Machine Learning',
      icon: 'bi-chat-left-text',
      keywords: ['prompt', 'template', 'llm', 'ai', 'gpt', 'claude', 'variables']
    },
    {
      name: 'JSON Schema Generator',
      description: 'Generate JSON schemas for LLM outputs — or describe your data and let on-device AI build the fields',
      route: '/jsonSchemaGenerator',
      category: 'AI & Machine Learning',
      icon: 'bi-diagram-3',
      keywords: ['json', 'schema', 'llm', 'function', 'calling', 'structured', 'output', 'ai', 'describe', 'generate', 'slm']
    },

    // ── Parsing & Formatting ────────────────────────────────────────────────
    {
      name: 'JSON Formatter',
      description: 'Validate and pretty-print JSON with syntax highlighting',
      route: '/jsonFormatter',
      category: 'Parsing & Formatting',
      icon: 'bi-braces',
      keywords: ['json', 'format', 'pretty', 'validate', 'parse'],
      featured: true
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
      name: 'JSON to TypeScript',
      description: 'Generate TypeScript interfaces or type aliases from a JSON sample',
      route: '/jsonToTypescript',
      category: 'Parsing & Formatting',
      icon: 'bi-filetype-tsx',
      keywords: ['json', 'typescript', 'ts', 'interface', 'type', 'generate', 'model', 'dto', 'codegen', 'convert']
    },

    // ── Encoding & Security ─────────────────────────────────────────────────
    {
      name: 'Base64 Encode/Decode',
      description: 'Convert text to/from Base64 encoding',
      route: '/base64',
      category: 'Encoding & Security',
      icon: 'bi-file-earmark-binary',
      keywords: ['base64', 'encode', 'decode', 'encoding'],
      featured: true
    },
    {
      name: 'Hash Generator',
      description: 'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes',
      route: '/hashGenerator',
      category: 'Encoding & Security',
      icon: 'bi-hash',
      keywords: ['hash', 'md5', 'sha', 'sha1', 'sha256', 'sha512', 'checksum']
    },
    {
      name: 'JWT Decoder',
      description: 'Decode and inspect JWT tokens',
      route: '/jwtDecoder',
      category: 'Encoding & Security',
      icon: 'bi-shield-lock',
      keywords: ['jwt', 'json', 'web', 'token', 'decode', 'bearer']
    },
    {
      name: 'URL Encode/Decode',
      description: 'Encode/decode URL parameters and strings',
      route: '/urlEncode',
      category: 'Encoding & Security',
      icon: 'bi-link-45deg',
      keywords: ['url', 'encode', 'decode', 'uri', 'percent']
    },
    {
      name: 'Certificate Information',
      description: 'Extract and view X.509 certificate details',
      route: '/certinfo',
      category: 'Encoding & Security',
      icon: 'bi-award',
      keywords: ['certificate', 'cert', 'x509', 'ssl', 'tls', 'pem']
    },
    {
      name: 'Password & Passphrase Generator',
      description: 'Generate strong passwords and memorable passphrases locally with the Web Crypto CSPRNG — never transmitted',
      route: '/passwordGenerator',
      category: 'Encoding & Security',
      icon: 'bi-key',
      keywords: ['password', 'passphrase', 'generator', 'random', 'secret', 'secure', 'entropy', 'diceware', 'strong', 'crypto']
    },

    // ── Data Analysis ───────────────────────────────────────────────────────
    {
      name: 'CSV/JSON Converter',
      description: 'Convert between CSV and JSON formats with customizable options',
      route: '/csvJsonConverter',
      category: 'Data Analysis',
      icon: 'bi-arrow-left-right',
      keywords: ['csv', 'json', 'convert', 'data', 'transform', 'format'],
      featured: true
    },
    {
      name: 'Data Profiler',
      description: 'Analyze data quality, statistics, and patterns — with optional on-device AI insights',
      route: '/dataProfiler',
      category: 'Data Analysis',
      icon: 'bi-bar-chart-line',
      keywords: ['data', 'profile', 'quality', 'statistics', 'analysis', 'insights', 'ai', 'explain', 'slm']
    },
    {
      name: 'SQL Query Builder',
      description: 'Build SQL queries visually, or describe them in plain English with on-device AI',
      route: '/sqlQueryBuilder',
      category: 'Data Analysis',
      icon: 'bi-database',
      keywords: ['sql', 'query', 'builder', 'database', 'select', 'where', 'join', 'ai', 'natural language', 'text to sql', 'generate', 'slm']
    },
    {
      name: 'Numeric Summary',
      description: 'Statistical analysis of numeric data',
      route: '/numericSummary',
      category: 'Data Analysis',
      icon: 'bi-graph-up',
      keywords: ['statistics', 'numeric', 'mean', 'median', 'mode', 'stats', 'analysis']
    },

    // ── Text Processing ─────────────────────────────────────────────────────
    {
      name: 'Diff Checker',
      description: 'Compare two text blocks with side-by-side difference highlighting',
      route: '/diffChecker',
      category: 'Text Processing',
      icon: 'bi-file-diff',
      keywords: ['diff', 'compare', 'difference', 'text', 'compare'],
      featured: true
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
      name: 'Case Converter',
      description: 'Convert text between camelCase, snake_case, kebab-case, CONSTANT_CASE, Title Case and more',
      route: '/caseConverter',
      category: 'Text Processing',
      icon: 'bi-type',
      keywords: ['case', 'camel', 'camelcase', 'snake', 'snake_case', 'kebab', 'pascal', 'constant', 'title', 'sentence', 'slug', 'uppercase', 'lowercase', 'convert', 'text']
    },

    // ── Development Tools ───────────────────────────────────────────────────
    {
      name: 'Regex Tester',
      description: 'Test regex with live highlighting — or generate one from plain English with on-device AI',
      route: '/regexTester',
      category: 'Development Tools',
      icon: 'bi-regex',
      keywords: ['regex', 'regexp', 'regular', 'expression', 'pattern', 'match', 'test', 'ai', 'generate', 'natural language', 'describe', 'slm'],
      featured: true
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
      name: 'IP & Browser Info',
      description: 'View your public IP, ISP, location, timezone, and browser details',
      route: '/ipInfo',
      category: 'Development Tools',
      icon: 'bi-globe',
      keywords: ['ip', 'address', 'isp', 'hostname', 'location', 'timezone', 'browser', 'user agent', 'geolocation', 'network']
    },
    {
      name: 'QR Code Generator',
      description: 'Create QR codes from text, URLs, or Wi-Fi credentials — rendered locally, download as PNG or SVG',
      route: '/qrCode',
      category: 'Development Tools',
      icon: 'bi-qr-code',
      keywords: ['qr', 'qrcode', 'barcode', 'generate', 'wifi', 'url', 'vcard', 'png', 'svg', 'scan']
    },
    {
      name: 'Number Base Converter',
      description: 'Convert integers between binary, octal, decimal, hex, and any base from 2 to 36',
      route: '/baseConverter',
      category: 'Development Tools',
      icon: 'bi-123',
      keywords: ['base', 'radix', 'binary', 'octal', 'decimal', 'hexadecimal', 'hex', 'convert', 'number', 'bigint', 'bits', 'bitwise']
    },
    {
      name: 'Cron Expression Helper',
      description: 'Explain a cron schedule in plain English and preview its next run times',
      route: '/cronHelper',
      category: 'Development Tools',
      icon: 'bi-alarm',
      keywords: ['cron', 'crontab', 'schedule', 'expression', 'job', 'timer', 'next run', 'parser', 'explain', 'quartz']
    },

    // ── Device & Sensors ────────────────────────────────────────────────────
    // On-device hardware sensors with graceful fallbacks when a form factor
    // (e.g. desktop) lacks the sensor.
    {
      name: 'Bubble Level',
      description: 'Turn your phone into a spirit level using its motion sensor — bullseye, calibration, and haptics',
      route: '/bubbleLevel',
      category: 'Device & Sensors',
      icon: 'bi-bullseye',
      keywords: ['level', 'bubble', 'spirit', 'tilt', 'angle', 'accelerometer', 'gyroscope', 'orientation', 'sensor', 'inclinometer', 'flat'],
      featured: true
    },
    {
      name: 'Compass',
      description: 'A magnetic compass powered by your device\'s magnetometer, with a live rotating rose',
      route: '/compass',
      category: 'Device & Sensors',
      icon: 'bi-compass',
      keywords: ['compass', 'heading', 'bearing', 'north', 'magnetometer', 'direction', 'orientation', 'sensor', 'navigation']
    },
    {
      name: 'Sound Level Meter',
      description: 'Live microphone loudness meter with peak/average stats — works on desktop and mobile',
      route: '/soundMeter',
      category: 'Device & Sensors',
      icon: 'bi-soundwave',
      keywords: ['sound', 'noise', 'decibel', 'db', 'spl', 'loudness', 'microphone', 'mic', 'meter', 'audio', 'volume', 'sensor']
    },

    // ── PDF Tools ───────────────────────────────────────────────────────────
    // 100% in-browser PDF editing via pdf-lib — files never leave the device.
    {
      name: 'Merge PDF',
      description: 'Combine multiple PDF files into one document, fully in your browser',
      route: '/pdfMerge',
      category: 'PDF Tools',
      icon: 'bi-file-earmark-pdf',
      keywords: ['pdf', 'merge', 'combine', 'join', 'concatenate', 'documents', 'append'],
      featured: true
    },
    {
      name: 'Split / Extract PDF',
      description: 'Pull a page range out of a PDF into a new file — no upload, no server',
      route: '/pdfSplit',
      category: 'PDF Tools',
      icon: 'bi-scissors',
      keywords: ['pdf', 'split', 'extract', 'pages', 'range', 'separate', 'divide']
    },
    {
      name: 'Organize PDF',
      description: 'Reorder, rotate, and delete pages, then download the rebuilt PDF',
      route: '/pdfOrganize',
      category: 'PDF Tools',
      icon: 'bi-files',
      keywords: ['pdf', 'organize', 'reorder', 'rotate', 'delete', 'pages', 'rearrange', 'remove']
    },
    {
      name: 'Images to PDF',
      description: 'Combine JPG/PNG images into a single PDF with A4, Letter, or fit-to-image pages',
      route: '/imagesToPdf',
      category: 'PDF Tools',
      icon: 'bi-images',
      keywords: ['pdf', 'image', 'jpg', 'jpeg', 'png', 'convert', 'combine', 'photo', 'scan']
    },

    // ── Image & Media ───────────────────────────────────────────────────────
    // Canvas / EXIF tooling that never uploads your images.
    {
      name: 'Image Resizer & Compressor',
      description: 'Resize, compress, and convert images (PNG/JPEG/WebP) locally with a before/after size view',
      route: '/imageResizer',
      category: 'Image & Media',
      icon: 'bi-aspect-ratio',
      keywords: ['image', 'resize', 'compress', 'convert', 'png', 'jpeg', 'webp', 'optimize', 'shrink', 'photo'],
      featured: true
    },
    {
      name: 'Image Metadata Viewer & Stripper',
      description: 'Inspect EXIF/GPS metadata in a photo and download a stripped, share-safe copy',
      route: '/imageMetadata',
      category: 'Image & Media',
      icon: 'bi-geo-alt',
      keywords: ['exif', 'metadata', 'gps', 'strip', 'privacy', 'image', 'photo', 'location', 'camera', 'remove']
    },
    {
      name: 'Image to Base64 Data URI',
      description: 'Convert an image to a Base64 data URI (with CSS/HTML snippets) and back, in-browser',
      route: '/imageBase64',
      category: 'Image & Media',
      icon: 'bi-filetype-raw',
      keywords: ['image', 'base64', 'data uri', 'datauri', 'inline', 'css', 'encode', 'decode', 'embed']
    }
  ];

  constructor() { }

  getAllTools(): Tool[] {
    return this.tools;
  }

  /** Flagship tools highlighted on the homepage (one per category). */
  getFeaturedTools(): Tool[] {
    return this.tools.filter(tool => tool.featured);
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

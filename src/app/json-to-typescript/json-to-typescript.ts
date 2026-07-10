import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface Block {
  name: string;
  lines: string[];
}

const SAMPLE = `{
  "id": 42,
  "name": "Ada Lovelace",
  "active": true,
  "roles": ["admin", "user"],
  "profile": {
    "email": "ada@example.com",
    "age": null,
    "social": { "github": "ada" }
  },
  "posts": [
    { "title": "Hello", "views": 10 },
    { "title": "World", "views": 20, "pinned": true }
  ]
}`;

/**
 * JSON → TypeScript — infer TypeScript interfaces (or type aliases) from a
 * sample JSON payload. Nested objects become their own named interfaces; arrays
 * of objects are *merged* into a single shape where keys missing from some
 * elements are marked optional and differing value types form a union. Runs
 * entirely client-side.
 */
@Component({
  selector: 'app-json-to-typescript',
  standalone: false,
  templateUrl: './json-to-typescript.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './json-to-typescript.scss',
})
export class JsonToTypescript implements OnInit {
  input = SAMPLE;
  rootName = 'Root';
  useType = false;      // false = interface, true = type alias
  exportDecls = true;

  output = '';
  error: string | null = null;
  interfaceCount = 0;
  isMobile = false;

  private blocks: Block[] = [];
  private usedNames = new Set<string>();

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.generate();
  }

  generate(): void {
    this.error = null;
    this.output = '';
    this.interfaceCount = 0;
    this.blocks = [];
    this.usedNames = new Set();

    const text = this.input.trim();
    if (!text) return;

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (e) {
      this.error = `Invalid JSON — ${(e as Error).message}`;
      return;
    }

    let rootBlockName: string | null = null;
    let rootAlias: string | null = null;

    if (this.isPlainObject(data)) {
      rootBlockName = this.mergeObjectsType([data], this.rootName || 'Root');
    } else if (Array.isArray(data)) {
      const base = this.pascal(this.rootName || 'Root');
      let hint = this.singular(base);
      if (hint === base) hint += 'Item';
      const inner = this.unionTypeForValues(data, hint);
      rootAlias = (inner.includes(' | ') ? `(${inner})` : inner) + '[]';
    } else {
      rootAlias = this.primType(data);
    }

    this.interfaceCount = this.blocks.length;
    this.output = this.emit(rootBlockName, rootAlias);
  }

  // ------------------------------------------------------------ type inference

  private isPlainObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  /** Type of a *set* of values (a key across merged objects, or array items). */
  private unionTypeForValues(values: unknown[], nameHint: string): string {
    const objs = values.filter((v) => this.isPlainObject(v)) as Record<string, unknown>[];
    const arrs = values.filter((v) => Array.isArray(v)) as unknown[][];
    const prims = values.filter((v) => !this.isPlainObject(v) && !Array.isArray(v));

    const parts: string[] = [];
    if (objs.length) parts.push(this.mergeObjectsType(objs, nameHint));
    if (arrs.length) {
      const allElements = ([] as unknown[]).concat(...arrs);
      const el = this.unionTypeForValues(allElements, this.singular(nameHint));
      parts.push((el.includes(' | ') ? `(${el})` : el) + '[]');
    }
    for (const v of prims) parts.push(this.primType(v));

    const unique = [...new Set(parts)];
    if (unique.length === 0) return 'unknown';
    return unique.join(' | ');
  }

  /** Merge one or more objects into a single named interface, returning its name. */
  private mergeObjectsType(objs: Record<string, unknown>[], nameHint: string): string {
    const name = this.uniqueName(nameHint);
    this.usedNames.add(name);

    // Union of keys, in first-seen order.
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const o of objs) {
      for (const k of Object.keys(o)) {
        if (!seen.has(k)) {
          seen.add(k);
          keys.push(k);
        }
      }
    }

    const lines: string[] = [];
    for (const k of keys) {
      const present = objs.filter((o) => Object.prototype.hasOwnProperty.call(o, k));
      const optional = present.length < objs.length;
      const values = present.map((o) => o[k]);
      const type = this.unionTypeForValues(values, this.pascal(k));
      lines.push(`  ${this.propName(k)}${optional ? '?' : ''}: ${type};`);
    }

    this.blocks.push({ name, lines });
    return name;
  }

  private primType(v: unknown): string {
    if (v === null) return 'null';
    switch (typeof v) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      default: return 'unknown';
    }
  }

  // ------------------------------------------------------------------ emitting

  private emit(rootBlockName: string | null, rootAlias: string | null): string {
    const kw = this.exportDecls ? 'export ' : '';
    const parts: string[] = [];

    if (rootAlias !== null) {
      parts.push(`${kw}type ${this.pascal(this.rootName || 'Root')} = ${rootAlias};`);
    }

    let ordered: Block[];
    if (rootBlockName) {
      const root = this.blocks.filter((b) => b.name === rootBlockName);
      const rest = this.blocks.filter((b) => b.name !== rootBlockName).reverse();
      ordered = [...root, ...rest];
    } else {
      ordered = this.blocks.slice().reverse();
    }

    for (const b of ordered) parts.push(this.renderBlock(b, kw));
    return parts.join('\n\n');
  }

  private renderBlock(b: Block, kw: string): string {
    if (b.lines.length === 0) {
      return this.useType ? `${kw}type ${b.name} = {};` : `${kw}interface ${b.name} {}`;
    }
    const body = b.lines.join('\n');
    return this.useType
      ? `${kw}type ${b.name} = {\n${body}\n};`
      : `${kw}interface ${b.name} {\n${body}\n}`;
  }

  // ------------------------------------------------------------------- helpers

  private propName(key: string): string {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
  }

  /** PascalCase an arbitrary key/name, guaranteeing a valid identifier. */
  private pascal(s: string): string {
    const words = s
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    let name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    if (!name) name = 'Object';
    if (/^[0-9]/.test(name)) name = 'N' + name;
    return name;
  }

  private uniqueName(base: string): string {
    const name = this.pascal(base);
    if (!this.usedNames.has(name)) return name;
    let i = 2;
    while (this.usedNames.has(name + i)) i++;
    return name + i;
  }

  private singular(s: string): string {
    if (/ies$/i.test(s)) return s.replace(/ies$/i, 'y');
    if (/(ses|xes|zes|ches|shes)$/i.test(s)) return s.replace(/es$/i, '');
    if (/ss$/i.test(s)) return s;
    if (/s$/i.test(s)) return s.replace(/s$/i, '');
    return s;
  }

  // --------------------------------------------------------------------- UI

  loadSample(): void {
    this.input = SAMPLE;
    this.generate();
  }

  clear(): void {
    this.input = '';
    this.generate();
  }

  copyOutput(): void {
    if (!this.output) return;
    this.utilityService.copyToClipboard(this.output, { label: 'TypeScript copied' });
  }

  downloadOutput(): void {
    if (!this.output) return;
    const file = `${this.pascal(this.rootName || 'Root')}.ts`;
    this.utilityService.downloadFile(this.output, 'text/typescript', file);
  }
}

import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

type GenMode = 'password' | 'passphrase';
type Separator = '-' | '_' | '.' | ' ';

@Component({
  selector: 'app-password-generator',
  standalone: false,
  templateUrl: './password-generator.html',
  styleUrl: './password-generator.scss',
})
export class PasswordGenerator implements OnInit {
  mode: GenMode = 'password';

  // --- Password options ---
  length = 20;
  useUppercase = true;
  useLowercase = true;
  useDigits = true;
  useSymbols = true;
  excludeAmbiguous = false;

  // --- Passphrase options ---
  wordCount = 4;
  separator: Separator = '-';
  capitalizeWords = true;
  appendNumber = true;

  separators: { value: Separator; label: string }[] = [
    { value: '-', label: 'Hyphen ( - )' },
    { value: '_', label: 'Underscore ( _ )' },
    { value: '.', label: 'Dot ( . )' },
    { value: ' ', label: 'Space (   )' },
  ];

  // --- Output / metrics ---
  result = '';
  entropyBits = 0;
  errorMessage = '';

  // ~120 short, common, easy-to-read words.
  private readonly words: string[] = [
    'able', 'acid', 'aged', 'also', 'apex', 'arch', 'army', 'atom', 'aqua', 'aura',
    'bake', 'bald', 'band', 'bark', 'beam', 'bean', 'bear', 'bell', 'bird', 'blue',
    'boat', 'bold', 'bone', 'book', 'boss', 'brave', 'brick', 'cake', 'calm', 'cape',
    'cave', 'cell', 'chip', 'city', 'clay', 'club', 'coal', 'coin', 'cold', 'colt',
    'cool', 'corn', 'cube', 'cyan', 'dawn', 'deck', 'deer', 'desk', 'dice', 'dock',
    'dome', 'door', 'dove', 'drum', 'dune', 'dust', 'echo', 'edge', 'fawn', 'fern',
    'fire', 'fish', 'flag', 'flax', 'foam', 'fork', 'frog', 'fuel', 'gate', 'gear',
    'gift', 'glow', 'gold', 'gulf', 'hawk', 'haze', 'herb', 'hill', 'hive', 'iris',
    'iron', 'jade', 'kite', 'lake', 'lamp', 'leaf', 'lime', 'lion', 'lock', 'loop',
    'mage', 'maple', 'mesa', 'mint', 'mist', 'moon', 'moss', 'nest', 'node', 'oak',
    'oasis', 'opal', 'orca', 'palm', 'peak', 'pear', 'pine', 'plum', 'pond', 'rain',
    'reef', 'rock', 'rose', 'ruby', 'sage', 'salt', 'sand', 'seal', 'ship', 'silk',
    'snow', 'star', 'surf', 'swan', 'tide', 'vine', 'wave', 'wolf', 'wood', 'zinc',
  ];

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.generate();
  }

  setMode(mode: GenMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.generate();
  }

  generate(): void {
    this.errorMessage = '';
    try {
      if (this.mode === 'password') {
        this.generatePassword();
      } else {
        this.generatePassphrase();
      }
    } catch (err) {
      this.result = '';
      this.entropyBits = 0;
      this.errorMessage =
        err instanceof Error ? err.message : 'Could not generate a value.';
    }
  }

  // ---------------------------------------------------------------------------
  // Password generation
  // ---------------------------------------------------------------------------

  private generatePassword(): void {
    const len = this.clampLength();
    const sets = this.activeCharsets();

    if (sets.length === 0) {
      throw new Error('Select at least one character type.');
    }

    const pool = sets.join('');
    const out: string[] = [];

    // Guarantee at least one character from each selected set.
    for (const set of sets) {
      out.push(set[this.randomIndex(set.length)]);
    }
    // Fill the remainder from the combined pool.
    while (out.length < len) {
      out.push(pool[this.randomIndex(pool.length)]);
    }

    this.result = this.shuffle(out).join('');
    // Entropy uses the full pool size for every position (the conservative,
    // industry-standard estimate for a uniformly drawn password).
    this.entropyBits = len * Math.log2(pool.length);
  }

  private activeCharsets(): string[] {
    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let digits = '0123456789';
    let symbols = '!@#$%^&*()-_=+[]{};:,.<>?';

    if (this.excludeAmbiguous) {
      const ambiguous = /[O0lI1|]/g;
      upper = upper.replace(ambiguous, '');
      lower = lower.replace(ambiguous, '');
      digits = digits.replace(ambiguous, '');
      symbols = symbols.replace(ambiguous, '');
    }

    const sets: string[] = [];
    if (this.useUppercase) sets.push(upper);
    if (this.useLowercase) sets.push(lower);
    if (this.useDigits) sets.push(digits);
    if (this.useSymbols) sets.push(symbols);
    return sets.filter((s) => s.length > 0);
  }

  private clampLength(): number {
    const n = Math.round(Number(this.length) || 0);
    const clamped = Math.max(4, Math.min(n, 64));
    this.length = clamped;
    return clamped;
  }

  // ---------------------------------------------------------------------------
  // Passphrase generation
  // ---------------------------------------------------------------------------

  private generatePassphrase(): void {
    const count = this.clampWordCount();
    const picked: string[] = [];

    for (let i = 0; i < count; i++) {
      let word = this.words[this.randomIndex(this.words.length)];
      if (this.capitalizeWords) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      picked.push(word);
    }

    let phrase = picked.join(this.separator);

    // Entropy: each word contributes log2(wordlistSize) bits.
    let bits = count * Math.log2(this.words.length);

    if (this.appendNumber) {
      const digit = this.randomIndex(100); // 0–99
      phrase += this.separator + String(digit).padStart(2, '0');
      bits += Math.log2(100); // extra ~6.64 bits from the appended number
    }

    this.result = phrase;
    this.entropyBits = bits;
  }

  private clampWordCount(): number {
    const n = Math.round(Number(this.wordCount) || 0);
    const clamped = Math.max(3, Math.min(n, 8));
    this.wordCount = clamped;
    return clamped;
  }

  // ---------------------------------------------------------------------------
  // CSPRNG helpers — rejection sampling, no modulo bias
  // ---------------------------------------------------------------------------

  /**
   * Uniformly returns an integer in [0, max) using crypto.getRandomValues with
   * rejection sampling so there is no modulo bias.
   */
  private randomIndex(max: number): number {
    if (max <= 0) return 0;
    // There are 2^32 possible uint32 values. Accept only the largest whole
    // multiple of `max` (reject value >= limit) so every residue is equally
    // likely — no modulo bias. Using value > limit on 2^32-1 would over-accept
    // by one and skew toward residue 0.
    const range = 0x100000000; // 2^32
    const limit = range - (range % max);
    const buf = new Uint32Array(1);
    let value: number;
    do {
      crypto.getRandomValues(buf);
      value = buf[0];
    } while (value >= limit);
    return value % max;
  }

  /** Fisher–Yates shuffle driven by the CSPRNG so the seeded chars are mixed in. */
  private shuffle(arr: string[]): string[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randomIndex(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------------------------------------------------------------------------
  // Strength label
  // ---------------------------------------------------------------------------

  get strengthLabel(): string {
    const b = this.entropyBits;
    if (b < 50) return 'Weak';
    if (b < 70) return 'Fair';
    if (b < 100) return 'Strong';
    return 'Excellent';
  }

  get strengthClass(): string {
    switch (this.strengthLabel) {
      case 'Weak':
        return 'bg-danger';
      case 'Fair':
        return 'bg-warning text-dark';
      case 'Strong':
        return 'bg-success';
      default:
        return 'bg-primary';
    }
  }

  /** Width % for the strength meter, capped at 128 bits for display. */
  get strengthPercent(): number {
    return Math.max(4, Math.min(100, (this.entropyBits / 128) * 100));
  }

  get roundedEntropy(): number {
    return Math.round(this.entropyBits);
  }

  async copyResult(): Promise<void> {
    if (!this.result) return;
    await this.utilityService.copyToClipboard(this.result, {
      label: this.mode === 'password' ? 'Password copied' : 'Passphrase copied',
    });
  }
}

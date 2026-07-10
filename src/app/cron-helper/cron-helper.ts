import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface ParsedCron {
  minutes: Set<number>;
  hours: Set<number>;
  daysOfMonth: Set<number>;
  months: Set<number>;
  daysOfWeek: Set<number>; // normalised to 0–6 (Sunday = 0)
  domStar: boolean;
  dowStar: boolean;
}

interface FieldRow {
  label: string;
  raw: string;
  expanded: string;
}

interface NextRun {
  date: Date;
  relative: string;
}

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DOW_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PRESETS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

/**
 * Cron Expression Helper — parse a standard 5-field cron expression (plus the
 * common @hourly/@daily/… nicknames) into a plain-English summary, an exact
 * per-field breakdown, and the next N fire times in your local timezone.
 *
 * Everything is computed locally. Next-run search uses a field-by-field
 * incrementer (jump by month → day → hour → minute) rather than brute-force
 * minute stepping, so even sparse schedules resolve instantly. Day-of-month
 * and day-of-week follow the classic Vixie-cron union rule: when both are
 * restricted, a date matches if *either* matches.
 */
@Component({
  selector: 'app-cron-helper',
  standalone: false,
  templateUrl: './cron-helper.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './cron-helper.scss',
})
export class CronHelper implements OnInit {
  expression = '*/15 9-17 * * 1-5';
  runCount = 5;
  isMobile = false;

  parsed: ParsedCron | null = null;
  description = '';
  fieldRows: FieldRow[] = [];
  nextRuns: NextRun[] = [];
  error: string | null = null;
  warning: string | null = null;
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  examples: { label: string; expr: string }[] = [
    { label: 'Every 15 min', expr: '*/15 * * * *' },
    { label: 'Weekdays 9am', expr: '0 9 * * 1-5' },
    { label: 'Midnight daily', expr: '0 0 * * *' },
    { label: 'Every Monday', expr: '0 0 * * MON' },
    { label: '1st of month', expr: '0 0 1 * *' },
    { label: 'Every 6 hours', expr: '0 */6 * * *' },
  ];

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.parse();
  }

  useExample(expr: string): void {
    this.expression = expr;
    this.parse();
  }

  parse(): void {
    this.parsed = null;
    this.description = '';
    this.fieldRows = [];
    this.nextRuns = [];
    this.error = null;
    this.warning = null;

    let raw = this.expression.trim();
    if (!raw) return;

    const lower = raw.toLowerCase();
    if (lower === '@reboot') {
      this.error = '@reboot runs once at startup — it has no scheduled fire times.';
      return;
    }
    if (PRESETS[lower]) raw = PRESETS[lower];

    const fields = raw.split(/\s+/);
    if (fields.length !== 5) {
      this.error = `Expected 5 fields (minute hour day-of-month month day-of-week) but got ${fields.length}.`;
      return;
    }

    // Quartz-style '?' means "no specific value" — treat it like '*'.
    const norm = fields.map((f) => (f === '?' ? '*' : f));

    try {
      const minutes = new Set(this.parseField(norm[0], 0, 59));
      const hours = new Set(this.parseField(norm[1], 0, 23));
      const daysOfMonth = new Set(this.parseField(norm[2], 1, 31));
      const months = new Set(this.parseField(norm[3], 1, 12, MONTH_NAMES));
      const dowRaw = this.parseField(norm[4], 0, 7, DOW_NAMES);
      const daysOfWeek = new Set(dowRaw.map((d) => (d === 7 ? 0 : d)));

      const p: ParsedCron = {
        minutes, hours, daysOfMonth, months, daysOfWeek,
        domStar: norm[2] === '*',
        dowStar: norm[4] === '*',
      };
      this.parsed = p;
      this.fieldRows = this.buildRows(norm, p);
      this.description = this.describe(norm, p);

      const now = new Date();
      const runs = this.computeNext(now, p, this.runCount);
      this.nextRuns = runs.map((d) => ({ date: d, relative: this.relative(d, now) }));
      if (runs.length === 0) {
        this.warning = 'No upcoming runs found within the search window — this schedule may be unsatisfiable (e.g. February 30th).';
      }
    } catch (e) {
      this.error = (e as Error).message;
    }
  }

  // ---------------------------------------------------------------- parsing

  /** Expand a single cron field (with lists, ranges, steps and names). */
  private parseField(expr: string, min: number, max: number, names: string[] = []): number[] {
    const set = new Set<number>();

    const toNum = (tok: string): number => {
      const idx = names.indexOf(tok.toLowerCase());
      if (idx >= 0) return idx + min; // names align to the field's minimum
      if (!/^\d+$/.test(tok)) throw new Error(`Unrecognised value "${tok}".`);
      return parseInt(tok, 10);
    };

    for (const partRaw of expr.split(',')) {
      const part = partRaw.trim();
      if (part === '') throw new Error('Empty entry in a comma list.');

      let rangeStr = part;
      let step = 1;
      if (part.includes('/')) {
        const bits = part.split('/');
        if (bits.length !== 2 || bits[1] === '') throw new Error(`Invalid step in "${part}".`);
        if (!/^\d+$/.test(bits[1])) throw new Error(`Step must be a whole number in "${part}".`);
        step = parseInt(bits[1], 10);
        if (step < 1) throw new Error(`Step must be at least 1 in "${part}".`);
        rangeStr = bits[0];
      }

      let lo: number;
      let hi: number;
      if (rangeStr === '*') {
        lo = min;
        hi = max;
      } else if (rangeStr.includes('-')) {
        const [a, b] = rangeStr.split('-');
        if (a === '' || b === undefined || b === '') throw new Error(`Invalid range "${rangeStr}".`);
        lo = toNum(a);
        hi = toNum(b);
      } else {
        lo = toNum(rangeStr);
        // "a/step" runs from a up to the maximum; a bare "a" is just itself.
        hi = part.includes('/') ? max : lo;
      }

      if (lo < min || hi > max || lo > hi) {
        throw new Error(`Value out of range in "${part}" — allowed ${min}–${max}.`);
      }
      for (let v = lo; v <= hi; v += step) set.add(v);
    }

    return [...set].sort((a, b) => a - b);
  }

  // --------------------------------------------------------------- next runs

  private dayMatches(d: Date, p: ParsedCron): boolean {
    const domOk = p.daysOfMonth.has(d.getDate());
    const dowOk = p.daysOfWeek.has(d.getDay());
    if (!p.domStar && !p.dowStar) return domOk || dowOk; // union rule
    if (!p.domStar) return domOk;
    if (!p.dowStar) return dowOk;
    return true;
  }

  private computeNext(after: Date, p: ParsedCron, count: number): Date[] {
    const out: Date[] = [];
    const d = new Date(after.getTime());
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1); // first candidate is strictly after "now"

    let guard = 0;
    const MAX_ITERS = 500000;
    while (out.length < count && guard++ < MAX_ITERS) {
      if (!p.months.has(d.getMonth() + 1)) {
        d.setMonth(d.getMonth() + 1, 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!this.dayMatches(d, p)) {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!p.hours.has(d.getHours())) {
        d.setHours(d.getHours() + 1, 0, 0, 0);
        continue;
      }
      if (!p.minutes.has(d.getMinutes())) {
        d.setMinutes(d.getMinutes() + 1, 0, 0);
        continue;
      }
      out.push(new Date(d.getTime()));
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    }
    return out;
  }

  // ------------------------------------------------------------- presentation

  private buildRows(fields: string[], p: ParsedCron): FieldRow[] {
    return [
      { label: 'Minute', raw: fields[0], expanded: this.compact([...p.minutes].sort((a, b) => a - b)) },
      { label: 'Hour', raw: fields[1], expanded: this.compact([...p.hours].sort((a, b) => a - b)) },
      { label: 'Day of month', raw: fields[2], expanded: this.compact([...p.daysOfMonth].sort((a, b) => a - b)) },
      {
        label: 'Month',
        raw: fields[3],
        expanded: [...p.months].sort((a, b) => a - b).map((m) => MONTH_FULL[m - 1]).join(', '),
      },
      {
        label: 'Day of week',
        raw: fields[4],
        expanded: [...p.daysOfWeek].sort((a, b) => a - b).map((d) => DOW_FULL[d]).join(', '),
      },
    ];
  }

  /** Collapse consecutive integers into ranges: [0,1,2,5] -> "0–2, 5". */
  private compact(vals: number[]): string {
    if (vals.length === 0) return '';
    const parts: string[] = [];
    let start = vals[0];
    let prev = vals[0];
    for (let i = 1; i <= vals.length; i++) {
      if (i < vals.length && vals[i] === prev + 1) {
        prev = vals[i];
        continue;
      }
      parts.push(start === prev ? `${start}` : `${start}\u2013${prev}`);
      if (i < vals.length) {
        start = vals[i];
        prev = vals[i];
      }
    }
    return parts.join(', ');
  }

  /** Detect a clean "step" progression (e.g. every N) that covers the whole range. */
  private detectStep(vals: number[], min: number, max: number): number | null {
    if (vals.length < 2 || vals[0] !== min) return null;
    const step = vals[1] - vals[0];
    if (step < 2) return null;
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] - vals[i - 1] !== step) return null;
    }
    return vals[vals.length - 1] + step > max ? step : null;
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private describe(fields: string[], p: ParsedCron): string {
    const minVals = [...p.minutes].sort((a, b) => a - b);
    const hourVals = [...p.hours].sort((a, b) => a - b);
    const minStar = fields[0] === '*';
    const hourStar = fields[1] === '*';

    let time: string;
    if (minStar && hourStar) {
      time = 'Every minute';
    } else if (hourStar) {
      const step = this.detectStep(minVals, 0, 59);
      if (step) time = `Every ${step} minutes`;
      else if (minVals.length === 1) time = `At minute ${minVals[0]} of every hour`;
      else time = `At minutes ${this.compact(minVals)} of every hour`;
    } else if (minStar) {
      time = `Every minute past hour ${this.compact(hourVals)}`;
    } else if (minVals.length === 1 && hourVals.length === 1) {
      time = `At ${this.pad(hourVals[0])}:${this.pad(minVals[0])}`;
    } else {
      const stepH = this.detectStep(hourVals, 0, 23);
      const stepM = this.detectStep(minVals, 0, 59);
      const hourPart = hourVals.length === 1 ? `hour ${hourVals[0]}`
        : stepH ? `every ${stepH} hours` : `hours ${this.compact(hourVals)}`;
      const minPart = minVals.length === 1 ? `minute ${minVals[0]}`
        : stepM ? `every ${stepM} minutes` : `minutes ${this.compact(minVals)}`;
      time = `At ${minPart} past ${hourPart}`;
    }

    const domPhrase = () => {
      const vals = [...p.daysOfMonth].sort((a, b) => a - b);
      return vals.length === 1 ? `on day-of-month ${vals[0]}` : `on days-of-month ${this.compact(vals)}`;
    };
    const dowPhrase = () => {
      const vals = [...p.daysOfWeek].sort((a, b) => a - b);
      return `on ${vals.map((v) => DOW_FULL[v]).join(', ')}`;
    };

    let day: string;
    if (p.domStar && p.dowStar) day = 'every day';
    else if (!p.domStar && p.dowStar) day = domPhrase();
    else if (p.domStar && !p.dowStar) day = dowPhrase();
    else day = `${domPhrase()} and ${dowPhrase()}`;

    let month = '';
    if (fields[3] !== '*') {
      const vals = [...p.months].sort((a, b) => a - b);
      month = ` in ${vals.map((m) => MONTH_FULL[m - 1]).join(', ')}`;
    }

    return `${time}, ${day}${month}.`;
  }

  private relative(date: Date, from: Date): string {
    const mins = Math.round((date.getTime() - from.getTime()) / 60000);
    if (mins < 1) return 'in <1 min';
    if (mins < 60) return `in ${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rmin = mins % 60;
    if (hrs < 24) return `in ${hrs}h${rmin ? ` ${rmin}m` : ''}`;
    const days = Math.floor(hrs / 24);
    const rhrs = hrs % 24;
    return `in ${days}d${rhrs ? ` ${rhrs}h` : ''}`;
  }

  formatRun(date: Date): string {
    return date.toLocaleString(undefined, {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }

  copyExpression(): void {
    if (!this.expression.trim()) return;
    this.utilityService.copyToClipboard(this.expression.trim(), { label: 'Cron expression copied' });
  }
}

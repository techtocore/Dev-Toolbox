import {
  Component, ElementRef, HostListener, OnInit, OnDestroy, ViewChild, AfterViewInit
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tool, ToolsService } from '../services/tools.service';
import { CommandPaletteService } from '../services/command-palette.service';

@Component({
  selector: 'app-command-palette',
  standalone: false,
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss'
})
export class CommandPaletteComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('search') searchInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  results: Tool[] = [];
  selectedIndex = 0;
  allTools: Tool[] = [];

  private sub: Subscription | null = null;

  constructor(
    private toolsService: ToolsService,
    private router: Router,
    private paletteService: CommandPaletteService
  ) {}

  ngOnInit(): void {
    this.allTools = this.toolsService.getAllTools();
    this.results = this.allTools;
    this.sub = this.paletteService.toggle$.subscribe(() => this.toggle());
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const mod = event.ctrlKey || event.metaKey;

    if (mod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
      return;
    }

    if (!this.open) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.move(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.activate(this.results[this.selectedIndex]);
    }
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.query = '';
      this.results = this.allTools;
      this.selectedIndex = 0;
      setTimeout(() => this.searchInput?.nativeElement.focus(), 30);
    }
  }

  close(): void {
    this.open = false;
  }

  onInput(): void {
    const q = this.query.trim();
    this.results = q ? this.toolsService.searchTools(q) : this.allTools;
    this.selectedIndex = 0;
  }

  move(delta: number): void {
    if (this.results.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.results.length) % this.results.length;
    setTimeout(() => {
      const el = document.querySelector('.cmdk-result.is-active');
      el?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  activate(tool: Tool | undefined): void {
    if (!tool) return;
    this.router.navigate([tool.route]);
    this.close();
  }
}

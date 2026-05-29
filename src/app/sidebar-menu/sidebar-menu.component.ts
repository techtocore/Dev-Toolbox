import {
  Component, ElementRef, HostListener, OnInit, ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { Collapse } from 'bootstrap';
import { ToolsService } from '../services/tools.service';
import { JsonTreeComponent } from '../json-tree/json-tree.component';

const MOBILE_MAX = 767.98;            // matches Bootstrap's md breakpoint
const EDGE_SWIPE_ZONE_PX = 24;        // touch must start in this gutter
const SWIPE_OPEN_THRESHOLD_PX = 60;   // horizontal delta needed to open
const VERTICAL_NOISE_LIMIT_PX = 40;   // ignore mostly-vertical gestures

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss'],
  standalone: false
})
export class SidebarMenuComponent implements OnInit {
  @ViewChild('jsonTreeComponent') jsonTree: JsonTreeComponent;
  menuData: any[] = [];

  private touchStartX: number | null = null;
  private touchStartY: number | null = null;
  private touchOriginatedAtEdge = false;
  private justOpenedAt = 0;

  constructor(
    private router: Router,
    private toolsService: ToolsService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.menuData = this.toolsService.getMenuData();

    window.addEventListener('expandCategory', (event: CustomEvent) => {
      // If we're on mobile and the drawer is closed, open it first so the
      // expanded category is actually visible. Defer the tree expansion until
      // after Bootstrap's collapse transition finishes.
      if (this.isMobile() && !this.isOpen()) {
        this.openDrawer();
        setTimeout(() => this.expandCategory(event.detail.category), 360);
      } else {
        this.expandCategory(event.detail.category);
      }
    });
  }

  onCustomTreeSelection(value: string) {
    this.router.navigate([value]);
    // Navigating away should also dismiss the mobile drawer.
    if (this.isMobile()) this.closeDrawer();
  }

  expandCategory(categoryName: string): void {
    const categoryIndex = this.menuData.findIndex(item => item.text === categoryName);

    if (categoryIndex !== -1 && this.jsonTree) {
      Object.keys(this.jsonTree.isOpen).forEach(key => {
        const index = parseInt(key);
        if (index !== categoryIndex) {
          this.jsonTree.isOpen[index] = false;
        }
      });

      this.jsonTree.isOpen[categoryIndex] = true;

      setTimeout(() => {
        const sidebarElement = document.getElementById('sidebarMenu');
        if (sidebarElement) {
          sidebarElement.scrollTop = 0;
        }
      }, 100);
    }
  }

  // ---------------- Tap-outside dismissal ----------------

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isMobile()) return;
    const sidebar = this.sidebarEl();
    if (!sidebar?.classList.contains('show')) return;

    // The click that triggered the open (e.g. a "Browse by category" card)
    // bubbles up to document right after we add `.show`. Don't immediately
    // close in response to that same gesture.
    if (performance.now() - this.justOpenedAt < 400) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Ignore clicks inside the sidebar itself, on the hamburger toggler, or
    // on any element that opted in as a sidebar trigger.
    if (sidebar.contains(target)) return;
    if (target.closest('.navbar-toggler')) return;
    if (target.closest('[data-sidebar-trigger]')) return;

    this.closeDrawer();
  }

  // ---------------- Auto-close on viewport resize ----------------

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isMobile()) this.closeDrawer();
  }

  // ---------------- Edge-swipe-to-open ----------------

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.isMobile()) return;
    const sidebar = this.sidebarEl();
    if (sidebar?.classList.contains('show')) return;

    const t = event.touches[0];
    if (!t) return;
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchOriginatedAtEdge = t.clientX <= EDGE_SWIPE_ZONE_PX;
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    if (!this.touchOriginatedAtEdge || this.touchStartX === null || this.touchStartY === null) {
      this.resetTouch();
      return;
    }

    const t = event.changedTouches[0];
    if (!t) {
      this.resetTouch();
      return;
    }

    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;

    if (dx >= SWIPE_OPEN_THRESHOLD_PX && Math.abs(dy) < VERTICAL_NOISE_LIMIT_PX) {
      this.openDrawer();
    }

    this.resetTouch();
  }

  @HostListener('document:touchcancel')
  onTouchCancel(): void {
    this.resetTouch();
  }

  private resetTouch(): void {
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchOriginatedAtEdge = false;
  }

  // ---------------- Backdrop click ----------------

  onBackdropClick(): void {
    this.closeDrawer();
  }

  isOpen(): boolean {
    return !!this.sidebarEl()?.classList.contains('show');
  }

  // ---------------- Helpers ----------------

  private sidebarEl(): HTMLElement | null {
    return document.getElementById('sidebarMenu');
  }

  private getCollapse(el: HTMLElement): Collapse {
    // Reuse Bootstrap's existing Collapse instance so its internal state stays
    // in sync with the data-bs-toggle button.
    return Collapse.getOrCreateInstance(el, { toggle: false });
  }

  private openDrawer(): void {
    const el = this.sidebarEl();
    if (!el || el.classList.contains('show')) return;
    this.getCollapse(el).show();
    this.justOpenedAt = performance.now();
  }

  private closeDrawer(): void {
    const el = this.sidebarEl();
    if (!el || !el.classList.contains('show')) return;
    this.getCollapse(el).hide();
  }

  private isMobile(): boolean {
    return window.innerWidth <= MOBILE_MAX;
  }
}

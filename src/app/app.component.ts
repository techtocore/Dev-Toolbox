import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { CommandPaletteService } from './services/command-palette.service';
import { ToolsService } from './services/tools.service';
import { UtilityService } from './services/utility.service';

const MOBILE_BREAKPOINT = 768;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('mainContent') mainContent?: ElementRef<HTMLElement>;

  title = 'dev-toolbox';
  routeAnnouncement = '';

  private navigationSubscription?: Subscription;

  constructor(
    public paletteService: CommandPaletteService,
    private router: Router,
    private titleService: Title,
    private toolsService: ToolsService,
    private utilityService: UtilityService
  ) { }

  ngOnInit(): void {
    this.updateMobileState();
    this.navigationSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.handleNavigation(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.navigationSubscription?.unsubscribe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateMobileState();
  }

  private handleNavigation(url: string): void {
    const path = url.split(/[?#]/, 1)[0];
    const tool = this.toolsService.getAllTools().find(candidate => candidate.route === path);
    const pageName = path === '/' ? 'Dev Toolbox' : tool?.name ?? 'Page not found';

    this.titleService.setTitle(tool ? `${tool.name} | Dev Toolbox` : pageName);
    this.routeAnnouncement = `${pageName} page loaded`;
    setTimeout(() => this.mainContent?.nativeElement.focus({ preventScroll: true }));
  }

  private updateMobileState(): void {
    this.utilityService.setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
  }
}

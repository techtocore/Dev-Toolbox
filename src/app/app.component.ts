import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { UtilityService } from './services/utility.service';
import { CommandPaletteService } from './services/command-palette.service';

const MOBILE_BREAKPOINT = 658;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'dev-toolbox';
  isMobile = false;

  constructor(
    public utilityService: UtilityService,
    public paletteService: CommandPaletteService
  ) { }

  ngOnInit(): void {
    this.checkMobileView();
  }

  ngOnDestroy(): void {}

  @HostListener('window:resize', ['$event'])
  onResize(event?: Event): void {
    this.checkMobileView();
  }

  private checkMobileView(): void {
    const isMobileView = window.innerWidth < MOBILE_BREAKPOINT;
    this.utilityService.setIsMobile(isMobileView);
    this.isMobile = isMobileView;
  }
}

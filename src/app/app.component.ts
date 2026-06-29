import { Component, OnInit, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from './services/utility.service';
import { CommandPaletteService } from './services/command-palette.service';

// Matches Bootstrap's md breakpoint (where the layout stacks to col-sm-12),
// keeping UtilityService.isMobile in sync with the sidebar/home thresholds.
const MOBILE_BREAKPOINT = 768;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'dev-toolbox';
  isMobile = false;

  constructor(
    public utilityService: UtilityService,
    public paletteService: CommandPaletteService
  ) { }

  ngOnInit(): void {
    this.checkMobileView();
  }

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

import { Component } from '@angular/core';
import { UtilityService } from './services/utility.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'dev-toolbox';
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    if (window.innerWidth < 658) {
      this.utilityService.setIsMobile(true);
    }
    this.isMobile = this.utilityService.getIsMobile();
  }

}

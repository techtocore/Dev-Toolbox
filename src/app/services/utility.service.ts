import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilityService {

  isMobile: boolean = false;
  constructor() { }

  getIsMobile() {
    return this.isMobile;
  }

  setIsMobile(flag) {
    this.isMobile = flag;
  }
}

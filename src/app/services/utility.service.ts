import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilityService {

  isMobile: Boolean = false;
  constructor() { }

  getIsMobile() {
    return this.isMobile;
  }

  setIsMobile(flag) {
    this.isMobile = flag;
  }
}

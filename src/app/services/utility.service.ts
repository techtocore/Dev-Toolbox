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

  downloadFile(data, contentType, fileName) {
    const file = new window.Blob([data], { type: contentType });

    const downloadAncher = document.createElement("a");
    downloadAncher.style.display = "none";

    const fileURL = URL.createObjectURL(file);
    downloadAncher.href = fileURL;
    downloadAncher.download = fileName;
    downloadAncher.click();
  }

  readTextFile(file) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = function (evt) {
        resolve(evt.target.result);
      }
      reader.onerror = function (evt) {
        reject("error reading file");
      }
    });
  }
}

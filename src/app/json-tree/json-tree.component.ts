import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-json-tree',
  templateUrl: './json-tree.component.html',
  styleUrls: ['./json-tree.component.scss']

})
export class JsonTreeComponent implements OnInit {

  constructor(private router: Router) { }

  @Input() data: any;
  @Output() leafSelected = new EventEmitter<string>();
  processedData = []
  isOpen = {}
  selectedItems = {}

  ngOnInit(): void {
    this.drawTree(this.data);
  }

  drawTree(data) {
    if (!data) {
      return;
    }
    data.forEach(element => {
      // console.log(element.text);
      this.processedData.push(element['text']);
    });
  }

  emitEvent(ind) {
    if (!this.data[ind].items) {
      if (this.data[ind]['link']) {
        this.leafSelected.emit(this.data[ind]['link']);
      }
      if (!this.selectedItems[ind]) {
        this.selectedItems[ind] = true;
      } else {
        this.selectedItems[ind] = false;
      }
    }
  }

  onTreeSelection(val) {
    this.leafSelected.emit(val);
  }

  toggleOpen(i) {
    if (!this.isOpen[i]) {
      this.isOpen[i] = true;
      return;
    }
    if (this.isOpen[i]) {
      this.isOpen[i] = false;
    } else {
      this.isOpen[i] = true;
    }
  }

  checkExpand(ind) {
    if (!this.isOpen[ind]) {
      this.isOpen[ind] = false;
    }
    if (this.data[ind].items && this.isOpen[ind] === false) {
      return true;
    }
    return false;
  }

  checkClose(ind) {
    if (!this.isOpen[ind]) {
      this.isOpen[ind] = false;
    }
    if (this.data[ind].items && this.isOpen[ind] === true) {
      return true;
    }
    return false;
  }

  checkIfActive(item) {
    if (!item['link']) {
      return false;
    }
    let currentLink = this.router.url;
    if (currentLink === item['link']) {
      return true;
    }
    return false;
  }

}

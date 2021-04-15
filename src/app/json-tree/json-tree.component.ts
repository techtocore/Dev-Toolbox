import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-json-tree',
  templateUrl: './json-tree.component.html',
  styleUrls: ['./json-tree.component.scss']

})
export class JsonTreeComponent implements OnInit {

  constructor() { }

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
      console.log(element.text);
      this.processedData.push(element.text);
    });
  }

  emitEvent(ind) {
    if (!this.data[ind].items) {
      this.leafSelected.emit(this.data[ind].text);
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

}

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoWayIoComponent } from './two-way-io.component';

describe('TwoWayIoComponent', () => {
  let component: TwoWayIoComponent;
  let fixture: ComponentFixture<TwoWayIoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TwoWayIoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TwoWayIoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

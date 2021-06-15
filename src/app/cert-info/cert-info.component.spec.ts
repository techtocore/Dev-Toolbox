import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CertInfoComponent } from './cert-info.component';

describe('CertInfoComponent', () => {
  let component: CertInfoComponent;
  let fixture: ComponentFixture<CertInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CertInfoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CertInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

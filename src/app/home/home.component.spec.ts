import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule, RouterTestingModule ],
      declarations: [ HomeComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should keep a search result available through mousedown and navigate on click', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.searchQuery = 'base64';
    component.onSearchChange();
    fixture.detectChanges();

    const result = fixture.nativeElement.querySelector('.search-result-item') as HTMLElement;
    const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

    result.dispatchEvent(mouseDown);
    expect(mouseDown.defaultPrevented).toBeTrue();

    result.click();
    expect(navigateSpy).toHaveBeenCalledOnceWith(['/base64']);
  });
});

import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { HomeComponent } from './home.component';

@Component({ template: '', standalone: false })
class TestToolComponent {}

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule, RouterTestingModule.withRoutes([
        { path: 'base64', component: TestToolComponent }
      ]) ],
      declarations: [ HomeComponent, TestToolComponent ],
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

  it('should keep a search result available through mousedown and navigate on click', async () => {
    const router = TestBed.inject(Router);

    component.searchQuery = 'base64';
    component.onSearchChange();
    fixture.detectChanges();

    const result = fixture.nativeElement.querySelector('.search-result-item') as HTMLElement;
    const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

    result.dispatchEvent(mouseDown);
    expect(mouseDown.defaultPrevented).toBeTrue();

    result.click();
    await fixture.whenStable();
    expect(router.url).toBe('/base64');
  });

  it('renders discovery actions as keyboard-focusable controls', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.featured-card')?.tagName).toBe('A');
    expect(element.querySelector('.category-card')?.tagName).toBe('BUTTON');
  });
});

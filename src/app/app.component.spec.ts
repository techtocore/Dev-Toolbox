import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { UtilityService } from './services/utility.service';

@Component({ template: '', standalone: false })
class TestToolComponent {}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          { path: 'deflateToolkit', component: TestToolComponent }
        ])
      ],
      declarations: [
        AppComponent,
        TestToolComponent
      ],
      // The template references child components (app-sidebar-menu, etc.) that
      // aren't declared in this lightweight test module.
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'dev-toolbox'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('dev-toolbox');
  });

  it('should render the brand in the navbar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.navbar-brand')?.textContent).toContain('DEV TOOLBOX');
  });

  it('updates the title, announces, and focuses main content after tool navigation', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const mainContent = fixture.nativeElement.querySelector('#main-content') as HTMLElement;
    const focusSpy = spyOn(mainContent, 'focus').and.callThrough();

    router.navigateByUrl('/deflateToolkit');
    tick();
    fixture.detectChanges();
    tick();

    expect(document.title).toBe('GZIP & Deflate Toolkit | Dev Toolbox');
    expect(fixture.componentInstance.routeAnnouncement).toBe('GZIP & Deflate Toolkit page loaded');
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(mainContent);
  }));

  it('keeps shared mobile state synchronized with the viewport', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const utilityService = TestBed.inject(UtilityService);
    const mobileSpy = spyOn(utilityService, 'setIsMobile');

    fixture.componentInstance.ngOnInit();
    fixture.componentInstance.onResize();

    expect(mobileSpy).toHaveBeenCalledWith(window.innerWidth < 768);
  });
});

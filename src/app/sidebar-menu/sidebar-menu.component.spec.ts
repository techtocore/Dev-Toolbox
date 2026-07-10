import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { SidebarMenuComponent } from './sidebar-menu.component';

describe('SidebarMenuComponent', () => {
  let component: SidebarMenuComponent;
  let fixture: ComponentFixture<SidebarMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ RouterTestingModule ],
      declarations: [ SidebarMenuComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SidebarMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Regression: the mobile drawer's dimmed backdrop must stay in sync with the
  // drawer. Previously the backdrop was derived by reading Bootstrap's `.show`
  // class on every change-detection pass; because Bootstrap toggles that class
  // asynchronously without notifying Angular, the backdrop lagged the drawer by
  // one interaction and the menu needed a second tap outside to dismiss.
  const sidebar = (): HTMLElement =>
    fixture.nativeElement.querySelector('#sidebarMenu') as HTMLElement;
  const backdrop = (): HTMLElement =>
    fixture.nativeElement.querySelector('.sidebar-backdrop') as HTMLElement;

  it('starts with the backdrop hidden', () => {
    expect(component.drawerOpen).toBeFalse();
    expect(backdrop().classList.contains('is-visible')).toBeFalse();
  });

  it('shows the backdrop as soon as the collapse begins opening', () => {
    sidebar().dispatchEvent(new CustomEvent('show.bs.collapse'));
    fixture.detectChanges();

    expect(component.drawerOpen).toBeTrue();
    expect(backdrop().classList.contains('is-visible')).toBeTrue();
  });

  it('hides the backdrop as soon as the collapse begins closing', () => {
    sidebar().dispatchEvent(new CustomEvent('show.bs.collapse'));
    fixture.detectChanges();
    expect(component.drawerOpen).toBeTrue();

    sidebar().dispatchEvent(new CustomEvent('hide.bs.collapse'));
    fixture.detectChanges();

    expect(component.drawerOpen).toBeFalse();
    expect(backdrop().classList.contains('is-visible')).toBeFalse();
  });

  it('stops reacting to collapse events after destroy', () => {
    const el = sidebar();
    fixture.destroy();
    el.dispatchEvent(new CustomEvent('show.bs.collapse'));
    expect(component.drawerOpen).toBeFalse();
  });
});

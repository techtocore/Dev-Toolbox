import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * NotFound — friendly 404 page for unknown routes. Standalone + lazy-loaded
 * via the wildcard route so it never weighs on the initial bundle.
 */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './not-found.scss',
})
export class NotFound {}

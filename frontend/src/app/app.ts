import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';
import { whatsappUrl } from './core/whatsapp';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly auth = inject(AuthService);
  readonly menu = signal(false);
  readonly whatsapp = whatsappUrl('Hola, quiero alquilar una lavadora. ¿Me puedes dar la información completa?');

  cerrarMenu(): void {
    this.menu.set(false);
  }

  salir(): void {
    this.cerrarMenu();
    this.auth.logout();
  }
}

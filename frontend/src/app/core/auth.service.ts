import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { ApiService } from './api.service';
import { Usuario } from './models';
import { guardarSesion, leerToken, leerUsuario, limpiarSesion } from './session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly usuario = signal<Usuario | null>(leerUsuario());

  get token(): string | null {
    return leerToken();
  }

  get autenticado(): boolean {
    return !!this.usuario() && !!this.token;
  }

  login(correo: string, password: string) {
    return this.api.login(correo, password).pipe(
      tap(({ token, usuario }) => {
        guardarSesion(token, usuario);
        this.usuario.set(usuario);
      }),
    );
  }

  logout(): void {
    limpiarSesion();
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }
}

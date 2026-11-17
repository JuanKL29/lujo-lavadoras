import { Component, computed, input, output, signal } from '@angular/core';

import { Lavadora } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';

@Component({
  selector: 'app-lavadora-card',
  imports: [MoneyPipe],
  templateUrl: './lavadora-card.html',
  styleUrl: './lavadora-card.css',
})
export class LavadoraCard {
  readonly lavadora = input.required<Lavadora>();
  readonly alquilar = output<Lavadora>();

  private intento = signal(0);

  readonly imagen = computed(() => {
    const base = `/img/lavadoras/${encodeURIComponent(this.lavadora().referencia)}`;
    return [`${base}.webp`, `${base}.jpg`, '/img/lavadora.svg'][this.intento()];
  });

  readonly disponible = computed(() => this.lavadora().estado === 'Disponible');

  estadoClase(estado: string): string {
    switch (estado) {
      case 'Disponible':
        return 'badge--ok';
      case 'Mantenimiento':
        return 'badge--danger';
      case 'Alquilada':
        return 'badge--blue';
      default:
        return 'badge--warn';
    }
  }

  usarRespaldo(): void {
    if (this.intento() < 2) this.intento.update((valor) => valor + 1);
  }
}

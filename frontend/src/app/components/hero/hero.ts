import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { whatsappUrl } from '../../core/whatsapp';

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class Hero {
  readonly whatsapp = whatsappUrl(
    'Hola, quiero agendar el alquiler de una lavadora. ¿Me ayudas con la información?',
  );
}

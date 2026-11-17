import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WHATSAPP_DISPLAY, whatsappUrl } from '../../core/whatsapp';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  readonly anio = new Date().getFullYear();
  readonly whatsapp = whatsappUrl();
  readonly whatsappDisplay = WHATSAPP_DISPLAY;
}

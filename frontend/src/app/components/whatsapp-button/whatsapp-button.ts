import { Component } from '@angular/core';

import { whatsappUrl } from '../../core/whatsapp';

@Component({
  selector: 'app-whatsapp-button',
  templateUrl: './whatsapp-button.html',
  styleUrl: './whatsapp-button.css',
})
export class WhatsappButton {
  readonly whatsapp = whatsappUrl();
}

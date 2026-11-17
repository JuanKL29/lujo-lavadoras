// Cambia este número por el real, con indicativo de país y sin espacios ni "+".
// Ejemplo: 573001234567
export const WHATSAPP_NUMERO = '573113417211';

// Texto que se escribe automáticamente al abrir el chat.
export const WHATSAPP_MENSAJE =
  'Hola, quiero alquilar una lavadora. ¿Me ayudas con la información?';

// Número tal como se muestra en la página.
export const WHATSAPP_DISPLAY = '+57 311 341 7211';

export function whatsappUrl(mensaje: string = WHATSAPP_MENSAJE): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}

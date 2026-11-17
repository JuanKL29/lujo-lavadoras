import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(error: unknown): string {
  const httpError = error as HttpErrorResponse;
  return (
    httpError?.error?.error ||
    (httpError?.status === 0
      ? 'No se pudo conectar con el servidor. ¿Está corriendo el backend?'
      : httpError?.message) ||
    'Ocurrió un error inesperado.'
  );
}

export function formatFecha(value: string | null | undefined): string {
  if (!value) return '—';
  const [anio, mes, dia] = value.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return value;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(anio, mes - 1, dia));
}

export function formatFechaCorta(value: string | null | undefined): string {
  if (!value) return '—';
  const [anio, mes, dia] = value.slice(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return value;
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(
    new Date(anio, mes - 1, dia),
  );
}

export function hoyISO(): string {
  const hoy = new Date();
  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0'),
  ].join('-');
}

export function sumarDias(iso: string, dias: number): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia + dias);
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0'),
  ].join('-');
}

export function diasEntre(inicio: string, fin: string): number {
  if (!inicio || !fin) return 0;
  const a = new Date(`${inicio}T00:00:00`);
  const b = new Date(`${fin}T00:00:00`);
  const dias = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return dias > 0 ? dias : 0;
}

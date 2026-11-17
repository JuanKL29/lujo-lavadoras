import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { errorMessage, formatFecha } from '../../core/format';
import { Comentario, Servicio } from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';
import { WHATSAPP_DISPLAY, whatsappUrl } from '../../core/whatsapp';
import { Footer } from '../../components/footer/footer';
import { Hero } from '../../components/hero/hero';
import { WhatsappButton } from '../../components/whatsapp-button/whatsapp-button';

@Component({
  selector: 'app-home',
  imports: [MoneyPipe, ReactiveFormsModule, Hero, Footer, WhatsappButton],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  readonly whatsapp = whatsappUrl();
  readonly whatsappDisplay = WHATSAPP_DISPLAY;

  readonly servicios = signal<Servicio[]>([]);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');

  readonly comentarios = signal<Comentario[]>([]);
  readonly cargandoComentarios = signal(true);
  readonly errorComentarios = signal('');
  readonly enviandoComentario = signal(false);
  readonly comentarioEnviado = signal(false);
  readonly errorComentario = signal('');
  readonly hoverCalificacion = signal(0);

  readonly estrellas = [1, 2, 3, 4, 5];
  readonly formatFecha = formatFecha;

  readonly promedio = computed(() => {
    const lista = this.comentarios();
    if (!lista.length) return 0;
    const suma = lista.reduce((total, c) => total + c.calificacion, 0);
    return suma / lista.length;
  });
  readonly promedioTexto = computed(() => this.promedio().toFixed(1).replace('.', ','));

  readonly formComentario = this.fb.nonNullable.group({
    nombre: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    ],
    correo: ['', [Validators.email, Validators.maxLength(80)]],
    comentario: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(500)],
    ],
    calificacion: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
  });

  constructor() {
    this.cargar();
    this.cargarComentarios();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.api.servicios().subscribe({
      next: (servicios) => {
        this.servicios.set(servicios);
        this.cargando.set(false);
      },
      error: (error) => {
        this.errorCarga.set(errorMessage(error));
        this.cargando.set(false);
      },
    });
  }

  cargarComentarios(): void {
    this.cargandoComentarios.set(true);
    this.errorComentarios.set('');

    this.api.comentarios().subscribe({
      next: (comentarios) => {
        this.comentarios.set(comentarios);
        this.cargandoComentarios.set(false);
      },
      error: (error) => {
        this.errorComentarios.set(errorMessage(error));
        this.cargandoComentarios.set(false);
      },
    });
  }

  calificar(valor: number): void {
    this.formComentario.controls.calificacion.setValue(valor);
    this.formComentario.controls.calificacion.markAsTouched();
  }

  estrellasFormulario(): number {
    return this.hoverCalificacion() || this.formComentario.controls.calificacion.value;
  }

  inicial(nombre: string): string {
    return nombre.trim().charAt(0).toUpperCase();
  }

  enviarComentario(): void {
    this.errorComentario.set('');
    this.comentarioEnviado.set(false);

    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }

    const raw = this.formComentario.getRawValue();
    this.enviandoComentario.set(true);

    this.api
      .enviarComentario({
        nombre: raw.nombre.trim(),
        correo: raw.correo.trim() || null,
        comentario: raw.comentario.trim(),
        calificacion: Number(raw.calificacion),
      })
      .subscribe({
        next: () => {
          this.enviandoComentario.set(false);
          this.comentarioEnviado.set(true);
          this.formComentario.reset({
            nombre: '',
            correo: '',
            comentario: '',
            calificacion: 0,
          });
        },
        error: (error) => {
          this.enviandoComentario.set(false);
          this.errorComentario.set(errorMessage(error));
        },
      });
  }
}

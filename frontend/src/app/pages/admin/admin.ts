import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, interval } from 'rxjs';

import {
  ApiService,
  ClienteInput,
  LavadoraInput,
  OrdenInput,
  ServicioInput,
} from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { errorMessage, formatFecha, hoyISO, sumarDias } from '../../core/format';
import {
  Alquiler,
  Cliente,
  Comentario,
  Lavadora,
  OrdenServicio,
  Servicio,
  SolicitudAlquiler,
  Stats,
} from '../../core/models';
import { MoneyPipe } from '../../core/money.pipe';

type Tab =
  | 'resumen'
  | 'lavadoras'
  | 'alquileres'
  | 'ordenes'
  | 'clientes'
  | 'servicios'
  | 'comentarios';
type ModalState = {
  tipo: 'lavadora' | 'servicio' | 'alquiler' | 'orden' | 'cliente';
  id: number | null;
} | null;

function rangoFechas(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('fecha_inicio')?.value;
  const fin = group.get('fecha_fin')?.value;
  return inicio && fin && fin < inicio ? { rango: true } : null;
}

@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule, RouterLink, MoneyPipe],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private refreshSeq = 0;
  private sincronizando = false;
  readonly auth = inject(AuthService);

  readonly formatFecha = formatFecha;

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'lavadoras', label: 'Lavadoras' },
    { id: 'alquileres', label: 'Alquileres' },
    { id: 'ordenes', label: 'Órdenes' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'comentarios', label: 'Comentarios' },
  ];

  readonly estadosAlquiler = ['Pendiente', 'Activo', 'Finalizado', 'Cancelado'];
  readonly estadosOrden = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];
  readonly estadosLavadora = ['Disponible', 'Reservada', 'Alquilada', 'Mantenimiento'];
  readonly estrellas = [1, 2, 3, 4, 5];

  readonly tab = signal<Tab>('resumen');
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly modalError = signal('');
  readonly aviso = signal('');
  readonly modal = signal<ModalState>(null);
  readonly modoClienteAlquiler = signal<'nuevo' | 'existente'>('nuevo');

  private readonly CEDULA_MAX = 2147483647;

  readonly stats = signal<Stats | null>(null);
  readonly lavadoras = signal<Lavadora[]>([]);
  readonly alquileres = signal<Alquiler[]>([]);
  readonly ordenes = signal<OrdenServicio[]>([]);
  readonly clientes = signal<Cliente[]>([]);
  readonly servicios = signal<Servicio[]>([]);
  readonly comentarios = signal<Comentario[]>([]);

  readonly comentariosPendientes = computed(
    () => this.comentarios().filter((c) => !c.visible).length,
  );

  readonly recientes = computed(() => this.stats()?.recientes ?? []);
  readonly porEstado = computed(() => this.stats()?.por_estado ?? []);
  readonly lavadorasAlquilables = computed(() =>
    this.lavadoras().filter((l) => l.estado !== 'Mantenimiento'),
  );
  readonly alquileresParaOrden = computed(() =>
    this.alquileres().filter((a) => a.estado !== 'Cancelado'),
  );

  readonly formLavadora = this.fb.nonNullable.group({
    marca: ['', Validators.required],
    modelo: ['', Validators.required],
    referencia: ['', Validators.required],
    estado: ['Disponible'],
    precio_alquiler: [0, [Validators.required, Validators.min(1)]],
  });

  readonly formServicio = this.fb.nonNullable.group({
    nombre_servicio: ['', Validators.required],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(1)]],
  });

  readonly formAlquiler = this.fb.nonNullable.group(
    {
      idCliente: ['0'],
      nombre: ['', Validators.required],
      cedula: ['', [Validators.required, (control) => this.validarCedulaFormato(control)]],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      direccion: [''],
      idLavadora: ['', Validators.required],
      fecha_inicio: [hoyISO(), Validators.required],
      fecha_fin: [sumarDias(hoyISO(), 30), Validators.required],
    },
    { validators: rangoFechas },
  );

  readonly formOrden = this.fb.nonNullable.group({
    idAlquiler: ['', Validators.required],
    idTipo_servicio: ['', Validators.required],
    estado: ['Pendiente'],
    observaciones: [''],
  });

  readonly formCliente = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    cedula: ['', [Validators.required, (control) => this.validarCedulaUnica(control)]],
    telefono: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    direccion: [''],
  });

  private validarCedulaFormato(control: AbstractControl): ValidationErrors | null {
    const valor = String(control.value ?? '').trim();
    if (!valor) return null;
    if (!/^\d{5,10}$/.test(valor)) return { cedulaFormato: true };
    if (Number(valor) > this.CEDULA_MAX) return { cedulaRango: true };
    return null;
  }

  private validarCedulaUnica(control: AbstractControl): ValidationErrors | null {
    const formato = this.validarCedulaFormato(control);
    if (formato) return formato;
    const valor = String(control.value ?? '').trim();
    if (!valor) return null;
    const id = this.modal()?.id ?? null;
    const duplicada = this.clientes().some(
      (c) => String(c.cedula) === valor && (id === null || c.id_cliente !== id),
    );
    return duplicada ? { cedulaDuplicada: true } : null;
  }

  private revalidarCedulaCliente(): void {
    this.formCliente.controls.cedula.updateValueAndValidity({ emitEvent: false });
  }

  constructor() {
    this.cargarTodo();

    // Refresco automático: mantiene alquileres, órdenes, lavadoras y resumen
    // sincronizados sin recargar la página (por ejemplo, al cambiar estados).
    interval(3000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (
          document.hidden ||
          this.cargando() ||
          this.guardando() ||
          this.sincronizando ||
          this.modal()
        ) {
          return;
        }
        const activo = document.activeElement;
        if (activo && ['SELECT', 'INPUT', 'TEXTAREA'].includes(activo.tagName)) return;
        this.refrescar();
      });
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.modal()) this.cerrarModal();
  }

  cargarTodo(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      stats: this.api.stats(),
      lavadoras: this.api.lavadoras(),
      alquileres: this.api.alquileres(),
      ordenes: this.api.ordenes(),
      clientes: this.api.clientes(),
      servicios: this.api.servicios(),
      comentarios: this.api.comentariosAdmin(),
    }).subscribe({
      next: (datos) => {
        this.stats.set(datos.stats);
        this.lavadoras.set(datos.lavadoras);
        this.alquileres.set(datos.alquileres);
        this.ordenes.set(datos.ordenes);
        this.clientes.set(datos.clientes);
        this.servicios.set(datos.servicios);
        this.comentarios.set(datos.comentarios);
        this.revalidarCedulaCliente();
        this.cargando.set(false);
      },
      error: (error) => {
        this.error.set(errorMessage(error));
        this.cargando.set(false);
      },
    });
  }

  private refrescar(): void {
    const seq = ++this.refreshSeq;
    this.api.stats().subscribe((stats) => {
      if (seq === this.refreshSeq) this.stats.set(stats);
    });
    this.api.lavadoras().subscribe((lavadoras) => {
      if (seq === this.refreshSeq) this.lavadoras.set(lavadoras);
    });
    this.api.alquileres().subscribe((alquileres) => {
      if (seq === this.refreshSeq) this.alquileres.set(alquileres);
    });
    this.api.ordenes().subscribe((ordenes) => {
      if (seq === this.refreshSeq) this.ordenes.set(ordenes);
    });
    this.api.clientes().subscribe((clientes) => {
      if (seq !== this.refreshSeq) return;
      this.clientes.set(clientes);
      this.revalidarCedulaCliente();
    });
    this.api.servicios().subscribe((servicios) => {
      if (seq === this.refreshSeq) this.servicios.set(servicios);
    });
    this.api.comentariosAdmin().subscribe((comentarios) => {
      if (seq === this.refreshSeq) this.comentarios.set(comentarios);
    });
  }

  private avisar(mensaje: string): void {
    this.aviso.set(mensaje);
    this.error.set('');
    this.modalError.set('');
  }

  private fallar(error: unknown): void {
    const mensaje = errorMessage(error);
    if (this.modal()) {
      this.modalError.set(mensaje);
    } else {
      this.error.set(mensaje);
    }
    this.guardando.set(false);
  }

  // ---------- Alquileres ----------

  abrirAlquiler(cliente?: Cliente): void {
    this.formAlquiler.reset({
      idCliente: cliente ? String(cliente.id_cliente) : '0',
      nombre: cliente?.nombre ?? '',
      cedula: cliente ? String(cliente.cedula) : '',
      telefono: cliente?.telefono ?? '',
      correo: cliente?.correo ?? '',
      direccion: cliente?.direccion ?? '',
      idLavadora: '',
      fecha_inicio: hoyISO(),
      fecha_fin: sumarDias(hoyISO(), 30),
    });
    this.modoClienteAlquiler.set(cliente ? 'existente' : 'nuevo');
    this.modalError.set('');
    this.modal.set({ tipo: 'alquiler', id: null });
  }

  cambiarModoClienteAlquiler(modo: 'nuevo' | 'existente'): void {
    this.modoClienteAlquiler.set(modo);
    this.formAlquiler.patchValue({
      idCliente: '0',
      nombre: '',
      cedula: '',
      telefono: '',
      correo: '',
      direccion: '',
    });
  }

  seleccionarClienteAlquiler(evento: Event): void {
    const id = Number((evento.target as HTMLSelectElement).value);
    const cliente = this.clientes().find((c) => c.id_cliente === id);
    if (!cliente) {
      this.formAlquiler.patchValue({
        nombre: '',
        cedula: '',
        telefono: '',
        correo: '',
        direccion: '',
      });
      return;
    }
    this.formAlquiler.patchValue({
      nombre: cliente.nombre,
      cedula: String(cliente.cedula),
      telefono: cliente.telefono,
      correo: cliente.correo,
      direccion: cliente.direccion ?? '',
    });
  }

  irACrearCliente(): void {
    this.cerrarModal();
    this.tab.set('clientes');
    this.abrirCliente();
  }

  guardarAlquiler(): void {
    this.modalError.set('');
    if (
      this.modoClienteAlquiler() === 'existente' &&
      !Number(this.formAlquiler.controls.idCliente.value)
    ) {
      this.formAlquiler.controls.idCliente.markAsTouched();
      this.modalError.set('Selecciona un cliente registrado o cambia a "Cliente nuevo".');
      return;
    }
    if (this.formAlquiler.invalid) {
      this.formAlquiler.markAllAsTouched();
      return;
    }

    const raw = this.formAlquiler.getRawValue();
    const body: SolicitudAlquiler = {
      cliente: {
        nombre: raw.nombre.trim(),
        cedula: raw.cedula.trim(),
        telefono: raw.telefono.trim(),
        correo: raw.correo.trim(),
        direccion: raw.direccion.trim() || undefined,
      },
      idLavadora: Number(raw.idLavadora),
      fecha_inicio: raw.fecha_inicio,
      fecha_fin: raw.fecha_fin,
    };

    this.guardando.set(true);
    this.api.crearAlquiler(body).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        this.cerrarModal();
        this.refrescar();
        this.avisar(`Alquiler #${respuesta.alquiler.id_alquiler} registrado.`);
      },
      error: (error) => this.fallar(error),
    });
  }

  cambiarEstadoAlquiler(id: number, evento: Event): void {
    const estado = (evento.target as HTMLSelectElement).value;
    const previos = this.alquileres();

    // Actualización optimista: el select muestra el nuevo estado al instante.
    this.alquileres.set(
      previos.map((a) => (a.id_alquiler === id ? { ...a, estado } : a)),
    );
    this.sincronizando = true;

    this.api.cambiarEstadoAlquiler(id, estado).subscribe({
      next: (actualizado) => {
        this.alquileres.set(
          this.alquileres().map((a) =>
            a.id_alquiler === id ? { ...a, ...actualizado, estado } : a,
          ),
        );
        this.refrescar();
        this.sincronizando = false;
        this.avisar(`Alquiler #${id} marcado como ${estado.toLowerCase()}.`);
      },
      error: (error) => {
        this.alquileres.set(previos);
        this.sincronizando = false;
        this.refrescar();
        this.fallar(error);
      },
    });
  }

  eliminarAlquiler(alquiler: Alquiler): void {
    if (!confirm(`¿Eliminar el alquiler #${alquiler.id_alquiler}?`)) return;
    this.api.eliminarAlquiler(alquiler.id_alquiler).subscribe({
      next: () => {
        this.refrescar();
        this.avisar('Alquiler eliminado.');
      },
      error: (error) => this.fallar(error),
    });
  }

  // ---------- Órdenes ----------

  abrirOrden(): void {
    this.formOrden.reset({
      idAlquiler: '',
      idTipo_servicio: '',
      estado: 'Pendiente',
      observaciones: '',
    });
    this.modalError.set('');
    this.modal.set({ tipo: 'orden', id: null });
  }

  guardarOrden(): void {
    if (this.formOrden.invalid) {
      this.formOrden.markAllAsTouched();
      return;
    }

    const raw = this.formOrden.getRawValue();
    const body: OrdenInput = {
      idAlquiler: Number(raw.idAlquiler),
      idTipo_servicio: Number(raw.idTipo_servicio),
      estado: raw.estado,
      ...(raw.observaciones.trim() ? { observaciones: raw.observaciones.trim() } : {}),
    };

    this.guardando.set(true);
    this.api.crearOrden(body).subscribe({
      next: (orden) => {
        this.guardando.set(false);
        this.cerrarModal();
        this.refrescar();
        this.avisar(`Orden #${orden.id_orden_servicio} creada.`);
      },
      error: (error) => this.fallar(error),
    });
  }

  cambiarEstadoOrden(id: number, evento: Event): void {
    const estado = (evento.target as HTMLSelectElement).value;
    const previas = this.ordenes();

    // Actualización optimista: el select muestra el nuevo estado al instante.
    this.ordenes.set(
      previas.map((o) => (o.id_orden_servicio === id ? { ...o, estado } : o)),
    );
    this.sincronizando = true;

    this.api.cambiarEstadoOrden(id, estado).subscribe({
      next: (actualizada) => {
        this.ordenes.set(
          this.ordenes().map((o) =>
            o.id_orden_servicio === id ? { ...o, ...actualizada, estado } : o,
          ),
        );
        // El backend sincroniza alquiler y lavadora: se reflejan al refrescar.
        this.refrescar();
        this.sincronizando = false;
        this.avisar(`Orden #${id} actualizada.`);
      },
      error: (error) => {
        this.ordenes.set(previas);
        this.sincronizando = false;
        this.refrescar();
        this.fallar(error);
      },
    });
  }

  eliminarOrden(orden: OrdenServicio): void {
    if (!confirm(`¿Eliminar la orden #${orden.id_orden_servicio}?`)) return;
    this.api.eliminarOrden(orden.id_orden_servicio).subscribe({
      next: () => {
        this.refrescar();
        this.avisar('Orden eliminada.');
      },
      error: (error) => this.fallar(error),
    });
  }

  // ---------- Lavadoras ----------

  abrirLavadora(lavadora?: Lavadora): void {
    this.modalError.set('');
    if (lavadora) {
      this.formLavadora.reset({
        marca: lavadora.marca,
        modelo: lavadora.modelo,
        referencia: lavadora.referencia,
        estado: lavadora.estado,
        precio_alquiler: lavadora.precio_alquiler,
      });
      this.modal.set({ tipo: 'lavadora', id: lavadora.id_lavadora });
    } else {
      this.formLavadora.reset({ estado: 'Disponible', precio_alquiler: 0 });
      this.modal.set({ tipo: 'lavadora', id: null });
    }
  }

  guardarLavadora(): void {
    if (this.formLavadora.invalid) {
      this.formLavadora.markAllAsTouched();
      return;
    }

    const id = this.modal()?.id ?? null;
    const body = this.formLavadora.getRawValue() as LavadoraInput;
    this.guardando.set(true);

    const peticion = id
      ? this.api.actualizarLavadora(id, body)
      : this.api.crearLavadora(body);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.refrescar();
        this.avisar(id ? 'Lavadora actualizada.' : 'Lavadora creada.');
      },
      error: (error) => this.fallar(error),
    });
  }

  eliminarLavadora(lavadora: Lavadora): void {
    if (!confirm(`¿Eliminar la lavadora ${lavadora.marca} ${lavadora.modelo}?`)) return;
    this.api.eliminarLavadora(lavadora.id_lavadora).subscribe({
      next: () => {
        this.refrescar();
        this.avisar('Lavadora eliminada.');
      },
      error: (error) => this.fallar(error),
    });
  }

  // ---------- Servicios ----------

  abrirServicio(servicio?: Servicio): void {
    this.modalError.set('');
    if (servicio) {
      this.formServicio.reset({
        nombre_servicio: servicio.nombre_servicio,
        descripcion: servicio.descripcion ?? '',
        precio: servicio.precio,
      });
      this.modal.set({ tipo: 'servicio', id: servicio.id_tipo_servicio });
    } else {
      this.formServicio.reset({ nombre_servicio: '', descripcion: '', precio: 0 });
      this.modal.set({ tipo: 'servicio', id: null });
    }
  }

  guardarServicio(): void {
    if (this.formServicio.invalid) {
      this.formServicio.markAllAsTouched();
      return;
    }

    const id = this.modal()?.id ?? null;
    const body = this.formServicio.getRawValue() as ServicioInput;
    this.guardando.set(true);

    const peticion = id
      ? this.api.actualizarServicio(id, body)
      : this.api.crearServicio(body);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.refrescar();
        this.avisar(id ? 'Servicio actualizado.' : 'Servicio creado.');
      },
      error: (error) => this.fallar(error),
    });
  }

  eliminarServicio(servicio: Servicio): void {
    if (!confirm(`¿Eliminar el servicio "${servicio.nombre_servicio}"?`)) return;
    this.api.eliminarServicio(servicio.id_tipo_servicio).subscribe({
      next: () => {
        this.refrescar();
        this.avisar('Servicio eliminado.');
      },
      error: (error) => this.fallar(error),
    });
  }

  // ---------- Comentarios ----------

  cambiarVisibilidadComentario(comentario: Comentario, evento: Event): void {
    const visible = (evento.target as HTMLInputElement).checked;
    const previos = this.comentarios();

    // Actualización optimista: el interruptor responde al instante.
    this.comentarios.set(
      previos.map((c) =>
        c.id_comentario === comentario.id_comentario ? { ...c, visible } : c,
      ),
    );
    this.sincronizando = true;

    this.api.cambiarVisibilidadComentario(comentario.id_comentario, visible).subscribe({
      next: () => {
        this.sincronizando = false;
        this.refrescar();
        this.avisar(
          visible
            ? 'Comentario visible en la página pública.'
            : 'Comentario oculto de la página pública.',
        );
      },
      error: (error) => {
        this.comentarios.set(previos);
        this.sincronizando = false;
        this.fallar(error);
      },
    });
  }

  eliminarComentario(comentario: Comentario): void {
    if (!confirm(`¿Eliminar el comentario de ${comentario.nombre}?`)) return;
    this.api.eliminarComentario(comentario.id_comentario).subscribe({
      next: () => {
        this.refrescar();
        this.avisar('Comentario eliminado.');
      },
      error: (error) => this.fallar(error),
    });
  }

  // ---------- Clientes ----------

  abrirCliente(cliente?: Cliente): void {
    this.modalError.set('');
    if (cliente) {
      this.formCliente.reset({
        nombre: cliente.nombre,
        cedula: String(cliente.cedula),
        telefono: cliente.telefono,
        correo: cliente.correo,
        direccion: cliente.direccion ?? '',
      });
      this.modal.set({ tipo: 'cliente', id: cliente.id_cliente });
    } else {
      this.formCliente.reset({
        nombre: '',
        cedula: '',
        telefono: '',
        correo: '',
        direccion: '',
      });
      this.modal.set({ tipo: 'cliente', id: null });
    }
    this.revalidarCedulaCliente();
  }

  guardarCliente(): void {
    if (this.formCliente.invalid) {
      this.formCliente.markAllAsTouched();
      return;
    }

    const id = this.modal()?.id ?? null;
    const raw = this.formCliente.getRawValue();
    const body: ClienteInput = {
      nombre: raw.nombre.trim(),
      cedula: raw.cedula.trim(),
      telefono: raw.telefono.trim(),
      correo: raw.correo.trim(),
      direccion: raw.direccion.trim() || null,
    };

    this.guardando.set(true);
    const peticion = id
      ? this.api.actualizarCliente(id, body)
      : this.api.crearCliente(body);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.refrescar();
        this.avisar(id ? 'Cliente actualizado.' : 'Cliente creado.');
      },
      error: (error) => this.fallar(error),
    });
  }

  eliminarCliente(cliente: Cliente): void {
    if (!confirm(`¿Eliminar el cliente ${cliente.nombre}?`)) return;
    this.api.eliminarCliente(cliente.id_cliente).subscribe({
      next: () => {
        this.refrescar();
        this.avisar('Cliente eliminado.');
      },
      error: (error) => this.fallar(error),
    });
  }

  cerrarModal(): void {
    this.modalError.set('');
    this.modal.set(null);
  }

  tituloModal(): string {
    const m = this.modal();
    if (!m) return '';
    const nombres: Record<string, string> = {
      lavadora: 'lavadora',
      servicio: 'servicio',
      alquiler: 'alquiler',
      orden: 'orden de servicio',
      cliente: 'cliente',
    };
    return `${m.id ? 'Editar' : 'Nuevo'} ${nombres[m.tipo]}`;
  }

  // ---------- Utilidades visuales ----------

  estadoAlquilerClase(estado: string): string {
    switch (estado) {
      case 'Activo':
        return 'badge--blue';
      case 'Finalizado':
        return 'badge--ok';
      case 'Cancelado':
        return 'badge--danger';
      default:
        return 'badge--warn';
    }
  }

  estadoOrdenClase(estado: string): string {
    switch (estado) {
      case 'En proceso':
        return 'badge--blue';
      case 'Completado':
        return 'badge--ok';
      case 'Cancelado':
        return 'badge--danger';
      default:
        return 'badge--warn';
    }
  }

  estadoLavadoraClase(estado: string): string {
    switch (estado) {
      case 'Disponible':
        return 'badge--ok';
      case 'Alquilada':
        return 'badge--blue';
      case 'Mantenimiento':
        return 'badge--danger';
      default:
        return 'badge--warn';
    }
  }
}

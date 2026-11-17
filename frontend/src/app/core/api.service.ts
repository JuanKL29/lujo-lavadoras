import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Alquiler,
  Cliente,
  Comentario,
  Lavadora,
  LoginResponse,
  OrdenServicio,
  Servicio,
  SolicitudAlquiler,
  Stats,
} from './models';

export type LavadoraInput = Omit<Lavadora, 'id_lavadora'>;
export type ServicioInput = Omit<Servicio, 'id_tipo_servicio'>;

export interface ComentarioInput {
  nombre: string;
  correo?: string | null;
  comentario: string;
  calificacion: number;
}

export interface ClienteInput {
  nombre: string;
  cedula: string | number;
  telefono: string;
  correo: string;
  direccion?: string | null;
}

export interface OrdenInput {
  idAlquiler: number;
  idTipo_servicio: number;
  estado?: string;
  observaciones?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  // ---- Autenticación ----
  login(correo: string, password: string) {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { correo, password });
  }

  // ---- Catálogo ----
  lavadoras() {
    return this.http.get<Lavadora[]>(`${this.base}/lavadoras`);
  }

  crearLavadora(body: LavadoraInput) {
    return this.http.post<Lavadora>(`${this.base}/lavadoras`, body);
  }

  actualizarLavadora(id: number, body: LavadoraInput) {
    return this.http.put<Lavadora>(`${this.base}/lavadoras/${id}`, body);
  }

  eliminarLavadora(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/lavadoras/${id}`);
  }

  servicios() {
    return this.http.get<Servicio[]>(`${this.base}/servicios`);
  }

  crearServicio(body: ServicioInput) {
    return this.http.post<Servicio>(`${this.base}/servicios`, body);
  }

  actualizarServicio(id: number, body: ServicioInput) {
    return this.http.put<Servicio>(`${this.base}/servicios/${id}`, body);
  }

  eliminarServicio(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/servicios/${id}`);
  }

  // ---- Comentarios ----
  comentarios() {
    return this.http.get<Comentario[]>(`${this.base}/comentarios`);
  }

  enviarComentario(body: ComentarioInput) {
    return this.http.post<Comentario>(`${this.base}/comentarios`, body);
  }

  comentariosAdmin() {
    return this.http.get<Comentario[]>(`${this.base}/comentarios/admin`);
  }

  cambiarVisibilidadComentario(id: number, visible: boolean) {
    return this.http.patch<Comentario>(`${this.base}/comentarios/${id}/visible`, { visible });
  }

  eliminarComentario(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/comentarios/${id}`);
  }

  // ---- Alquileres ----
  crearAlquiler(body: SolicitudAlquiler) {
    return this.http.post<{
      mensaje: string;
      alquiler: Alquiler;
    }>(`${this.base}/alquileres`, body);
  }

  alquileres() {
    return this.http.get<Alquiler[]>(`${this.base}/alquileres`);
  }

  cambiarEstadoAlquiler(id: number, estado: string) {
    return this.http.patch<Alquiler>(`${this.base}/alquileres/${id}/estado`, { estado });
  }

  eliminarAlquiler(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/alquileres/${id}`);
  }

  // ---- Órdenes de servicio ----
  ordenes() {
    return this.http.get<OrdenServicio[]>(`${this.base}/ordenes`);
  }

  crearOrden(body: OrdenInput) {
    return this.http.post<OrdenServicio>(`${this.base}/ordenes`, body);
  }

  cambiarEstadoOrden(id: number, estado: string) {
    return this.http.patch<OrdenServicio>(`${this.base}/ordenes/${id}/estado`, { estado });
  }

  eliminarOrden(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/ordenes/${id}`);
  }

  // ---- Clientes y estadísticas ----
  clientes() {
    return this.http.get<Cliente[]>(`${this.base}/clientes`);
  }

  crearCliente(body: ClienteInput) {
    return this.http.post<Cliente>(`${this.base}/clientes`, body);
  }

  actualizarCliente(id: number, body: ClienteInput) {
    return this.http.put<Cliente>(`${this.base}/clientes/${id}`, body);
  }

  eliminarCliente(id: number) {
    return this.http.delete<{ ok: boolean }>(`${this.base}/clientes/${id}`);
  }

  stats() {
    return this.http.get<Stats>(`${this.base}/stats`);
  }
}

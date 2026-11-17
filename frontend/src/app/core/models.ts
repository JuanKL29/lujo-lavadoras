export interface Lavadora {
  id_lavadora: number;
  marca: string;
  modelo: string;
  referencia: string;
  estado: string;
  precio_alquiler: number;
}

export interface Servicio {
  id_tipo_servicio: number;
  nombre_servicio: string;
  descripcion: string | null;
  precio: number;
}

export interface Cliente {
  id_cliente: number;
  nombre: string;
  cedula: number;
  telefono: string;
  correo: string;
  direccion: string | null;
  total_alquileres?: number;
  ultimo_alquiler?: string | null;
}

export interface Alquiler {
  id_alquiler: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  idCliente: number;
  idLavadora: number;
  dias?: number;
  total?: number;
  cliente_nombre?: string;
  cedula?: number;
  telefono?: string;
  correo?: string;
  direccion?: string | null;
  marca?: string;
  modelo?: string;
  referencia?: string;
  precio_alquiler?: number;
}

export interface OrdenServicio {
  id_orden_servicio: number;
  fecha_orden: string;
  estado: string;
  observaciones: string | null;
  idAlquiler: number;
  idTipo_servicio: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  marca?: string;
  modelo?: string;
  referencia?: string;
  cliente_nombre?: string;
  cedula?: number;
  nombre_servicio?: string;
  precio_servicio?: number;
}

export interface Comentario {
  id_comentario: number;
  nombre: string;
  correo?: string | null;
  comentario: string;
  calificacion: number;
  visible?: boolean;
  fecha: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
}export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface Stats {
  lavadoras: number;
  disponibles: number;
  alquileres: number;
  pendientes: number;
  activos: number;
  clientes: number;
  ordenes_abiertas: number;
  ingreso_estimado: number;
  por_estado: { estado: string; total: number }[];
  recientes: Alquiler[];
}

export interface SolicitudAlquiler {
  cliente: {
    nombre: string;
    cedula: string;
    telefono: string;
    correo: string;
    direccion?: string;
  };
  idLavadora: number;
  fecha_inicio: string;
  fecha_fin: string;
}

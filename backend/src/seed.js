import bcrypt from 'bcryptjs';
import { pool, nextId, withTransaction } from './db.js';
import { ensureComentariosTable } from './comentarios-schema.js';

const ADMIN = {
  nombre: 'Administrador',
  cedula: 1000000000,
  correo: 'admin@lujolavadoras.com',
  password: 'admin123',
  rol: 'admin',
};

const LAVADORAS = [
  { marca: 'LG', modelo: 'WM3400CW', referencia: 'LG-WM3400', estado: 'Disponible', precio_alquiler: 120000 },
  { marca: 'Samsung', modelo: 'WA19T', referencia: 'SAM-WA19T', estado: 'Disponible', precio_alquiler: 135000 },
  { marca: 'Whirlpool', modelo: '8MWTW', referencia: 'WHI-8MWTW', estado: 'Disponible', precio_alquiler: 110000 },
  { marca: 'Mabe', modelo: 'LMA7911', referencia: 'MAB-LMA7911', estado: 'Disponible', precio_alquiler: 125000 },
  { marca: 'Haceb', modelo: 'Carga Superior 10kg', referencia: 'HAC-10KG', estado: 'Mantenimiento', precio_alquiler: 105000 },
  { marca: 'Electrolux', modelo: 'EWFLS70', referencia: 'ELE-EWFLS70', estado: 'Disponible', precio_alquiler: 145000 },
];

const SERVICIOS = [
  { nombre_servicio: 'Instalación y transporte', descripcion: 'Llevamos, instalamos y conectamos la lavadora en tu hogar.', precio: 30000 },
  { nombre_servicio: 'Lavado express', descripcion: 'Lavado y secado de una carga en menos de 3 horas.', precio: 25000 },
  { nombre_servicio: 'Mantenimiento preventivo', descripcion: 'Limpieza de tambor, filtros y revisión general.', precio: 45000 },
  { nombre_servicio: 'Plan mensual', descripcion: 'Lavadora en casa con soporte técnico incluido por 30 días.', precio: 120000 },
];

// Comentarios de ejemplo ya aprobados para que la sección pública no esté vacía.
const COMENTARIOS = [
  {
    nombre: 'Ana María Rodríguez',
    correo: 'ana.rodriguez@correo.com',
    comentario:
      'La lavadora llegó al día siguiente y la instalación fue muy rápida. Excelente servicio.',
    calificacion: 5,
  },
  {
    nombre: 'Carlos Pérez',
    correo: 'carlos.perez@correo.com',
    comentario:
      'Buena atención por WhatsApp y el equipo funciona perfecto. Solo tardaron un poco en confirmar la fecha.',
    calificacion: 4,
  },
  {
    nombre: 'Laura Gómez',
    correo: 'laura.gomez@correo.com',
    comentario:
      'Alquilar fue la mejor decisión: no tuve que comprar lavadora y el soporte respondió de inmediato.',
    calificacion: 5,
  },
];

async function seed() {
  await ensureComentariosTable();

  await withTransaction(async (conn) => {
    const [[admin]] = await conn.query('SELECT id_usuario FROM usuario WHERE correo = ?', [
      ADMIN.correo,
    ]);
    if (!admin) {
      const id = await nextId(conn, 'usuario', 'id_usuario');
      const hash = await bcrypt.hash(ADMIN.password, 10);
      await conn.query(
        'INSERT INTO usuario (id_usuario, nombre, cedula, correo, `contraseña`, rol) VALUES (?, ?, ?, ?, ?, ?)',
        [id, ADMIN.nombre, ADMIN.cedula, ADMIN.correo, hash, ADMIN.rol],
      );
      console.log(`Usuario admin creado: ${ADMIN.correo} / ${ADMIN.password}`);
    } else {
      console.log('El usuario admin ya existía, no se modificó.');
    }

    for (const lavadora of LAVADORAS) {
      const [[existe]] = await conn.query('SELECT id_lavadora FROM lavadora WHERE referencia = ?', [
        lavadora.referencia,
      ]);
      if (existe) continue;
      const id = await nextId(conn, 'lavadora', 'id_lavadora');
      await conn.query(
        `INSERT INTO lavadora (id_lavadora, marca, modelo, referencia, estado, precio_alquiler)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, lavadora.marca, lavadora.modelo, lavadora.referencia, lavadora.estado, lavadora.precio_alquiler],
      );
    }
    console.log(`Lavadoras listas (${LAVADORAS.length} de ejemplo).`);

    for (const servicio of SERVICIOS) {
      const [[existe]] = await conn.query(
        'SELECT id_tipo_servicio FROM tipo_de_servicio WHERE nombre_servicio = ?',
        [servicio.nombre_servicio],
      );
      if (existe) continue;
      const id = await nextId(conn, 'tipo_de_servicio', 'id_tipo_servicio');
      await conn.query(
        `INSERT INTO tipo_de_servicio (id_tipo_servicio, nombre_servicio, descripcion, precio)
         VALUES (?, ?, ?, ?)`,
        [id, servicio.nombre_servicio, servicio.descripcion, servicio.precio],
      );
    }
    console.log(`Servicios listos (${SERVICIOS.length} de ejemplo).`);

    for (const ejemplo of COMENTARIOS) {
      const [[existe]] = await conn.query(
        'SELECT id_comentario FROM comentario WHERE comentario = ? LIMIT 1',
        [ejemplo.comentario],
      );
      if (existe) continue;
      const id = await nextId(conn, 'comentario', 'id_comentario');
      await conn.query(
        `INSERT INTO comentario
           (id_comentario, nombre, correo, comentario, calificacion, visible)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          id,
          ejemplo.nombre,
          ejemplo.correo,
          ejemplo.comentario,
          ejemplo.calificacion,
        ],
      );
    }
    console.log(`Comentarios listos (${COMENTARIOS.length} de ejemplo).`);
  });

  await pool.end();
  console.log('Datos iniciales cargados.');
}

seed().catch(async (error) => {
  console.error('Error al cargar datos iniciales:', error);
  await pool.end();
  process.exit(1);
});

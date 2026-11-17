// Prueba de carga de solo lectura para Lujo Lavadoras.
// Ejecutar con el backend en marcha:
//   k6 run docs/k6/prueba-carga.js
// Variables opcionales:
//   k6 run -e BASE_URL=http://127.0.0.1:3000 docs/k6/prueba-carga.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:3000';
const CORREO = __ENV.ADMIN_CORREO || 'admin@lujolavadoras.com';
const PASSWORD = __ENV.ADMIN_PASSWORD || 'admin123';
const VUS = Number(__ENV.VUS || 10); // usuarios virtuales simultáneos

export const options = {
  stages: [
    { duration: '10s', target: VUS }, // sube a los usuarios virtuales indicados
    { duration: '20s', target: VUS }, // mantiene la carga
    { duration: '5s', target: 0 }, // baja de forma gradual
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // menos del 1 % de errores
    http_req_duration: ['p(95)<500'], // 95 % de respuestas bajo 500 ms
    checks: ['rate>0.99'], // más del 99 % de comprobaciones correctas
  },
};

// El login se hace una sola vez y el token se comparte entre usuarios virtuales.
export function setup() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ correo: CORREO, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const ok = check(res, { 'login responde 200': (r) => r.status === 200 });
  if (!ok) {
    throw new Error(`Login fallido: HTTP ${res.status}`);
  }

  return { token: res.json('token') };
}

export default function (data) {
  const autorizado = { headers: { Authorization: `Bearer ${data.token}` } };

  const respuestas = {
    health: http.get(`${BASE}/api/health`),
    lavadoras: http.get(`${BASE}/api/lavadoras`),
    servicios: http.get(`${BASE}/api/servicios`),
    disponibilidad: http.get(`${BASE}/api/lavadoras/1/disponibilidad`),
    alquileres: http.get(`${BASE}/api/alquileres`, autorizado),
    stats: http.get(`${BASE}/api/stats`, autorizado),
  };

  for (const [nombre, res] of Object.entries(respuestas)) {
    check(res, {
      [`${nombre} responde 200`]: (r) => r.status === 200,
      [`${nombre} responde en menos de 1 s`]: (r) => r.timings.duration < 1000,
    });
  }

  sleep(1);
}

// src/app/config.ts
// 🔥 Configuración que funciona en LOCAL y PRODUCCIÓN

// Detectar si estamos en local o producción
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('localhost');

// Detectar si estamos en desarrollo (ng serve)
const isDevelopment = window.location.port === '4200' || 
                      window.location.port === '4201';

export const API_CONFIG = {
  // 🔥 Cambiar automáticamente según el entorno
  BASE_URL: (isLocalhost || isDevelopment) 
    ? '/rtm-api/'  // ← Local: usa el proxy de desarrollo
    : '/api-proxy.php?path=',  // ← Producción: usa el proxy PHP
  
  TOKEN: 'c3237a07dd144d951a0d213330550818101cb81c',
  CLIENTE: 'pagina_web',
  PAGOS_URL: 'https://servicio-agendamiento.automas.co',
  
  // Info de debug
  IS_PRODUCTION: !(isLocalhost || isDevelopment),
  CURRENT_HOST: window.location.hostname
};

// Log para debugging (ver en consola)
console.log('🔧 Config API:', {
  entorno: API_CONFIG.IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO',
  baseUrl: API_CONFIG.BASE_URL,
  host: API_CONFIG.CURRENT_HOST
});
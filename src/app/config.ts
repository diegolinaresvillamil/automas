// src/app/config.ts
// 🔥 Configuración que funciona en LOCAL y PRODUCCIÓN

// Detectar si estamos en local o producción
const hostname = window.location.hostname;
const port = window.location.port;

const isLocalhost = hostname === 'localhost' || 
                    hostname === '127.0.0.1' ||
                    hostname.includes('localhost');

const isDevelopment = port === '4200' || port === '4201';

const isProduction = !isLocalhost && !isDevelopment;

// 🔥 IMPORTANTE: En producción SIEMPRE usar api-proxy.php
const baseUrl = isProduction 
  ? '/api-proxy.php?path='
  : '/rtm-api/';

export const API_CONFIG = {
  BASE_URL: baseUrl,
  TOKEN: 'c3237a07dd144d951a0d213330550818101cb81c',
  CLIENTE: 'pagina_web',
  PAGOS_URL: 'https://servicio-agendamiento.automas.co',
  
  // Info de debug
  IS_PRODUCTION: isProduction,
  CURRENT_HOST: hostname,
  CURRENT_PORT: port
};

// 🔍 Log detallado para debugging
console.log('🔧 Config API:', {
  hostname: hostname,
  port: port,
  isLocalhost: isLocalhost,
  isDevelopment: isDevelopment,
  isProduction: isProduction,
  baseUrl: baseUrl,
  '✅ Debería usar': isProduction ? 'api-proxy.php' : 'rtm-api'
});

// 🚨 Alerta si algo está mal
if (isProduction && baseUrl.includes('rtm-api')) {
  console.error('❌ ERROR: Estás en producción pero usando rtm-api');
  console.error('❌ Hostname:', hostname);
  console.error('❌ Port:', port);
}

if (!isProduction && baseUrl.includes('api-proxy')) {
  console.warn('⚠️ WARNING: Estás en desarrollo pero usando api-proxy.php');
}
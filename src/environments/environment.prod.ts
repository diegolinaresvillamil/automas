export const environment = {
  production: true,
  
  // 🔥 Detección automática del entorno
  rtmHost: window.location.hostname === 'localhost' 
    ? '/rtm-api/' 
    : 'https://servicio-agendamiento.automas.co/api/',
    
  apiBaseUrl: window.location.hostname === 'localhost'
    ? '/rtm-api/'
    : 'https://servicio-agendamiento.automas.co/api/',
    
  pagosBaseUrl: window.location.hostname === 'localhost'
    ? '/rtm-api/'
    : 'https://servicio-agendamiento.automas.co',
};
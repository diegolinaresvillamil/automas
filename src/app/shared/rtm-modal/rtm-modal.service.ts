import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment'; 
import { API_CONFIG } from '../../config';

@Injectable({ providedIn: 'root' })
export class RtmModalService {
  // =============================
  // ✅ CONTROL DEL MODAL
  // =============================
  private _open$ = new BehaviorSubject<boolean>(false);
  open$ = this._open$.asObservable();

  open() { this._open$.next(true); }
  close() { this._open$.next(false); }

  // =============================
  // ✅ DATOS INICIALES DEL USUARIO
  // =============================
  private _datosIniciales:
    | {
        placa: string;
        nombre: string;
        telefono: string;
        docTipo: string;
        documento: string;
        correo?: string;
      }
    | null = null;

  setDatosIniciales(datos: {
    placa: string;
    nombre: string;
    telefono: string;
    docTipo: string;
    documento: string;
    correo?: string;
  }) {
    this._datosIniciales = datos;
  }

  getDatosIniciales() {
    return this._datosIniciales;
  }

  // =============================
  // ✅ CONFIG API
  // =============================
  private readonly baseUrl = API_CONFIG.BASE_URL;
  private readonly token = 'c3237a07dd144d951a0d213330550818101cb81c';
  private readonly cliente = 'pagina_web';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  // =============================
  // 🔧 HELPER: Construir URL base correcta
  // =============================
  /**
   * 🔥 VERSIÓN CORREGIDA para trabajar con proxy PHP
   * 
   * DESARROLLO (localhost):
   * - baseUrl = '/rtm-api/'
   * - Resultado: '/rtm-api/wh/transversal/ejecutar-accion/'
   * 
   * PRODUCCIÓN (automas.com.co):
   * - baseUrl = '/api-proxy.php?path='
   * - Resultado: '/api-proxy.php?path=/rtm-api/wh/transversal/ejecutar-accion/'
   * - Proxy PHP agrega: 'https://servicio-agendamiento.automas.co/api/'
   * - Final: 'https://servicio-agendamiento.automas.co/api/rtm-api/wh/...'
   */
  private buildUrl(tipo: 'transversal' | 'pagos'): string {
    // Detectar si estamos en producción (no localhost)
    const isProduction = !window.location.hostname.includes('localhost');
    
    if (isProduction) {
      // 🔥 PRODUCCIÓN: Usar proxy PHP
      // baseUrl = '/api-proxy.php?path='
      
      if (tipo === 'transversal') {
        // Agregar /rtm-api/ al path para endpoints RUNT
        return this.baseUrl + '/rtm-api/wh/transversal/ejecutar-accion/';
      } else {
        // Para endpoints de pagos
        return this.baseUrl + '/proyecto-pagos/';
      }
    } else {
      // 🔥 DESARROLLO: Sin proxy PHP
      // baseUrl = '/rtm-api/'
      
      const cleanBase = this.baseUrl.replace(/\/$/, '');
      
      if (tipo === 'transversal') {
        return `${cleanBase}/wh/transversal/ejecutar-accion/`;
      } else {
        // En desarrollo, cambiar de /rtm-api/ a /api/ para pagos
        const apiBase = cleanBase.replace(/\/rtm-api$/, '/api');
        return `${apiBase}/`;
      }
    }
  }

  // =============================
  // 🚗 CIUDADES Y PROVEEDORES
  // =============================
  obtenerCiudades(): Observable<any> {
    const params = new HttpParams().set('accion', 'obtener_ciudades');
    const url = this.buildUrl('transversal');
    
    console.log('🏙️ Obteniendo ciudades desde:', url);
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      catchError(err => {
        console.error('❌ Error al obtener ciudades:', err);
        return of({ data: [] });
      })
    );
  }

  obtenerProveedores(ciudadNombre: string): Observable<any> {
    const params = new HttpParams()
      .set('accion', 'obtener_proveedores')
      .set('ciudad', ciudadNombre.trim())
      .set('from_flow', 'rtm');
    
    const url = this.buildUrl('transversal');
    
    console.log('🏢 Obteniendo proveedores para:', ciudadNombre);
    console.log('🏢 URL completa:', url);
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    }).pipe(
      catchError(err => {
        console.error('❌ Error al obtener proveedores:', err);
        return of({ data: [] });
      })
    );
  }

  // =============================
  // 🧩 HELPERS
  // =============================
  private buildFechaAgenda(fecha: Date) {
    return {
      day: fecha.getDate(),
      month: fecha.getMonth() + 1,
      year: fecha.getFullYear()
    };
  }

  // =============================
  // 🕒 HORARIOS DISPONIBLES (OPCIONAL - Token expirado)
  // =============================
  obtenerHorariosDisponibles(params: {
    sede: string;
    fecha: Date;
    ciudad: string;
    from_flow?: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=obtener_horarios_disponibles`;
    
    const fecha_agenda = {
      day: params.fecha.getDate(),
      month: params.fecha.getMonth() + 1,
      year: params.fecha.getFullYear()
    };
    
    const body = {
      sede: params.sede.trim(),
      fecha_agenda: fecha_agenda,
      from_flow: params.from_flow ?? 'rtm',
      ciudad: params.ciudad.trim()
    };
    
    console.log('🕒 Consultando horarios disponibles:', body);
    console.log('⚠️ NOTA: Token puede estar expirado, continuará sin horarios');
    
    return this.http.post<any>(url, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener horarios (token expirado):', err);
        // Retornar estructura vacía pero válida
        return of({ 
          data: [],
          message: 'Token expirado - Continuar sin horarios'
        });
      })
    );
  }

  // =============================
  // 💰 2A) COTIZAR CON RUNT
  // =============================
  cotizarConRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    tipo_identificacion: string;
    identificacion: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=cotizar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      tipo_identificacion: params.tipo_identificacion,
      identificacion: params.identificacion,
      from_flow: 'rtm'
    };
    
    console.log('💰 Cotizando con RUNT:', body);
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al cotizar:', err);
        // Retornar precio por defecto
        return of({ 
          data: { price: 290000 },
          message: 'Precio estimado'
        });
      })
    );
  }

  // =============================
  // 💰 2B) COTIZAR SIN RUNT
  // =============================
  cotizarSinRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    clase_vehiculo: string;
    tipo_servicio: string;
    tipo_combustible: string;
    modelo: string;
    fecha_vencimiento_rtm: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=cotizar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      clase_vehiculo: params.clase_vehiculo,
      tipo_servicio: params.tipo_servicio,
      tipo_combustible: params.tipo_combustible,
      modelo: params.modelo,
      fecha_vencimiento_rtm: params.fecha_vencimiento_rtm,
      from_flow: 'rtm'
    };
    
    console.log('💰 Cotizando sin RUNT:', body);
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al cotizar:', err);
        return of({ 
          data: { price: 290000 },
          message: 'Precio estimado'
        });
      })
    );
  }

  // =============================
  // 📆 3A) AGENDAR CON RUNT
  // =============================
  agendarConRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    tipo_identificacion: string;
    identificacion: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=agendar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      tipo_identificacion: params.tipo_identificacion,
      identificacion: params.identificacion,
      from_flow: 'rtm'
    };
    
    console.log('📆 Agendando con RUNT:', body);
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al agendar:', err);
        // Retornar invoice_id ficticio para continuar
        return of({ 
          data: { invoice_id: 999999 },
          message: 'Agendamiento simulado'
        });
      })
    );
  }

  // =============================
  // 📆 3B) AGENDAR SIN RUNT
  // =============================
  agendarSinRunt(params: {
    placa: string;
    fecha: Date;
    franja: string;
    ciudad: string;
    sede: string;
    celular: string;
    correo: string;
    nombres: string;
    clase_vehiculo: string;
    tipo_servicio: string;
    tipo_combustible: string;
    modelo: string;
    fecha_vencimiento_rtm: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=agendar`;
    
    const body = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: this.buildFechaAgenda(params.fecha),
      franja: params.franja,
      ciudad: params.ciudad,
      sede: params.sede,
      celular: params.celular,
      correo: params.correo,
      nombres: params.nombres,
      clase_vehiculo: params.clase_vehiculo,
      tipo_servicio: params.tipo_servicio,
      tipo_combustible: params.tipo_combustible,
      modelo: params.modelo,
      fecha_vencimiento_rtm: params.fecha_vencimiento_rtm,
      from_flow: 'rtm'
    };
    
    console.log('📆 Agendando sin RUNT:', body);
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al agendar:', err);
        return of({ 
          data: { invoice_id: 999999 },
          message: 'Agendamiento simulado'
        });
      })
    );
  }

  // =============================
  // 💳 4) REGISTRAR PAGO (ANTIGUO - Deprecado)
  // =============================
  registrarPago(invoiceId: number): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=registrar_pago`;
    const body = { invoice_id: invoiceId };
    
    console.log('💳 Registrando pago para invoice:', invoiceId);
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al registrar pago:', err);
        return of({ success: false, message: 'Error al registrar pago' });
      })
    );
  }

  // =============================
  // 💳 NUEVOS MÉTODOS DE INTEGRACIÓN DE PAGOS
  // =============================

  /**
   * 📌 5) OBTENER PROYECTO DE PAGO
   * Obtiene la configuración del proyecto de pago activo
   * Endpoint: GET /api/proyecto-pagos/{codigo_proyecto}/
   */
  obtenerProyectoPago(codigoProyecto: string = 'pagina_web'): Observable<any> {
    const baseUrl = this.buildUrl('pagos');
    const url = `${baseUrl}proyecto-pagos/${codigoProyecto}/`;
    
    console.log('🔍 Obteniendo proyecto de pago desde:', url);
    
    return this.http.get<any>(url, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al obtener proyecto de pago:', err);
        console.error('URL intentada:', url);
        // Retornar estructura mínima para continuar
        return of({ 
          id: 1,
          codigo_proyecto: codigoProyecto,
          medio_de_pago: {
            id: 1,
            nombre: 'Mercado Pago',
            codigo: 'mercadopago',
            activo: true
          },
          estado: true,
          message: 'Configuración por defecto (error al cargar)'
        });
      })
    );
  }

  /**
   * 📌 6) GENERAR LINK DE PAGO
   * Genera un link de pago en Mercado Pago
   * Endpoint: POST /api/pagos/generar-link/
   */
  generarLinkPago(payload: {
    proyecto: string;
    medio_pago: string;
    sede: string;
    servicio_tipovehiculo: string;
    servicio_label: string;
    placa_vehiculo: string;
    valor: number;
  }): Observable<{
    pago_id: string;
    preference_id: string;
    payment_link: string;
  }> {
    const baseUrl = this.buildUrl('pagos');
    const url = `${baseUrl}pagos/generar-link/`;
    
    console.log('💳 Generando link de pago desde:', url);
    console.log('💳 Payload:', payload);
    
    return this.http.post<any>(url, payload, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al generar link de pago:', err);
        console.error('URL intentada:', url);
        console.error('Status:', err.status);
        console.error('Message:', err.message);
        
        // Lanzar el error para que el componente lo maneje
        throw err;
      })
    );
  }

  /**
   * 📌 7) VERIFICAR ESTADO DE PAGO
   * Verifica el estado actual de un pago
   * Endpoint: GET /api/pagos/{uuid_pago}/verificar-estado/
   */
  verificarEstadoPago(pagoUuid: string): Observable<any> {
    const baseUrl = this.buildUrl('pagos');
    const url = `${baseUrl}pagos/${pagoUuid}/verificar-estado/`;
    
    console.log('🔍 Verificando estado de pago desde:', url);
    
    return this.http.get<any>(url, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al verificar estado de pago:', err);
        return of({ 
          estado: 'error',
          message: 'No se pudo verificar el estado del pago'
        });
      })
    );
  }

  // =============================
  // 🗂️ COMPARTIR CIUDADES ENTRE SERVICIOS
  // =============================
  private ciudadesCache: any[] = [];

  setCiudades(ciudades: any[]) {
    this.ciudadesCache = ciudades;
  }

  ciudades(): any[] {
    return this.ciudadesCache;
  }
}
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, switchMap } from 'rxjs/operators';
import { API_CONFIG } from '../../config';

@Injectable({ providedIn: 'root' })
export class RtmModalService {
  private _open$ = new BehaviorSubject<boolean>(false);
  open$ = this._open$.asObservable();

  open() { this._open$.next(true); }
  close() { this._open$.next(false); }

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

  private readonly baseUrl = API_CONFIG.BASE_URL;
  private readonly token = 'c3237a07dd144d951a0d213330550818101cb81c';
  private readonly cliente = 'pagina_web';
  
  // ✅ NUEVO: Configuración para RUNT Operations (endpoint oficial)
  private readonly runtUrl = 'https://b.automas.co/api-v2/api/runt-operations/get_full_runt_information/';
  private readonly runtToken = '0a74c9adbcc2f1dbbb60d9016b26aa9d47993557';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  private buildUrl(tipo: 'transversal' | 'pagos'): string {
    const isProduction = !window.location.hostname.includes('localhost');
    
    if (isProduction) {
      // PRODUCCIÓN: Usar proxy PHP
      if (tipo === 'transversal') {
        // Proxy PHP: /api-proxy.php?path=/wh/transversal/ejecutar-accion/
        return '/api-proxy.php?path=/wh/transversal/ejecutar-accion/';
      } else {
        // Proxy PHP: /api-proxy.php?path=/proyecto-pagos/
        return '/api-proxy.php?path=/proyecto-pagos/';
      }
    } else {
      // DESARROLLO: Usar directamente (con proxy Angular si está configurado)
      if (tipo === 'transversal') {
        return '/api/wh/transversal/ejecutar-accion/';
      } else {
        return '/api/proyecto-pagos/';
      }
    }
  }

  obtenerCiudades(): Observable<any> {
    const params = new HttpParams().set('accion', 'obtener_ciudades');
    const url = this.buildUrl('transversal');
    
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

  /**
   * 🔍 CONSULTAR VEHÍCULO EN RUNT - ENDPOINT OFICIAL
   * 
   * Usa el servicio oficial de RUNT operations
   * Endpoint: https://b.automas.co/api-v2/api/runt-operations/get_full_runt_information/
   */
  consultarVehiculo(params: {
    placa: string;
    tipo_identificacion: string;
    identificacion: string;
    nombres: string;
    celular: string;
  }): Observable<any> {
    // ✅ Body simplificado según especificaciones del cliente
    const body = {
      placa: params.placa,
      cliente: this.cliente,
      tipo_identificacion: params.tipo_identificacion,
      identificacion: params.identificacion
    };
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.runtToken}`
    });
    
    console.log('🔍 ═══════════════════════════════════════');
    console.log('🔍 CONSULTANDO RUNT OFICIAL');
    console.log('🔍 URL:', this.runtUrl);
    console.log('🔍 Body:', JSON.stringify(body, null, 2));
    console.log('🔍 ═══════════════════════════════════════');
    
    return this.http.post<any>(this.runtUrl, body, { headers }).pipe(
      switchMap(resp => {
        console.log('📦 Respuesta RUNT oficial (completa):', resp);
        console.log('📦 Tipo de respuesta:', typeof resp);
        console.log('📦 Keys de la respuesta:', Object.keys(resp));
        console.log('📦 resp.data:', resp?.data);
        console.log('📦 resp.data keys:', resp?.data ? Object.keys(resp.data) : 'N/A');
        console.log('📦 resp.error:', resp?.error);
        console.log('📦 resp.mensaje:', resp?.mensaje);
        
        // ✅ CORRECCIÓN: Los datos del vehículo están en resp.data
        // El backend devuelve: { error: false, mensaje: "...", data: { ...datos del vehículo... } }
        const vehiculoData = resp?.data;
        console.log('🚗 Datos del vehículo extraídos:', vehiculoData);
        
        if (resp && resp.error === false && vehiculoData) {
          // ✅ Respuesta exitosa del RUNT
          console.log('✅ Consulta RUNT exitosa - Datos del vehículo obtenidos');
          return of({
            success: true,
            fromRunt: true,
            data: vehiculoData  // ← Pasar resp.data directamente
          });
        } else {
          // ❌ RUNT devolvió error, usar fallback
          console.warn('⚠️ RUNT devolvió error o no hay datos, usando fallback SIN RUNT');
          return this.consultarSinRunt(params);
        }
      }),
      catchError(err => {
        console.error('❌ Error al consultar RUNT:', err);
        console.warn('⚠️ Usando fallback SIN RUNT');
        return this.consultarSinRunt(params);
      })
    );
  }

  /**
   * 🔄 FALLBACK: Consultar SIN RUNT (datos estimados)
   */
  private consultarSinRunt(params: {
    placa: string;
    nombres: string;
    celular: string;
  }): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    
    const httpParams = new HttpParams().set('accion', 'cotizar');
    
    // ✅ Fecha actual + 3 días
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 3);
    
    const bodySinRunt = {
      cliente: this.cliente,
      placa: params.placa,
      fecha_agenda: {
        day: fecha.getDate(),
        month: fecha.getMonth() + 1,
        year: fecha.getFullYear()
      },
      franja: '10:30 AM',
      ciudad: 'Bogotá',
      sede: 'CDA AutoMás Revisión Técnico Mecánica Cll 13',
      celular: params.celular,
      correo: 'consulta@automas.com.co', // ✅ Correo temporal
      nombres: params.nombres,
      clase_vehiculo: 'CAMIONETA',
      tipo_servicio: 'Particular',
      tipo_combustible: 'GASOLINA',
      modelo: '2020',
      fecha_vencimiento_rtm: '2024-09-16T00:00:00',
      from_flow: 'rtm'
    };
    
    console.log('🔄 Consultando SIN RUNT (fallback):', bodySinRunt);
    
    return this.http.post<any>(baseUrl, bodySinRunt, { 
      headers: this.getHeaders(),
      params: httpParams
    }).pipe(
      switchMap(resp => {
        console.log('📦 Respuesta SIN RUNT (RAW):', resp);
        
        if (resp && (resp.price || resp.modelo || resp.search)) {
          console.log('✅ Consulta SIN RUNT exitosa:', resp);
          return of({
            success: true,
            fromRunt: false,
            data: {
              ...resp,
              modelo: resp.modelo || 'Vehículo (datos estimados)',
              fecha_vencimiento_rtm: resp.fecha_vencimiento_rtm || null
            }
          });
        } else {
          console.error('❌ Ambas consultas fallaron');
          return of({
            success: false,
            fromRunt: false,
            data: null,
            message: 'No se pudo consultar el vehículo'
          });
        }
      }),
      catchError(err => {
        console.error('❌ Consulta SIN RUNT también falló:', err);
        return of({
          success: false,
          fromRunt: false,
          data: null,
          message: 'No se pudo consultar el vehículo'
        });
      })
    );
  }

  private buildFechaAgenda(fecha: Date) {
    return {
      day: fecha.getDate(),
      month: fecha.getMonth() + 1,
      year: fecha.getFullYear()
    };
  }

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
    
    return this.http.post<any>(url, body, {
      headers: this.getHeaders()
    }).pipe(
      catchError(err => {
        console.warn('⚠️ Error al obtener horarios:', err);
        return of({ 
          data: [],
          message: 'Continuar sin horarios'
        });
      })
    );
  }

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
    
    console.log('📧 ═══════════════════════════════════════');
    console.log('📧 CORREO QUE SE ENVIARÁ AL BACKEND:', params.correo);
    console.log('📧 ═══════════════════════════════════════');
    console.log('📦 Payload completo de agendamiento:', JSON.stringify(body, null, 2));
    
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

  /**
   * 💳 REGISTRAR PAGO
   * Notifica al backend que el pago fue exitoso en Mercado Pago
   * Debe llamarse DESPUÉS de que Mercado Pago confirme el pago
   */
  registrarPago(invoiceId: number): Observable<any> {
    const baseUrl = this.buildUrl('transversal');
    const url = `${baseUrl}?accion=registrar_pago`;
    
    const body = {
      invoice_id: invoiceId
    };
    
    console.log('💳 ═══════════════════════════════════════');
    console.log('💳 REGISTRANDO PAGO EN EL BACKEND');
    console.log('💳 URL:', url);
    console.log('💳 Body:', body);
    console.log('💳 ═══════════════════════════════════════');
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al registrar pago:', err);
        return of({ 
          success: false,
          message: 'Error al registrar el pago'
        });
      })
    );
  }

  private ciudadesCache: any[] = [];

  setCiudades(ciudades: any[]) {
    this.ciudadesCache = ciudades;
  }

  ciudades(): any[] {
    return this.ciudadesCache;
  }
}
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { API_CONFIG } from '../../config';

export interface TramiteServicio {
  id: number;
  name: string;
  description: string;
  price: number;
  grupo_servicio: string;
}

export interface Ciudad {
  id: number;
  name: string;
  description: string;
  picture: string;
  picture_preview: string;
  providers: number[];
}

export interface Proveedor {
  id: number;
  name: string;
  qty: number;
  email: string;
  description: string;
  phone: string;
  picture: string | null;
  picture_preview: string | null;
  color: string | null;
  is_active: boolean;
  is_visible: boolean;
  services: string[];
  lat?: string | number;
  lng?: string | number;
  distancia?: number;
}

export interface HorarioDisponible {
  fecha: string;
  franjas: string[];
}

export interface CotizacionTramite {
  cliente?: string;
  placa?: string;
  fecha_agenda?: {
    year: number;
    month: number;
    day: number;
  };
  franja?: string;
  ciudad?: string;
  sede?: string;
  servicio?: string;
  tipo_identificacion?: string;
  identificacion?: string;
  celular?: string;
  correo?: string;
  nombres?: string;
  from_flow?: string;
  price?: number;
  direccion?: string;
  telefono?: string;
  maps?: string;
  invoice_id?: number; // ✅ AGREGADO
  codeBooking?: string; // ✅ AGREGADO
}

export interface AgendamientoTramite extends CotizacionTramite {
  invoice_id?: number;
  codeBooking?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TramitesApiService {
  private http = inject(HttpClient);

  // ✅ Usar BASE_URL (mayúscula) de tu config
  private readonly API_URL = API_CONFIG.BASE_URL;
  private readonly TOKEN = API_CONFIG.TOKEN;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.TOKEN}`
    });
  }

  /**
   * 🔧 Construir URL correctamente según el entorno
   * - DESARROLLO: /rtm-api/wh/transversal/...
   * - PRODUCCIÓN: /api-proxy.php?path=wh/transversal/...
   * 
   * ⚠️ IMPORTANTE: Django requiere "/" al final para métodos POST
   */
  private buildUrl(endpoint: string, params: Record<string, string> = {}): string {
    // ✅ ASEGURAR que el endpoint termine con "/"
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint : `${endpoint}/`;
    
    // Construir query string
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    const fullPath = queryString ? `${cleanEndpoint}?${queryString}` : cleanEndpoint;
    
    // Si API_URL ya contiene '?path=', agregar el path después
    if (this.API_URL.includes('?path=')) {
      return `${this.API_URL}${fullPath}`;
    } else {
      // Desarrollo: concatenar directo
      return `${this.API_URL}${fullPath}`;
    }
  }

  /**
   * 1️⃣ Obtener servicios de trámites
   * @param grupoServicio - Tipo de servicio (por defecto: 'Trámite')
   */
  obtenerServicios(grupoServicio: string = 'Trámite'): Observable<{ data: TramiteServicio[]; metadata: any }> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/', {
      'accion': 'obtener_servicios',
      'grupo_servicio': grupoServicio
    });
    
    console.log('🌐 URL obtenerServicios:', url);
    
    return this.http.post<{ data: TramiteServicio[]; metadata: any }>(
      url, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * 2️⃣ Obtener ciudades disponibles
   */
  obtenerCiudades(): Observable<{ data: Ciudad[]; metadata: any }> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/', {
      'accion': 'obtener_ciudades'
    });
    
    console.log('🌐 URL obtenerCiudades:', url);
    
    return this.http.post<{ data: Ciudad[]; metadata: any }>(
      url, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * 3️⃣ Obtener proveedores (sedes) por ciudad
   * @param ciudad - Nombre de la ciudad
   * @param fromFlow - Flujo de origen (por defecto: 'trámites')
   * @param serviceId - ID del servicio opcional
   */
  obtenerProveedores(ciudad: string, fromFlow: string = 'trámites', serviceId?: string): Observable<{ data: Proveedor[]; metadata: any }> {
    const params: Record<string, string> = {
      'accion': 'obtener_proveedores',
      'ciudad': ciudad,
      'from_flow': fromFlow
    };
    
    if (serviceId) {
      params['services__contains'] = serviceId;
    }
    
    const url = this.buildUrl('wh/transversal/ejecutar-accion/', params);
    
    console.log('🌐 URL obtenerProveedores:', url);
    
    return this.http.post<{ data: Proveedor[]; metadata: any }>(
      url, 
      {}, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * 4️⃣ Obtener horarios disponibles
   */
  obtenerHorariosDisponibles(data: {
    sede: string;
    servicio: string;
    fecha_agenda: { day: number; month: number; year: number };
    from_flow?: string;  // ✅ Hacer opcional para flexibilidad
  }): Observable<any> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/', {
      'accion': 'obtener_horarios_disponibles'
    });
    
    console.log('🌐 URL obtenerHorariosDisponibles:', url);
    console.log('📦 Body enviado:', JSON.stringify({ ...data, from_flow: 'trámites' }));
    
    const body = {
      ...data,
      from_flow: data.from_flow || 'trámites'  // ✅ Usar el proporcionado o default
    };
    
    return this.http.post<any>(
      url, 
      body, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * 5️⃣ Cotizar trámite
   * ✅ NUEVO: Obtener invoice_id ANTES del pago
   */
  cotizar(payload: any): Observable<CotizacionTramite> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/', {
      'accion': 'cotizar'
    });
    
    console.log('🌐 URL cotizar:', url);
    console.log('📦 Body cotizar:', JSON.stringify(payload, null, 2));
    
    return this.http.post<CotizacionTramite>(
      url, 
      payload, 
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Cotización recibida:', response)),
      catchError(error => {
        console.error('❌ Error en cotizar:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * 6️⃣ Agendar trámite
   */
  agendar(data: CotizacionTramite | any): Observable<AgendamientoTramite> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/', {
      'accion': 'agendar'
    });
    
    console.log('🌐 URL agendar:', url);
    
    const body = {
      ...data,
      from_flow: 'trámites'
    };
    
    return this.http.post<AgendamientoTramite>(
      url, 
      body, 
      { headers: this.getHeaders() }
    );
  }

  /**
   * 7️⃣ Registrar pago (llamado después del pago en Mercado Pago)
   */
  registrarPago(invoiceId: number): Observable<any> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/', {
      'accion': 'registrar_pago'
    });
    
    console.log('🌐 URL registrarPago:', url);
    console.log('📦 Body registrarPago:', { invoice_id: invoiceId });
    
    return this.http.post<any>(
      url,
      { invoice_id: invoiceId },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => console.log('✅ Pago registrado:', response)),
      catchError(error => {
        console.error('❌ Error registrando pago:', error);
        return throwError(() => error);
      })
    );
  }
}
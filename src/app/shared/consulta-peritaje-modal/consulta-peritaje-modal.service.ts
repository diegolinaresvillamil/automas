import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_CONFIG } from '../../config';

@Injectable({
  providedIn: 'root'
})
export class ConsultaPeritajeModalService {
  private http = inject(HttpClient);
  private baseUrl = API_CONFIG.BASE_URL;
  private token = 'c3237a07dd144d951a0d213330550818101cb81c';
  private cliente = 'carroya';

  // Observable para controlar apertura/cierre
  private isOpen$ = new BehaviorSubject<boolean>(false);
  isOpen = this.isOpen$.asObservable();

  // Signals para datos compartidos
  servicios = signal<any[]>([]);
  ciudades = signal<any[]>([]);
  datosIniciales = signal<any>(null);

  constructor() {}

  // =============================
  // Control del modal
  // =============================
  open() {
    console.log('📂 Abriendo consulta-peritaje-modal');
    this.isOpen$.next(true);
  }

  close() {
    console.log('📁 Cerrando consulta-peritaje-modal');
    this.isOpen$.next(false);
  }

  // =============================
  // Gestión de datos
  // =============================
  setServicios(servicios: any[]) {
    console.log('💾 Servicios de peritaje guardados:', servicios);
    this.servicios.set(servicios);
  }

  getServicios() {
    return this.servicios();
  }

  setCiudades(ciudades: any[]) {
    this.ciudades.set(ciudades);
  }

  getCiudades() {
    return this.ciudades();
  }

  setDatosIniciales(datos: any) {
    this.datosIniciales.set(datos);
  }

  getDatosIniciales() {
    return this.datosIniciales();
  }

  // =============================
  // Headers
  // =============================
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.token}`
    });
  }

  // =============================
  // 🌆 OBTENER CIUDADES
  // =============================
  obtenerCiudades(): Observable<any> {
    const queryParams = new HttpParams().set('accion', 'obtener_ciudades');
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;

    console.log('🌆 Obteniendo ciudades disponibles...');

    return this.http.post<any>(url, {}, {
      headers: this.getHeaders(),
      params: queryParams
    });
  }

  // =============================
  // 🏢 OBTENER PROVEEDORES
  // =============================
  obtenerProveedores(ciudadNombre: string, servicioId?: number): Observable<any> {
    let params = new HttpParams()
      .set('accion', 'obtener_proveedores')
      .set('ciudad', ciudadNombre.trim())
      .set('from_flow', 'peritaje');
    
    // 🔥 FILTRAR POR SERVICIO (solo sedes que prestan este servicio)
    if (servicioId) {
      params = params.set('services__contains', servicioId.toString());
    }
    
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;
    
    console.log('🏢 Obteniendo proveedores para:', ciudadNombre, servicioId ? `(servicio: ${servicioId})` : '');
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    });
  }

  // =============================
  // 🕒 OBTENER HORARIOS DISPONIBLES
  // =============================
  obtenerHorariosDisponibles(params: {
    sede: string;
    servicio: string;
    fecha_agenda: { day: number; month: number; year: number };
  }): Observable<any> {
    const body = {
      ...params,
      from_flow: 'peritaje'
    };

    const queryParams = new HttpParams().set('accion', 'obtener_horarios_disponibles');
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;

    console.log('🕒 Obteniendo horarios disponibles...', body);

    return this.http.post<any>(url, body, {
      headers: this.getHeaders(),
      params: queryParams
    }).pipe(
      tap(resp => {
        console.log('📦 Respuesta horarios del API:', resp);
        if (Array.isArray(resp) && resp.length > 0) {
          console.log('📊 Slots disponibles:', resp[0].slots?.length || 0);
        }
      })
    );
  }

  // =============================
  // 📝 AGENDAR
  // =============================
  agendar(params: any): Observable<any> {
    const body = {
      ...params,
      cliente: this.cliente,
      from_flow: 'peritaje'
    };

    const queryParams = new HttpParams().set('accion', 'agendar');
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;

    console.log('📝 Agendando servicio de peritaje...', body);

    return this.http.post<any>(url, body, {
      headers: this.getHeaders(),
      params: queryParams
    });
  }
}
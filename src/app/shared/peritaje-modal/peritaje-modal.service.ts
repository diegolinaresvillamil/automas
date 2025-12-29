import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_CONFIG } from '../../config';

export interface DatosPeritajeIniciales {
  placa: string;
  nombre: string;
  telefono: string;
  docTipo: string;
  documento: string;
  correo?: string;
}

@Injectable({ providedIn: 'root' })
export class PeritajeModalService {
  private http = inject(HttpClient);

  private _open$ = new BehaviorSubject<boolean>(false);
  open$ = this._open$.asObservable();

  // 🆕 Signals para datos iniciales y servicios
  private datosInicialesSignal = signal<DatosPeritajeIniciales | null>(null);
  private datosRuntSignal = signal<any | null>(null);
  serviciosDisponibles = signal<any[]>([]);

  // Config API
  private readonly baseUrl = API_CONFIG.BASE_URL;
  private readonly token = 'c3237a07dd144d951a0d213330550818101cb81c';
  private readonly cliente = 'pagina_web';

  private getHeaders() {
    return new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  open()  { 
    this._open$.next(true); 
  }
  
  close() { 
    this._open$.next(false); 
  }

  // =============================
  // 🆕 GESTIÓN DE DATOS INICIALES
  // =============================
  
  setDatosIniciales(datos: DatosPeritajeIniciales) {
    this.datosInicialesSignal.set(datos);
    console.log('💾 Datos iniciales peritaje guardados:', datos);
  }

  getDatosIniciales(): DatosPeritajeIniciales | null {
    return this.datosInicialesSignal();
  }

  // =============================
  // 🆕 GESTIÓN DE DATOS RUNT
  // =============================
  
  setDatosRunt(datos: any) {
    this.datosRuntSignal.set(datos);
    console.log('💾 Datos RUNT guardados:', datos);
  }

  getDatosRunt(): any | null {
    return this.datosRuntSignal();
  }

  // Propiedad pública para acceso directo (compatible con código existente)
  get _datosRunt() {
    return this.datosRuntSignal();
  }

  // Método datosRunt() para compatibilidad
  datosRunt() {
    return this.datosRuntSignal();
  }

  // =============================
  // 🌎 OBTENER CIUDADES
  // =============================
  
  obtenerCiudades(): Observable<any> {
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/?accion=obtener_ciudades`;
    
    console.log('🏙️ Obteniendo ciudades (Peritaje)...');
    console.log('🌐 URL:', url);
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders()
    });
  }

  // =============================
  // 🚗 CONSULTAR VEHÍCULO EN RUNT (OFICIAL)
  // =============================
  
  consultarVehiculo(params: {
    placa: string;
    tipo_identificacion: string;
    identificacion: string;
  }): Observable<any> {
    const url = 'https://b.automas.co/api-v2/api/runt-operations/get_full_runt_information/';
    
    const body = {
      placa: params.placa.toUpperCase(),
      cliente: 'pagina_web',
      tipo_identificacion: params.tipo_identificacion,
      identificacion: params.identificacion
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': 'Token 0a74c9adbcc2f1dbbb60d9016b26aa9d47993557'
    });

    console.log('🔍 ═══════════════════════════════════════');
    console.log('🔍 CONSULTANDO RUNT OFICIAL (PERITAJE)');
    console.log('🔍 URL:', url);
    console.log('🔍 Body:', body);
    console.log('🔍 ═══════════════════════════════════════');

    return this.http.post<any>(url, body, { headers }).pipe(
      tap(resp => {
        console.log('📦 Respuesta RUNT oficial (peritaje):', resp);
        console.log('📦 resp.data:', resp.data);
        console.log('📦 Marca:', resp.data?.marca);
        console.log('📦 Línea:', resp.data?.linea);
        console.log('📦 Modelo:', resp.data?.modelo);
      })
    );
  }

  // =============================
  // 📋 OBTENER SERVICIOS DISPONIBLES
  // =============================
  
  obtenerServicios(params: {
    grupo_servicio: string;
    servicios_por_placa: boolean;
    placa: string;
    cliente: string;
    tipo_combustible?: string;
    modelo?: string;
    tipo_servicio?: string;
    clase_vehiculo?: string;
  }): Observable<any> {
    // ✅ Construir query string manualmente
    const queryString = [
      `accion=obtener_servicios`,
      `grupo_servicio=${encodeURIComponent(params.grupo_servicio)}`,
      `servicios_por_placa=${params.servicios_por_placa}`,
      `placa=${encodeURIComponent(params.placa)}`,
      `cliente=${encodeURIComponent(params.cliente)}`,
      params.tipo_combustible ? `tipo_combustible=${encodeURIComponent(params.tipo_combustible)}` : '',
      params.modelo ? `modelo=${encodeURIComponent(params.modelo)}` : '',
      params.tipo_servicio ? `tipo_servicio=${encodeURIComponent(params.tipo_servicio)}` : '',
      params.clase_vehiculo ? `clase_vehiculo=${encodeURIComponent(params.clase_vehiculo)}` : ''
    ].filter(Boolean).join('&');

    // ✅ URL completa con ? después de ejecutar-accion/
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/?${queryString}`;

    console.log('🔍 Obteniendo servicios de peritaje:', params);
    console.log('🌐 URL construida:', url);
    
    return this.http.post<any>(url, {}, {
      headers: this.getHeaders()
    });
  }

  // =============================
  // 🏢 OBTENER PROVEEDORES
  // =============================
  
  obtenerProveedores(ciudad: string): Observable<any> {
    const queryString = [
      'accion=obtener_proveedores',
      `ciudad=${encodeURIComponent(ciudad.trim())}`,
      'from_flow=peritaje'
    ].join('&');
    
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/?${queryString}`;
    
    console.log('🏢 Obteniendo proveedores de peritaje para:', ciudad);
    console.log('🌐 URL:', url);
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders()
    });
  }
}
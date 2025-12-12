import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment'; 
import { API_CONFIG } from '../../config';

@Injectable({ providedIn: 'root' })
export class SedesTarifasModalService {
  // ✅ controla si la modal está abierta o cerrada
  private _open = signal(false);
  open$ = toObservable(this._open);

  // ✅ aquí vamos a guardar las ciudades que vienen del popup RTM
  ciudades = signal<any[]>([]);

  // =============================
  // ✅ CONFIG API (igual que RTM)
  // =============================
  private readonly baseUrl = API_CONFIG.BASE_URL;
  private readonly token = 'c3237a07dd144d951a0d213330550818101cb81c';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  // =============================
  // 🌎 OBTENER CIUDADES DESDE API
  // =============================
  obtenerCiudades(): Observable<any> {
    const params = new HttpParams().set('accion', 'obtener_ciudades');
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;
    
    console.log('🏙️ Obteniendo ciudades (Sedes-Tarifas)...');
    
    // 🔥 POST con HttpParams (no null en la URL)
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    });
  }

  // =============================
  // 🏢 OBTENER PROVEEDORES POR CIUDAD
  // =============================
  obtenerProveedores(ciudadNombre: string): Observable<any> {
    const params = new HttpParams()
      .set('accion', 'obtener_proveedores')
      .set('ciudad', ciudadNombre.trim())
      .set('from_flow', 'rtm');
    
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;
    
    console.log('🏢 Obteniendo proveedores (Sedes-Tarifas) para:', ciudadNombre);
    
    // 🔥 POST con HttpParams
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    });
  }

  // =============================
  // 🚗 OBTENER TIPOS DE VEHÍCULO
  // =============================
  obtenerTiposVehiculo(): Observable<any> {
    const params = new HttpParams().set('accion', 'obtener_tipos_vehiculo');
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;
    
    console.log('🚗 Obteniendo tipos de vehículo...');
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: params
    });
  }

  // =============================
  // 💰 CONSULTAR TARIFA
  // =============================
  consultarTarifa(params: {
    sede: string;
    tipo_vehiculo?: string;
    ciudad: string;
  }): Observable<any> {
    const queryParams = new HttpParams()
      .set('accion', 'consultar_tarifa')
      .set('sede', params.sede)
      .set('ciudad', params.ciudad)
      .set('tipo_vehiculo', params.tipo_vehiculo || '');
    
    const url = `${this.baseUrl}wh/transversal/ejecutar-accion/`;
    
    console.log('💰 Consultando tarifa:', params);
    
    return this.http.post<any>(url, {}, { 
      headers: this.getHeaders(),
      params: queryParams
    });
  }

  // =============================
  // 🎛️ MÉTODOS DE CONTROL
  // =============================
  
  // abrir la modal
  // opcionalmente podemos pasar las ciudades ya cargadas
  open(ciudades?: any[]) {
    if (ciudades && ciudades.length) {
      this.ciudades.set(ciudades);
    }
    this._open.set(true);
  }

  // Por si en algún momento quieres setearlas desde otro lado
  setCiudades(ciudades: any[]) {
    this.ciudades.set(ciudades);
  }

  // cerrar la modal
  close() {
    this._open.set(false);
  }
}
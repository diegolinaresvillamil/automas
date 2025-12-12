import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PagosService {
  // =============================
  // ✅ CONFIGURACIÓN API
  // =============================
  private readonly baseUrl = 'https://bv2.automas.co/api-v2';
  private readonly token = '6a306298eb5158f81a37663fefcd13369f99f7aa';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return new HttpHeaders({
      'Authorization': `Token ${this.token}`,
      'Content-Type': 'application/json'
    });
  }

  // =============================
  // 📋 1. OBTENER PROYECTO DE PAGO
  // =============================
  obtenerProyectoPago(codigoProyecto: string = 'pagina_web'): Observable<any> {
    const url = `${this.baseUrl}/api/proyecto-pagos/${codigoProyecto}/`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  // =============================
  // 💳 2. GENERAR LINK DE PAGO
  // =============================
  generarLinkPago(params: {
    proyecto: string;
    medio_pago: string;
    servicio_label: string;
    valor: number;
    sede?: string | null;
    servicio_tipovehiculo?: string | null;
    placa_vehiculo?: string | null;
  }): Observable<any> {
    const url = `${this.baseUrl}/api/pagos/generar-link/`;
    
    const body = {
      proyecto: params.proyecto,
      medio_pago: params.medio_pago,
      servicio_label: params.servicio_label,
      valor: params.valor,
      sede: params.sede || null,
      servicio_tipovehiculo: params.servicio_tipovehiculo || null,
      placa_vehiculo: params.placa_vehiculo || null
    };

    console.log('📤 Generando link de pago:', body);

    return this.http.post<any>(url, body, { headers: this.getHeaders() });
  }

  // =============================
  // 🔍 3. VERIFICAR ESTADO DE PAGO
  // =============================
  verificarEstadoPago(uuidPago: string): Observable<any> {
    const url = `${this.baseUrl}/api/pagos/${uuidPago}/verificar-estado/`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }
}
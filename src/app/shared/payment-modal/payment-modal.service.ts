import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * 💳 TIPOS DE DATOS PARA EL FLUJO DE PAGO
 */
export interface PaymentData {
  // Identificadores únicos
  invoiceId: number | null;
  pagoUuid?: string | null;
  
  // Información del servicio
  servicio: {
    tipo: 'rtm' | 'peritaje' | 'soat' | 'revision_gases' | 'tramites' | 'otro'; // ✅ AGREGADO 'tramites'
    nombre: string;
    descripcion: string;
  };
  
  // Información del cliente
  cliente: {
    nombre: string;
    documento: string;
    tipoDocumento: string;
    telefono: string;
    correo: string;
    placa?: string;
  };
  
  // Información de la sede/cita
  reserva: {
    ciudad: string;
    sede: string;
    direccion?: string;
    fecha: Date;
    horario: string;
    codeBooking?: string; // ✅ AGREGADO para trámites
  };
  
  // Valores monetarios
  valores: {
    valorBase: number;
    descuento: number;
    total: number;
  };
  
  // Metadata adicional
  metadata?: Record<string, any>;
}

export interface CuponDescuento {
  codigo: string;
  descuento: number;
  tipo: 'porcentaje' | 'fijo';
  valido: boolean;
  mensaje: string;
}

/**
 * 💳 SERVICIO CENTRALIZADO PARA GESTIÓN DE PAGOS
 */
@Injectable({ providedIn: 'root' })
export class PaymentModalService {
  // =============================
  // 🎯 ESTADO DEL MODAL
  // =============================
  private _isOpen = signal(false);
  isOpen$ = toObservable(this._isOpen);
  
  // =============================
  // 📦 DATOS DEL PAGO ACTUAL
  // =============================
  private _paymentData = signal<PaymentData | null>(null);
  paymentData$ = toObservable(this._paymentData);
  
  // =============================
  // 🏷️ CUPONES DISPONIBLES
  // =============================
  private cupones: Map<string, CuponDescuento> = new Map([
    ['AUTOMAS10', { codigo: 'AUTOMAS10', descuento: 10, tipo: 'porcentaje', valido: true, mensaje: '10% de descuento' }],
    ['PROMO20', { codigo: 'PROMO20', descuento: 20, tipo: 'porcentaje', valido: true, mensaje: '20% de descuento' }],
    ['BIENVENIDA', { codigo: 'BIENVENIDA', descuento: 15000, tipo: 'fijo', valido: true, mensaje: '$15.000 de descuento' }]
  ]);
  
  // =============================
  // ⚙️ CONFIG API - SEGÚN POSTMAN
  // =============================
  private readonly baseUrl = 'https://bv2.automas.co/api-v2'; // ✅ Incluye /api-v2
  private readonly token = '6a306298eb5158f81a37663fefcd13369f99f7aa';
  
  constructor(private http: HttpClient) {}
  
  private getHeaders() {
    return new HttpHeaders({
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json'
    });
  }
  
  // =============================
  // 🚪 CONTROL DEL MODAL
  // =============================
  
  open(data: PaymentData): void {
    console.log('💳 Abriendo modal de pago con:', data);
    this._paymentData.set(data);
    this._isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }
  
  close(): void {
    console.log('💳 Cerrando modal de pago');
    this._isOpen.set(false);
    this._paymentData.set(null);
    document.body.style.overflow = '';
  }
  
  getCurrentPaymentData(): PaymentData | null {
    return this._paymentData();
  }
  
  // =============================
  // 🏷️ VALIDACIÓN DE CUPONES
  // =============================
  
  validarCupon(codigo: string): CuponDescuento {
    const codigoUpper = codigo.trim().toUpperCase();
    const cupon = this.cupones.get(codigoUpper);
    
    if (!cupon) {
      return {
        codigo: codigoUpper,
        descuento: 0,
        tipo: 'porcentaje',
        valido: false,
        mensaje: '❌ Cupón inválido o expirado'
      };
    }
    
    return { ...cupon, mensaje: `✅ ${cupon.mensaje} aplicado` };
  }
  
  calcularDescuento(cupon: CuponDescuento, valorBase: number): number {
    if (!cupon.valido) return 0;
    
    if (cupon.tipo === 'porcentaje') {
      return Math.round(valorBase * (cupon.descuento / 100));
    } else {
      return Math.min(cupon.descuento, valorBase);
    }
  }
  
  // =============================
  // 🔄 ACTUALIZAR VALORES
  // =============================
  
  actualizarValores(valores: Partial<PaymentData['valores']>): void {
    const current = this._paymentData();
    if (!current) return;
    
    this._paymentData.set({
      ...current,
      valores: {
        ...current.valores,
        ...valores
      }
    });
  }
  
  // =============================
  // 💰 INTEGRACIÓN CON API DE PAGOS
  // =============================
  
  /**
   * 📋 1. OBTENER PROYECTO DE PAGO
   * Endpoint: GET {{baseURL}}/api/proyecto-pagos/pagina_web/
   */
  obtenerProyectoPago(codigoProyecto: string = 'pagina_web'): Observable<any> {
    const url = `${this.baseUrl}/api/proyecto-pagos/${codigoProyecto}/`;
    
    console.log('🔍 Obteniendo proyecto de pago:', url);
    
    return this.http.get<any>(url, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al obtener proyecto de pago:', err);
        return of({ 
          id: 36,
          codigo_proyecto: codigoProyecto,
          medio_de_pago: {
            id: 1,
            nombre: 'Mercado Pago',
            codigo: 'mercadopago',
            activo: true
          },
          nombre_proyecto: 'Pagina Web',
          estado: true,
          medios_de_pago: [1]
        });
      })
    );
  }
  
  /**
   * 💳 2. GENERAR LINK DE PAGO
   * Endpoint: POST {{baseURL}}/api/pagos/generar-link/
   */
  generarLinkPago(payload: {
    proyecto: string;
    medio_pago: string;
    servicio_label: string;
    valor: number;
    placa_vehiculo?: string;
    sede?: string | null;
    servicio_tipovehiculo?: string | null;
    urls: {
      success: string;
      failure: string;
      pending: string;
    };
  }): Observable<{
    pago_id: string;
    preference_id: string;
    payment_link: string;
  }> {
    const url = `${this.baseUrl}/api/pagos/generar-link/`;
    
    // 🔥 CONSTRUIR PAYLOAD SEGÚN EJEMPLO DE RTM
    const body = {
      proyecto: payload.proyecto || 'pagina_web',
      medio_pago: payload.medio_pago || 'mercadopago',
      servicio_label: payload.servicio_label,
      valor: payload.valor,
      placa_vehiculo: payload.placa_vehiculo || 'SIN-PLACA',
      sede: payload.sede !== undefined ? payload.sede : null,
      servicio_tipovehiculo: payload.servicio_tipovehiculo !== undefined ? payload.servicio_tipovehiculo : null,
      urls: payload.urls
    };
    
    console.log('💳 Generando link de pago:', url);
    console.log('💳 Payload:', body);
    console.log('💳 JSON para Postman:', JSON.stringify(body, null, 2));
    
    return this.http.post<any>(url, body, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al generar link de pago:', err);
        console.error('❌ Detalle:', err.error);
        console.error('❌ Status:', err.status);
        throw err;
      })
    );
  }
  
  /**
   * 🔍 3. VERIFICAR ESTADO DE PAGO
   * Endpoint: GET {{baseURL}}/api/pagos/{{uuid_pago}}/verificar-estado/
   */
  verificarEstadoPago(pagoUuid: string): Observable<any> {
    const url = `${this.baseUrl}/api/pagos/${pagoUuid}/verificar-estado/`;
    
    console.log('🔍 Verificando estado de pago:', url);
    
    return this.http.get<any>(url, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(err => {
        console.error('❌ Error al verificar estado:', err);
        return of({ 
          estado: 'error',
          message: 'No se pudo verificar el estado del pago'
        });
      })
    );
  }
  
  // =============================
  // 🔧 HELPERS
  // =============================
  
  mapearTipoVehiculo(tipoServicio: string, subtipo?: string): string {
    const tipo = tipoServicio.toLowerCase();
    
    // ✅ CORRECCIÓN: El API NO acepta sufijos como "_particular"
    if (tipo.includes('liviano')) {
      return 'automovil'; // ✅ Sin sufijos
    }
    
    if (tipo.includes('moto')) return 'motocicleta';
    if (tipo.includes('ciclomotor')) return 'ciclomotor';
    if (tipo.includes('cuadriciclo')) return 'cuadriciclo';
    
    return 'automovil';
  }
  
  /**
   * Genera el label completo del servicio según especificaciones del backend
   * Formato: PLACA, Descripción del servicio, Modelo, Reserva, Sede
   * Ejemplo RTM: "GPS826, Revisión Técnico Mecánica vehículo liviano Particular, Modelo Anterior 2008 particular (Reserva número 080836p3jq), CDA AutoMás Revisión Técnico Mecánica Cll 134"
   * Ejemplo Peritaje: "GPS826, Combo Oro Para Vehículo Livianos, Modelo 2020 (Reserva número 08084oa10h), AutoMás Peritaje 134"
   * Ejemplo Trámites: "GPS826, Preliquidación Trámite Vehicular, (Reserva número 080529abc), Preliquidación Trámites Vehiculares"
   */
  generarLabelServicio(data: PaymentData): string {
    const { cliente, servicio, reserva, metadata } = data;
    
    // Construir partes del label
    const partes: string[] = [];
    
    // 1. Placa (sin espacios extras)
    if (cliente.placa) {
      partes.push(cliente.placa.trim());
    }
    
    // 2. Descripción del servicio
    if (servicio.descripcion) {
      partes.push(servicio.descripcion.trim());
    }
    
    // 3. Modelo + Reserva en UNA SOLA parte
    const modeloReserva: string[] = [];
    if (metadata?.['modelo']) {
      modeloReserva.push(`Modelo ${metadata['modelo']}`);
    }
    // ✅ Usar codeBooking de metadata (RTM/Peritaje) O de reserva (Trámites)
    const codeBooking = metadata?.['codeBooking'] || reserva.codeBooking;
    if (codeBooking) {
      modeloReserva.push(`(Reserva número ${codeBooking})`);
    }
    if (modeloReserva.length > 0) {
      partes.push(modeloReserva.join(' '));
    }
    
    // 4. Sede (al final)
    if (reserva.sede) {
      partes.push(reserva.sede.trim());
    }
    
    // Unir con ", " (coma + espacio)
    const label = partes.join(', ');
    
    console.log('🏷️ Label generado:', label);
    
    return label;
  }
}
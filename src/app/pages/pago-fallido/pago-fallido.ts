import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-pago-fallido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-fallido.html',
  styleUrls: ['./pago-fallido.css']
})
export class PagoFallido implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Datos del intento de pago
  facturaNumero: string = '';
  fechaIntento: Date = new Date();
  motivoRechazo: string = 'Pago rechazado por la pasarela';
  
  // Datos del servicio
  nombreServicio: string = 'Revisión Técnico Mecánica';
  sedeNombre: string = '';
  fechaCita: string = '';
  
  // Valores
  montoIntentado: number = 0;
  
  // Control de redirección
  segundosRestantes: number = 40; // ← Cambiado de 10 a 40 segundos
  private intervalo: any;

  ngOnInit(): void {
    // Obtener parámetros de la URL - Mercado Pago envía diferentes parámetros según el estado
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query params recibidos:', params);
      
      // Mercado Pago puede enviar cualquiera de estos:
      const pagoId = params['payment_id'] ||           // ID del pago
                     params['pago_id'] ||              // Alternativo
                     params['external_reference'] ||   // Referencia externa (nuestro UUID)
                     params['preference_id'] ||        // ID de la preferencia
                     params['merchant_order_id'];      // ID de la orden
      
      this.montoIntentado = parseFloat(params['amount'] || '0');
      
      console.log('❌ Pago fallido - ID:', pagoId);
      console.log('📋 Todos los params:', {
        payment_id: params['payment_id'],
        external_reference: params['external_reference'],
        preference_id: params['preference_id'],
        merchant_order_id: params['merchant_order_id'],
        status: params['status'],
        collection_status: params['collection_status']
      });
      
      // Generar número de referencia
      if (pagoId && pagoId !== 'null') {
        // Si es un UUID largo, tomar solo los primeros 8 caracteres
        const idCorto = pagoId.length > 8 ? pagoId.substring(0, 8) : pagoId;
        this.facturaNumero = `F-${idCorto.toUpperCase()}`;
        
        // ✅ OPCIONAL: Notificar al backend que el pago falló
        // this.notificarPagoFallido(pagoId);
      } else {
        // Fallback: usar timestamp
        this.facturaNumero = `F-${Date.now().toString().substring(0, 8)}`;
      }
    });

    // Cargar datos de la reserva del localStorage
    this.cargarDatosReserva();
    
    // Iniciar contador de redirección
    this.iniciarContador();
  }

  // ✅ MÉTODO OPCIONAL para notificar al backend
  private notificarPagoFallido(pagoId: string): void {
    // Si tienes un endpoint en el backend para registrar pagos fallidos:
    // this.http.post(`${API}/pagos/${pagoId}/marcar-fallido`, {}).subscribe();
    console.log('📝 Registrando pago fallido en el sistema...');
  }

  private cargarDatosReserva(): void {
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva = JSON.parse(reservaStr);
        this.sedeNombre = reserva.sede || '';
        this.fechaCita = reserva.fecha || '';
        this.montoIntentado = reserva.monto || this.montoIntentado;
      }
    } catch (error) {
      console.warn('No se pudieron cargar datos de la reserva');
    }
  }

  private iniciarContador(): void {
    this.intervalo = setInterval(() => {
      this.segundosRestantes--;
      
      if (this.segundosRestantes <= 0) {
        this.volverAlSitio();
      }
    }, 1000);
  }

  volverAlSitio(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    this.router.navigate(['/']);
  }

  intentarNuevamente(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    // Regresar a la página principal para reintentar
    this.router.navigate(['/']);
  }

  contactarSoporte(): void {
    // Abrir WhatsApp con mensaje pre-cargado
    const mensaje = encodeURIComponent(
      `Hola, tuve un problema con mi pago.\nReferencia: ${this.facturaNumero}\nMonto: $${this.montoIntentado}`
    );
    window.open(`https://wa.me/573158365888?text=${mensaje}`, '_blank');
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }
}
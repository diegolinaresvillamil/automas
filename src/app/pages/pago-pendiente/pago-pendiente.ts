import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentModalService } from '../../shared/payment-modal/payment-modal.service';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-pago-pendiente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-pendiente.html',
  styleUrls: ['./pago-pendiente.css']
})
export class PagoPendiente implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentSvc = inject(PaymentModalService);

  // Datos del pago
  pagoUuid: string | null = null;
  facturaNumero: string = '';
  fechaIntento: Date = new Date();
  
  // Datos del servicio
  nombreServicio: string = 'Revisión Técnico Mecánica';
  sedeNombre: string = '';
  fechaCita: string = '';
  
  // Valores
  montoPendiente: number = 0;
  
  // Estado de verificación
  verificando: boolean = false;
  intentosVerificacion: number = 0;
  maxIntentos: number = 10;
  
  // Progreso
  progreso: number = 0;
  mensajeEstado: string = 'Conectando con la pasarela de pago...';
  
  // Control de verificación automática
  private verificacionSub?: Subscription;

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query params recibidos:', params);
      
      // Mercado Pago puede enviar cualquiera de estos:
      this.pagoUuid = params['payment_id'] ||           // ID del pago
                      params['pago_id'] ||              // Alternativo
                      params['external_reference'] ||   // Referencia externa (nuestro UUID)
                      params['preference_id'];          // ID de la preferencia
      
      this.montoPendiente = parseFloat(params['amount'] || '0');
      
      console.log('⏱️ Pago pendiente - ID:', this.pagoUuid);
      
      // Generar número de referencia
      if (this.pagoUuid && this.pagoUuid !== 'null') {
        const idCorto = this.pagoUuid.length > 8 ? this.pagoUuid.substring(0, 8) : this.pagoUuid;
        this.facturaNumero = `P-${idCorto.toUpperCase()}`;
      } else {
        this.facturaNumero = `P-${Date.now().toString().substring(0, 8)}`;
      }
      
      // Iniciar verificación automática
      if (this.pagoUuid && this.pagoUuid !== 'null') {
        this.iniciarVerificacionAutomatica();
      }
    });

    // Cargar datos de la reserva
    this.cargarDatosReserva();
  }

  private cargarDatosReserva(): void {
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva = JSON.parse(reservaStr);
        this.sedeNombre = reserva.sede || '';
        this.fechaCita = reserva.fecha || '';
        this.montoPendiente = reserva.monto || this.montoPendiente;
      }
    } catch (error) {
      console.warn('No se pudieron cargar datos de la reserva');
    }
  }

  private iniciarVerificacionAutomatica(): void {
    // Simular progreso visual
    this.simularProgreso();

    // Verificar estado cada 10 segundos
    this.verificacionSub = interval(10000)
      .pipe(takeWhile(() => this.intentosVerificacion < this.maxIntentos))
      .subscribe(() => {
        this.verificarEstado();
      });
  }

  private simularProgreso(): void {
    interval(500).pipe(
      takeWhile(() => this.progreso < 90)
    ).subscribe(() => {
      this.progreso += Math.random() * 5;
      if (this.progreso > 90) this.progreso = 90;
      
      // Actualizar mensaje según progreso
      if (this.progreso < 30) {
        this.mensajeEstado = 'Conectando con la pasarela de pago...';
      } else if (this.progreso < 60) {
        this.mensajeEstado = 'Verificando transacción con el banco...';
      } else {
        this.mensajeEstado = 'Esperando confirmación final...';
      }
    });
  }

  verificarEstado(): void {
    if (!this.pagoUuid || this.verificando) return;

    this.verificando = true;
    this.intentosVerificacion++;

    console.log(`🔍 Intento de verificación ${this.intentosVerificacion}/${this.maxIntentos}`);

    this.paymentSvc.verificarEstadoPago(this.pagoUuid).subscribe({
      next: (response) => {
        console.log('📊 Estado del pago:', response);
        
        const estado = response?.estado?.toLowerCase();

        if (estado === 'aprobado' || estado === 'approved') {
          // ✅ Pago aprobado
          this.progreso = 100;
          this.mensajeEstado = '¡Pago confirmado!';
          
          setTimeout(() => {
            this.router.navigate(['/pago-exitoso'], {
              queryParams: { pago_id: this.pagoUuid }
            });
          }, 1000);
        } else if (estado === 'rechazado' || estado === 'rejected') {
          // ❌ Pago rechazado
          this.router.navigate(['/pago-fallido'], {
            queryParams: { pago_id: this.pagoUuid }
          });
        } else {
          // ⏱️ Sigue pendiente
          this.verificando = false;
          this.progreso = Math.min(this.progreso + 5, 90);
        }
      },
      error: (err) => {
        console.error('❌ Error al verificar:', err);
        this.verificando = false;
      }
    });
  }

  volverAlSitio(): void {
    this.verificacionSub?.unsubscribe();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.verificacionSub?.unsubscribe();
  }
}
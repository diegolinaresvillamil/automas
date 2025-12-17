import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentModalService } from '../../shared/payment-modal/payment-modal.service';
import { RtmModalService } from '../../shared/rtm-modal/rtm-modal.service';

@Component({
  selector: 'app-pago-exitoso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pago-exitoso.html',
  styleUrls: ['./pago-exitoso.css']
})
export class PagoExitoso implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentSvc = inject(PaymentModalService);
  private rtmSvc = inject(RtmModalService); // ✅ Agregar servicio RTM

  // Datos del pago
  facturaNumero: string = '';
  fechaFactura: Date = new Date();
  fechaVencimiento: Date = new Date();
  codigoReserva: string = ''; // ✅ ID del agendamiento
  
  // Datos del servicio
  nombreServicio: string = 'Revisión Técnico Mecánica';
  sedeNombre: string = '';
  fechaCita: string = '';
  
  // Valores
  precioServicio: number = 0;
  impuesto: number = 0;
  descuentoTotal: number = 0;
  cantidadTotal: number = 0;
  cantidad: number = 1; // ✅ Siempre 1 (un agendamiento)
  
  // Control de redirección
  segundosRestantes: number = 40; // ← Cambiado de 3 a 40 segundos
  private intervalo: any;

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query params recibidos:', params);
      
      // Mercado Pago puede enviar cualquiera de estos:
      const pagoId = params['payment_id'] ||           // ID del pago
                     params['pago_id'] ||              // Alternativo
                     params['external_reference'] ||   // Referencia externa (nuestro UUID)
                     params['collection_id'];          // ID de la colección
      
      console.log('✅ Pago exitoso - ID:', pagoId);
      
      if (pagoId && pagoId !== 'null') {
        this.cargarDatosPago(pagoId);
      } else {
        console.warn('⚠️ No se recibió payment_id, usando datos del localStorage');
      }
    });

    // Cargar datos de la reserva del localStorage
    this.cargarDatosReserva();
    
    // Iniciar contador de redirección
    this.iniciarContador();
  }

  private cargarDatosPago(pagoId: string): void {
    // ✅ USAR DATOS DEL LOCALSTORAGE en lugar del endpoint que da error
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva = JSON.parse(reservaStr);
        
        console.log('📄 Datos de la reserva desde localStorage:', reserva);
        
        // Extraer datos de la reserva
        this.precioServicio = reserva.monto || 0;
        this.impuesto = this.precioServicio * 0.19; // 19% IVA (no se muestra)
        this.cantidadTotal = this.precioServicio;
        this.cantidad = 1; // ✅ Siempre 1 agendamiento
        
        // ✅ Extraer código de reserva (codeBooking)
        this.codigoReserva = reserva.codeBooking || pagoId.substring(0, 10).toUpperCase();
        
        // Generar número de factura basado en el pagoId
        this.facturaNumero = `F-${pagoId.substring(0, 8).toUpperCase()}`;
        this.fechaFactura = new Date();
        
        // Calcular fecha de vencimiento (30 días después)
        this.fechaVencimiento = new Date(this.fechaFactura);
        this.fechaVencimiento.setDate(this.fechaVencimiento.getDate() + 30);
        
        console.log('✅ Datos del pago cargados:', {
          precio: this.precioServicio,
          cantidad: this.cantidad,
          total: this.cantidadTotal,
          codigoReserva: this.codigoReserva
        });

        // ✅ REGISTRAR EL PAGO EN EL BACKEND
        // Extraer invoice_id de la reserva
        const invoiceId = reserva.invoiceId || null;
        if (invoiceId) {
          this.registrarPagoEnBackend(invoiceId);
        } else {
          console.warn('⚠️ No se encontró invoice_id para registrar el pago');
        }
      } else {
        console.warn('⚠️ No hay datos de reserva en localStorage');
        // Valores por defecto si no hay datos
        this.precioServicio = 0;
        this.impuesto = 0;
        this.cantidadTotal = 0;
        this.cantidad = 1;
        this.codigoReserva = pagoId.substring(0, 10).toUpperCase();
      }
    } catch (error) {
      console.error('❌ Error al cargar datos del localStorage:', error);
      this.precioServicio = 0;
      this.impuesto = 0;
      this.cantidadTotal = 0;
      this.cantidad = 1;
      this.codigoReserva = '';
    }
  }

  /**
   * 💳 REGISTRAR PAGO EN EL BACKEND
   * Notifica al backend que el pago fue exitoso
   */
  private registrarPagoEnBackend(invoiceId: number): void {
    console.log('💳 Registrando pago para invoice_id:', invoiceId);
    
    this.rtmSvc.registrarPago(invoiceId).subscribe({
      next: (response) => {
        console.log('✅ Pago registrado exitosamente:', response);
      },
      error: (err) => {
        console.error('❌ Error al registrar pago:', err);
        // No mostramos error al usuario, solo lo logueamos
      }
    });
  }

  private cargarDatosReserva(): void {
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva = JSON.parse(reservaStr);
        this.sedeNombre = reserva.sede || '';
        this.fechaCita = reserva.fecha || '';
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

  imprimirFactura(): void {
    window.print();
  }

  reservarOtraCita(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }
}
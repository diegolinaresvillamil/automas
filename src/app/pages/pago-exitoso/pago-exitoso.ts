import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentModalService } from '../../shared/payment-modal/payment-modal.service';
import { RtmModalService } from '../../shared/rtm-modal/rtm-modal.service';
import { TramitesApiService } from '../../core/services/tramites-api.service';

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
  private rtmSvc = inject(RtmModalService);
  private tramitesApi = inject(TramitesApiService);

  // Datos del pago
  facturaNumero: string = '';
  fechaFactura: Date = new Date();
  fechaVencimiento: Date = new Date();
  codigoReserva: string = '';
  
  // Datos del servicio
  nombreServicio: string = 'Revisión Técnico Mecánica';
  sedeNombre: string = '';
  fechaCita: string = '';
  
  // Valores
  precioServicio: number = 0;
  impuesto: number = 0;
  descuentoTotal: number = 0;
  cantidadTotal: number = 0;
  cantidad: number = 1;
  
  // Control de redirección
  segundosRestantes: number = 40;
  private intervalo: any;

  ngOnInit(): void {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      console.log('📦 Query params recibidos:', params);
      
      const pagoId = params['payment_id'] ||
                     params['pago_id'] ||
                     params['external_reference'] ||
                     params['collection_id'];
      
      console.log('✅ Pago exitoso - ID:', pagoId);
      
      if (pagoId && pagoId !== 'null') {
        this.cargarDatosPago(pagoId);
      } else {
        console.warn('⚠️ No se recibió payment_id, usando datos del localStorage');
      }
    });

    this.cargarDatosReserva();
    this.iniciarContador();
  }

  private cargarDatosPago(pagoId: string): void {
    try {
      const reservaStr = localStorage.getItem('ultima_reserva');
      if (reservaStr) {
        const reserva = JSON.parse(reservaStr);
        
        console.log('📄 Datos de la reserva desde localStorage:', reserva);
        
        // 🔥 DETECTAR TIPO DE SERVICIO
        const tipo = reserva.tipo || 'rtm'; // Por defecto RTM
        
        // Extraer datos comunes
        this.precioServicio = reserva.monto || 0;
        this.cantidadTotal = this.precioServicio;
        this.cantidad = 1;
        this.codigoReserva = reserva.codeBooking || pagoId.substring(0, 10).toUpperCase();
        
        // 🎯 NOMBRE DEL SERVICIO según tipo
        if (tipo === 'peritaje') {
          this.nombreServicio = reserva.nombreServicio || 'Peritaje Vehicular';
        } else if (tipo === 'tramites') {
          this.nombreServicio = reserva.nombreServicio || 'Trámite Vehicular';
        } else {
          this.nombreServicio = reserva.nombreServicio || 'Revisión Técnico Mecánica';
        }
        
        // Generar número de factura
        this.facturaNumero = `F-${pagoId.substring(0, 8).toUpperCase()}`;
        this.fechaFactura = new Date();
        
        // Calcular fecha de vencimiento (30 días)
        this.fechaVencimiento = new Date(this.fechaFactura);
        this.fechaVencimiento.setDate(this.fechaVencimiento.getDate() + 30);
        
        console.log('✅ Datos del pago cargados:', {
          tipo: tipo,
          nombreServicio: this.nombreServicio,
          precio: this.precioServicio,
          cantidad: this.cantidad,
          total: this.cantidadTotal,
          codigoReserva: this.codigoReserva
        });

        // ✅ FLUJO SEGÚN TIPO DE SERVICIO
        if (tipo === 'tramites') {
          console.log('🎯 Flujo TRÁMITES detectado');
          this.procesarTramite(pagoId);
        } else {
          // RTM/Peritaje: registrar pago con invoice_id existente
          const invoiceId = reserva.invoiceId || null;
          if (invoiceId) {
            this.registrarPagoEnBackend(invoiceId);
          } else {
            console.warn('⚠️ No se encontró invoice_id para registrar el pago (RTM/Peritaje)');
          }
        }
      } else {
        console.warn('⚠️ No hay datos de reserva en localStorage');
        this.valoresPorDefecto(pagoId);
      }
    } catch (error) {
      console.error('❌ Error al cargar datos del localStorage:', error);
      this.valoresPorDefecto(pagoId);
    }
  }

  /**
   * ✅ NUEVO: Procesar trámite después del pago
   */
  private procesarTramite(pagoId: string): void {
    try {
      const datosAgendarStr = localStorage.getItem('datos_agendar_tramite');
      
      if (!datosAgendarStr) {
        console.error('❌ No se encontraron datos para agendar el trámite');
        return;
      }

      const datosAgendar = JSON.parse(datosAgendarStr);
      console.log('📋 Datos recuperados para agendar:', datosAgendar);

      // ✅ Mantener campo 'servicio' porque el backend lo requiere
      console.log('📤 Payload completo con servicio:', datosAgendar);

      // Llamar al endpoint /agendar
      this.tramitesApi.agendar(datosAgendar).subscribe({
        next: (response) => {
          console.log('✅ Trámite agendado exitosamente:', response);
          
          // Actualizar código de reserva si viene en la respuesta
          if (response.codeBooking) {
            this.codigoReserva = response.codeBooking;
          }

          // ✅ REGISTRAR PAGO si viene invoice_id
          const invoiceId = response.invoice_id;
          if (invoiceId) {
            console.log('💳 Invoice ID obtenido, registrando pago:', invoiceId);
            this.registrarPagoTramite(invoiceId);
          } else {
            console.warn('⚠️ No se recibió invoice_id del agendamiento');
          }

          // Limpiar localStorage
          localStorage.removeItem('datos_agendar_tramite');
        },
        error: (err) => {
          console.error('❌ Error al agendar trámite:', err);
          console.error('❌ Detalle del error:', err.error);
          
          // Mostrar mensaje al usuario pero no bloquear la página
          alert('El pago se procesó correctamente, pero hubo un error al registrar el agendamiento. Por favor contacta a soporte.');
        }
      });
    } catch (error) {
      console.error('❌ Error al procesar trámite:', error);
    }
  }

  /**
   * ✅ NUEVO: Registrar pago de trámite
   */
  private registrarPagoTramite(invoiceId: number): void {
    console.log('💳 Registrando pago para trámite (invoice_id):', invoiceId);
    
    this.tramitesApi.registrarPago(invoiceId).subscribe({
      next: (response) => {
        console.log('✅ Pago de trámite registrado exitosamente:', response);
      },
      error: (err) => {
        console.error('❌ Error al registrar pago del trámite:', err);
        // No bloquear el flujo, el pago ya se procesó
      }
    });
  }

  private valoresPorDefecto(pagoId: string): void {
    this.precioServicio = 0;
    this.impuesto = 0;
    this.cantidadTotal = 0;
    this.cantidad = 1;
    this.codigoReserva = pagoId.substring(0, 10).toUpperCase();
    this.nombreServicio = 'Servicio';
  }

  private registrarPagoEnBackend(invoiceId: number): void {
    console.log('💳 Registrando pago para invoice_id:', invoiceId);
    
    this.rtmSvc.registrarPago(invoiceId).subscribe({
      next: (response) => {
        console.log('✅ Pago registrado exitosamente:', response);
      },
      error: (err) => {
        console.error('❌ Error al registrar pago:', err);
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
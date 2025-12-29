import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaymentModalService, PaymentData, CuponDescuento } from './payment-modal.service';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-modal.html',
  styleUrls: ['./payment-modal.css']
})
export class PaymentModalComponent implements OnInit, OnDestroy {
  // =============================
  // 🔧 INYECCIONES
  // =============================
  private paymentSvc = inject(PaymentModalService);
  
  // =============================
  // 🔹 ESTADO DEL COMPONENTE
  // =============================
  open = signal(false);
  paymentData = signal<PaymentData | null>(null);
  step = 3; // Siempre en step 3 para compatibilidad con tu HTML
  
  private openSub?: Subscription;
  private dataSub?: Subscription;
  
  // =============================
  // 💳 DATOS DE PAGO (Para tu HTML existente)
  // =============================
  medioPagoSeleccionado: 'mercado-pago' | null = null;
  aceptaCondicionesPago = false;
  isProcessingPayment = false;
  
  // =============================
  // 🏷️ CUPONES 
  // =============================
  codigoCupon = '';
  cuponAplicado: CuponDescuento | null = null;
  mensajeCupon = '';
  cuponValido = false;
  
  // =============================
  // 📊 VALORES CALCULADOS (Para tu HTML existente)
  // =============================
  get valorEstimado(): number {
    return this.paymentData()?.valores.valorBase || 0;
  }
  
  get descuentoAplicado(): number {
    return this.paymentData()?.valores.descuento || 0;
  }
  
  get totalAPagar(): number {
    return this.paymentData()?.valores.total || 0;
  }
  
  get fechaTransaccion(): Date {
    return new Date();
  }
  
  // =============================
  // 📅 DATOS DE RESERVA (Para tu HTML existente)
  // =============================
  get sedeSeleccionada() {
    const data = this.paymentData();
    return data ? { nombre: data.reserva.sede } : null;
  }
  
  get fechaSeleccionada(): Date | null {
    return this.paymentData()?.reserva.fecha || null;
  }
  
  get franjaSeleccionada(): string | null {
    return this.paymentData()?.reserva.horario || null;
  }
  
  // =============================
  // 📋 DATOS DEL FORMULARIO 
  // =============================
  get agendaForm() {
    const data = this.paymentData();
    return {
      get: (field: string) => {
        if (!data) return { value: '' };
        switch (field) {
          case 'nombre': return { value: data.cliente.nombre };
          case 'placa': return { value: data.cliente.placa || 'N/A' };
          case 'telefono': return { value: data.cliente.telefono };
          case 'correo': return { value: data.cliente.correo };
          default: return { value: '' };
        }
      }
    };
  }
  
  // =============================
  // ⚙️ CICLO DE VIDA
  // =============================
  ngOnInit(): void {
    this.openSub = this.paymentSvc.isOpen$.subscribe(isOpen => {
      this.open.set(isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
      
      if (isOpen) {
        // ✅ AUTO-SELECCIONAR MERCADO PAGO al abrir
        this.medioPagoSeleccionado = 'mercado-pago';
        console.log('✅ Mercado Pago pre-seleccionado automáticamente');
      } else {
        this.resetState();
      }
    });
    
    this.dataSub = this.paymentSvc.paymentData$.subscribe(data => {
      this.paymentData.set(data);
      
      if (data) {
        console.log('💳 Datos de pago recibidos:', data);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.openSub?.unsubscribe();
    this.dataSub?.unsubscribe();
    document.body.style.overflow = '';
  }
  
  // =============================
  // 🎛️ ACCIONES
  // =============================
  
  cerrar(): void {
    if (this.isProcessingPayment) {
      const confirmacion = confirm('¿Estás seguro de cancelar el pago en proceso?');
      if (!confirmacion) return;
    }
    
    this.paymentSvc.close();
  }
  
  volver(): void {
    this.cerrar();
  }
  
  // =============================
  // 🏷️ GESTIÓN DE CUPONES
  // =============================
  
  aplicarCupon(): void {
    const codigo = this.codigoCupon.trim();
    
    if (!codigo) {
      this.mensajeCupon = '⚠️ Ingresa un código de cupón';
      this.cuponAplicado = null;
      this.cuponValido = false;
      return;
    }
    
    const cupon = this.paymentSvc.validarCupon(codigo);
    const data = this.paymentData();
    
    if (!data) return;
    
    if (cupon.valido) {
      const descuento = this.paymentSvc.calcularDescuento(cupon, data.valores.valorBase);
      const nuevoTotal = data.valores.valorBase - descuento;
      
      this.paymentSvc.actualizarValores({
        descuento: descuento,
        total: nuevoTotal
      });
      
      this.cuponAplicado = cupon;
      this.mensajeCupon = cupon.mensaje;
      this.cuponValido = true;
      
      console.log('✅ Cupón aplicado:', {
        codigo: cupon.codigo,
        descuento: descuento,
        nuevoTotal: nuevoTotal
      });
    } else {
      this.cuponAplicado = null;
      this.mensajeCupon = cupon.mensaje;
      this.cuponValido = false;
      
      this.paymentSvc.actualizarValores({
        descuento: 0,
        total: data.valores.valorBase
      });
    }
  }
  
  // =============================
  // 💳 SELECCIÓN DE MEDIO DE PAGO
  // =============================
  
  seleccionarMedioPago(medio: 'mercado-pago'): void {
    this.medioPagoSeleccionado = medio;
    console.log('💳 Medio de pago seleccionado:', medio);
  }
  
  // =============================
  // 🚀 PROCESAR PAGO
  // =============================
  
  async procesarPago(): Promise<void> {
    if (!this.aceptaCondicionesPago) {
      alert('⚠️ Debes aceptar las condiciones del servicio para continuar');
      return;
    }
    
    if (!this.medioPagoSeleccionado) {
      alert('⚠️ Selecciona un método de pago');
      return;
    }
    
    const data = this.paymentData();
    if (!data) {
      alert('❌ Error: No hay datos de pago disponibles');
      return;
    }
    
    this.isProcessingPayment = true;
    
    try {
      console.log('💳 Iniciando proceso de pago...');
      console.log('📦 Datos completos:', data);
      
      // ✅ SEGÚN RTM: Enviar urls obligatorias
      const baseUrl = window.location.origin;
      
      const payload = {
        proyecto: 'pagina_web',
        medio_pago: 'mercadopago',
        servicio_label: this.paymentSvc.generarLabelServicio(data),
        valor: this.totalAPagar,
        placa_vehiculo: data.cliente.placa || 'SIN-PLACA',
        sede: null,
        servicio_tipovehiculo: null,
        urls: {
          success: `${baseUrl}/pago-exitoso`,
          failure: `${baseUrl}/pago-fallido`,
          pending: `${baseUrl}/pago-pendiente`
        }
      };
      
      console.log('📤 Enviando payload:', payload);
      console.log('📤 JSON para Postman:', JSON.stringify(payload, null, 2));
      
      this.paymentSvc.generarLinkPago(payload).subscribe({
        next: (response) => {
          console.log('✅ Link de pago generado:', response);
          
          const { pago_id, payment_link } = response;
          
          // 💾 GUARDAR DATOS EN LOCALSTORAGE ANTES DE REDIRIGIR
          const datosParaExito = {
            tipo: data.servicio.tipo, // ✅ 'rtm', 'peritaje', 'tramites', o 'otro'
            sede: data.reserva.sede,
            fecha: `${data.reserva.fecha.toLocaleDateString()} - ${data.reserva.horario}`,
            monto: data.valores.total,
            placa: data.cliente.placa,
            nombre: data.cliente.nombre,
            codeBooking: data.metadata?.['codeBooking'] || data.reserva.codeBooking || '', // ✅ Priorizar metadata
            invoiceId: data.invoiceId || null, // ✅ FIXED: Incluir invoiceId (null para trámites)
            nombreServicio: data.servicio.nombre,
            ciudad: data.reserva.ciudad
          };
          
          localStorage.setItem('ultima_reserva', JSON.stringify(datosParaExito));
          console.log('💾 Datos guardados en localStorage (ultima_reserva):', datosParaExito);
          
          if (payment_link) {
            // ✅ CASO 1: Link disponible inmediatamente
            if (data) {
              data.pagoUuid = pago_id;
            }
            
            console.log('🔗 Redirigiendo a:', payment_link);
            window.location.href = payment_link;
          } else if (pago_id) {
            // 🔄 CASO 2: Link no disponible, consultar estado
            console.log('⏳ Link no disponible, consultando estado del pago...');
            
            this.paymentSvc.verificarEstadoPago(pago_id).subscribe({
              next: (estadoPago) => {
                console.log('📦 Estado del pago:', estadoPago);
                
                const initPoint = estadoPago.detalles_gateway?.init_point;
                
                if (initPoint) {
                  console.log('✅ Link obtenido desde detalles_gateway:', initPoint);
                  window.location.href = initPoint;
                } else {
                  throw new Error('No se pudo obtener el link de pago del gateway');
                }
              },
              error: (err) => {
                console.error('❌ Error al verificar estado:', err);
                this.isProcessingPayment = false;
                alert('❌ No se pudo obtener el link de pago. Por favor intenta nuevamente.');
              }
            });
          } else {
            throw new Error('No se recibió ni payment_link ni pago_id');
          }
        },
        error: (error) => {
          console.error('❌ Error al generar link de pago:', error);
          console.error('❌ Detalle completo:', error.error);
          this.isProcessingPayment = false;
          
          // Mensaje más específico del error
          const errorMsg = error.error?.detail || error.error?.message || 'Error desconocido';
          alert(`❌ Error al procesar el pago: ${errorMsg}`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error inesperado:', error);
      this.isProcessingPayment = false;
      
      alert('❌ Ocurrió un error inesperado. Por favor intenta nuevamente.');
    }
  }
  
  // =============================
  // 🔧 HELPERS
  // =============================
  
  private resetState(): void {
    this.medioPagoSeleccionado = null;
    this.aceptaCondicionesPago = false;
    this.isProcessingPayment = false;
    this.codigoCupon = '';
    this.cuponAplicado = null;
    this.mensajeCupon = '';
    this.cuponValido = false;
  }
}
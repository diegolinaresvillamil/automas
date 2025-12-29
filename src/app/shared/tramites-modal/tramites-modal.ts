import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TramitesModalService } from './tramites-modal.service';
import { TramitesApiService, Ciudad, Proveedor, CotizacionTramite } from '../../core/services/tramites-api.service';
import { PaymentModalService, PaymentData } from '../payment-modal/payment-modal.service';

@Component({
  selector: 'app-tramites-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tramites-modal.html',
  styleUrls: ['./tramites-modal.css'],
})
export class TramitesModalComponent implements OnInit, OnDestroy {
  private modalSvc = inject(TramitesModalService);
  private tramitesApi = inject(TramitesApiService);
  private paymentModalSvc = inject(PaymentModalService);
  private cdr = inject(ChangeDetectorRef);

  @Output() cerrar = new EventEmitter<void>();

  sub?: Subscription;
  open: boolean = false;
  mostrarError = false;
  step = 1;
  loading = false;
  errorMessage = '';

  tramiteSeleccionado: any = null;
  servicios: any = null;
  
  ciudades: Ciudad[] = [];
  ciudadSeleccionada: Ciudad | null = null;
  proveedores: Proveedor[] = [];
  proveedorSeleccionado: Proveedor | null = null;
  fechaSeleccionada: string = '';
  franjas: string[] = [];
  franjaSeleccionada: string = '';

  formData = {
    tipo_identificacion: 'Cedula de Ciudadania',
    identificacion: '',
    nombres: '',
    celular: '',
    correo: '',
    placa: '',
    tipo_identificacion_comprador: '',
    identificacion_comprador: ''
  };

  cotizacion: CotizacionTramite | null = null;
  agendamiento: any = null;
  
  readonly PRECIO_PRELIQUIDACION = 80000;

  tramites = [
    { title: 'Matrícula/Registro', icon: 'assets/matricula.svg' },
    { title: 'Traspaso', icon: 'assets/traspaso.svg' },
    { title: 'Traslado Matrícula', icon: 'assets/traslado.svg' },
    { title: 'Radicado y Matrícula', icon: 'assets/radicado.svg' },
    { title: 'Cambio de color', icon: 'assets/color.svg' },
    { title: 'Regrabar Chasis', icon: 'assets/chasis.svg' },
    { title: 'Regrabación de Motor', icon: 'assets/motor.svg' },
    { title: 'Cambio de servicio', icon: 'assets/servicio.svg' },
    { title: 'Transformación', icon: 'assets/transformacion.svg' },
    { title: 'Duplicado', icon: 'assets/duplicado.svg' },
    { title: 'Levantamiento Prenda', icon: 'assets/prenda.svg' },
    { title: 'Cancelación de Matrícula', icon: 'assets/cancelacion.svg' },
  ];

  ngOnInit(): void {
    console.log('🟢 TramitesModalComponent inicializado');
    
    this.sub = this.modalSvc.open$.subscribe((isOpen) => {
      console.log('🔔 ===== CAMBIO DE ESTADO DEL MODAL =====');
      console.log('🔔 isOpen recibido:', isOpen);
      console.log('🔔 open anterior:', this.open);
      
      this.open = isOpen;
      console.log('🔔 open nuevo:', this.open);
      
      this.cdr.detectChanges();
      console.log('✅ Change detection forzada');
      
      document.body.style.overflow = isOpen ? 'hidden' : '';
      
      if (isOpen) {
        console.log('✅ Modal abierto - iniciando carga');
        this.resetearEstado();
        this.cargarDatosIniciales();
      }
      
      console.log('🔔 ======================================');
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    document.body.style.overflow = '';
  }

  resetearEstado(): void {
    this.step = 1;
    this.tramiteSeleccionado = null;
    this.mostrarError = false;
    this.errorMessage = '';
    this.loading = false;
    
    this.ciudadSeleccionada = null;
    this.proveedorSeleccionado = null;
    this.fechaSeleccionada = '';
    this.franjaSeleccionada = '';
    this.franjas = [];
    
    this.formData = {
      tipo_identificacion: 'Cedula de Ciudadania',
      identificacion: '',
      nombres: '',
      celular: '',
      correo: '',
      placa: '',
      tipo_identificacion_comprador: '',
      identificacion_comprador: ''
    };
    
    this.cotizacion = null;
    this.agendamiento = null;
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    
    this.tramitesApi.obtenerCiudades().subscribe({
      next: (response) => {
        this.ciudades = response.data;
        console.log('✅ Ciudades cargadas:', this.ciudades.length);

        const ciudadTramites = this.ciudades.find(c => 
          c.name.toLowerCase().includes('trámites') ||
          c.name.toLowerCase().includes('tramites')
        );

        if (ciudadTramites) {
          console.log('✅ Ciudad seleccionada:', ciudadTramites.name);
          this.ciudadSeleccionada = ciudadTramites;
          
          // 🔥 HARDCODED: Forzar proveedor ID 80 manualmente
          console.log('🔥 FORZANDO proveedor ID 80 (hardcoded - API no funciona en producción)');
          
          const proveedorHardcoded = {
            id: 80,
            name: 'Preliquidación Trámites Vehiculares',
            qty: 1,
            email: '',
            description: '',
            phone: '',
            picture: null,
            picture_preview: null,
            color: null,
            is_active: true,
            is_visible: true,
            services: ['85', '86', '87', '88', '89']
          };
          
          this.proveedores = [proveedorHardcoded];
          this.proveedorSeleccionado = proveedorHardcoded;
          
          console.log('✅ Proveedor seleccionado (HARDCODED):', this.proveedorSeleccionado.name);
          
          // Cargar horarios directamente
          this.cargarHorarios();
          
        } else {
          console.error('❌ No se encontró ciudad "Trámites Vehiculares"');
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('❌ Error cargando ciudades:', err);
        this.loading = false;
      }
    });
  }

  cargarProveedores(serviceId?: string): void {
    if (!this.ciudadSeleccionada) return;
    
    console.log('📍 Cargando proveedores para:', this.ciudadSeleccionada.name);
    console.log('📍 Con serviceId:', serviceId);
    
    this.tramitesApi.obtenerProveedores(this.ciudadSeleccionada.name, 'trámites', serviceId).subscribe({
      next: (response) => {
        this.proveedores = response.data || [];
        console.log('✅ Proveedores cargados:', this.proveedores.length);
        console.log('✅ Proveedores disponibles:', this.proveedores.map(p => p.name));

        const sedeTramites = this.proveedores.find(p => 
          p.name.toLowerCase().includes('trámites') ||
          p.name.toLowerCase().includes('tramites') ||
          p.name.toLowerCase().includes('cll 13') ||
          p.name.toLowerCase().includes('fontibón') ||
          p.name.toLowerCase().includes('fontibon')
        );

        if (sedeTramites) {
          this.proveedorSeleccionado = sedeTramites;
          console.log('✅ Sede pre-seleccionada:', this.proveedorSeleccionado.name);
        } else if (this.proveedores.length > 0) {
          this.proveedorSeleccionado = this.proveedores[0];
          console.log('⚠️ Usando primer proveedor:', this.proveedorSeleccionado.name);
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando proveedores:', err);
        this.loading = false;
      }
    });
  }

  cargarHorarios(): void {
    if (!this.proveedorSeleccionado || !this.fechaSeleccionada || !this.tramiteSeleccionado) {
      console.warn('⚠️ Faltan datos para cargar horarios');
      return;
    }
    
    const [year, month, day] = this.fechaSeleccionada.split('-').map(Number);
    
    this.loading = true;
    this.franjas = [];
    this.franjaSeleccionada = '';

    const servicioMapeado = this.mapearNombreServicio(this.tramiteSeleccionado.title);
    
    console.log('📅 Cargando horarios para:');
    console.log('  - Sede:', this.proveedorSeleccionado.name);
    console.log('  - Servicio original:', this.tramiteSeleccionado.title);
    console.log('  - Servicio mapeado:', servicioMapeado);
    console.log('  - Fecha:', { day, month, year });

    this.tramitesApi.obtenerHorariosDisponibles({
      sede: this.proveedorSeleccionado.name,
      servicio: servicioMapeado,
      fecha_agenda: { day, month, year },
      from_flow: 'trámites'
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta horarios:', response);
        
        let franjasRaw: any[] = [];
        
        if (Array.isArray(response) && response.length > 0 && response[0].slots) {
          franjasRaw = response[0].slots;
        }
        else if (response && response.franjas && Array.isArray(response.franjas)) {
          franjasRaw = response.franjas;
        }
        else if (Array.isArray(response)) {
          franjasRaw = response;
        }
        else if (response && Array.isArray(response.slots)) {
          franjasRaw = response.slots;
        }
        else if (response && response.data && Array.isArray(response.data)) {
          franjasRaw = response.data;
        }

        this.franjas = franjasRaw.map((slot: any) => {
          if (typeof slot === 'object' && slot !== null) {
            return slot.time || slot.slot || slot.hora || slot.franja || slot.id || JSON.stringify(slot);
          }
          else if (typeof slot === 'string') {
            return slot;
          }
          else {
            return String(slot);
          }
        });

        this.loading = false;
        console.log('✅ Horarios parseados:', this.franjas);
      },
      error: (err) => {
        console.error('❌ Error cargando horarios:', err);
        
        let errorMsg = 'Error al cargar los horarios';
        
        if (err.error && typeof err.error === 'object') {
          if (err.error.message) {
            errorMsg = err.error.message;
          } else if (err.error.error) {
            errorMsg = err.error.error;
          }
        } else if (err.error && typeof err.error === 'string') {
          errorMsg = err.error;
        }
        
        console.error('📛 Mensaje del servidor:', errorMsg);
        
        this.errorMessage = `No se pudieron cargar horarios: ${errorMsg}`;
        this.franjas = [];
        this.loading = false;
      }
    });
  }

  seleccionarTramite(tramite: any): void {
    this.tramiteSeleccionado = tramite;
    this.mostrarError = false;
    console.log('✅ Trámite seleccionado:', tramite.title);
  }

  continuarAStep2(): void {
    if (!this.tramiteSeleccionado) {
      this.mostrarError = true;
      return;
    }

    this.mostrarError = false;
    this.step = 2;
  }

  onFechaChange(): void {
    this.franjaSeleccionada = '';
    this.cargarHorarios();
  }

  onHorarioChange(): void {
    console.log('✅ Horario seleccionado:', this.franjaSeleccionada);
  }

  continuarAStep3(): void {
    if (!this.fechaSeleccionada || !this.franjaSeleccionada) {
      this.errorMessage = 'Por favor selecciona fecha y horario';
      return;
    }

    this.errorMessage = '';
    this.step = 3;
  }

  private mapearNombreServicio(titulo: string): string {
    // ✅ Nombres EXACTOS del backend (incluyen dos espacios después de "Tramite")
    const mapeo: { [key: string]: string } = {
      'Matrícula/Registro': 'Tramite  Preliquidación Radicado Matrícula/Registro',
      'Traspaso': 'Tramite  Preliquidación Traspaso de vehículo',
      'Traslado Matrícula': 'Tramite Traslado y Radicación de Cuenta.',
      'Radicado y Matrícula': 'Tramite  Preliquidación Radicado Matrícula/Registro',
      'Cambio de color': 'Tramite  Preliquidación Cambio de color ',
      'Regrabar Chasis': 'Tramite Regrabar Chasis',
      'Regrabación de Motor': 'Tramite  Preliquidación Regrabación Motor ',
      'Cambio de servicio': 'Tramite  Preliquidación Cambio de Servicio',
      'Transformación': 'Tramite  Preliquidación Cambio de Carrocería',
      'Duplicado': 'Tramite  Preliquidación Duplicado de Placas',
      'Levantamiento Prenda': 'Tramite Preliquidación Levantamiento de Prenda',
      'Cancelación de Matrícula': 'Tramite  Preliquidación Cancelación de Matricula ',
    };

    return mapeo[titulo] || titulo;
  }

  confirmarAgendamiento(): void {
    // Validaciones
    if (!this.formData.identificacion || !this.formData.nombres || 
        !this.formData.celular || !this.formData.correo || !this.formData.placa) {
      this.errorMessage = 'Por favor completa todos los campos del vendedor';
      return;
    }

    if (!this.formData.tipo_identificacion_comprador || !this.formData.identificacion_comprador) {
      this.errorMessage = 'Por favor completa los datos del comprador';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.correo)) {
      this.errorMessage = 'Por favor ingresa un correo válido';
      return;
    }

    if (this.formData.celular.length !== 10) {
      this.errorMessage = 'El celular debe tener 10 dígitos';
      return;
    }

    // ✅ Abrir modal de pago DIRECTO (sin cotizar)
    this.abrirModalPagoDirecto();
  }

  abrirModalPagoDirecto(): void {
    if (!this.ciudadSeleccionada || !this.proveedorSeleccionado || !this.tramiteSeleccionado) {
      this.errorMessage = 'Faltan datos para procesar el pago';
      return;
    }

    // ✅ FIX: Parsear fecha correctamente sin problemas de timezone
    const fechaObj = this.parseFechaLocal(this.fechaSeleccionada);
    const servicioLabel = this.generarServiceLabel();

    console.log('💳 Abriendo modal de pago DIRECTO (sin invoice_id previo)');
    console.log('📋 Service label:', servicioLabel);

    // ✅ GUARDAR datos para agendar DESPUÉS del pago
    const datosParaAgendar = {
      tipo: 'tramites', // ✅ Identificador para pago-exitoso
      cliente: 'pagina_web',
      placa: this.formData.placa,
      fecha_agenda: this.parseFecha(this.fechaSeleccionada),
      franja: this.franjaSeleccionada,
      ciudad: this.ciudadSeleccionada.name.trim(),
      sede: this.proveedorSeleccionado.name.trim(),
      servicio: this.mapearNombreServicio(this.tramiteSeleccionado.title),
      celular: this.formData.celular,
      correo: this.formData.correo,
      nombres: this.formData.nombres,
      from_flow: 'trámites',
      
      // Datos del vendedor
      tipo_identificacion: this.formData.tipo_identificacion,
      identificacion: this.formData.identificacion,
      
      // Datos del comprador
      tipo_identificacion_comprador: this.formData.tipo_identificacion_comprador,
      identificacion_comprador: this.formData.identificacion_comprador,
      
      // Sin RUNT
      clase_vehiculo: 'N/A',
      tipo_servicio: 'Trámite',
      tipo_combustible: 'N/A',
      modelo: 'N/A',
      
      // Para mostrar en pago-exitoso
      nombreServicio: `Trámite ${this.tramiteSeleccionado.title}`,
      monto: this.PRECIO_PRELIQUIDACION
    };

    localStorage.setItem('datos_agendar_tramite', JSON.stringify(datosParaAgendar));
    console.log('💾 Datos guardados para agendar después del pago');

    const paymentData: PaymentData = {
      invoiceId: null, // ✅ No hay invoice_id previo en trámites
      pagoUuid: null,

      servicio: {
        tipo: 'tramites', // ✅ FIX: Cambiar de 'otro' a 'tramites'
        nombre: 'Preliquidación Trámite Vehicular',
        descripcion: servicioLabel
      },

      cliente: {
        nombre: this.formData.nombres,
        documento: this.formData.identificacion,
        tipoDocumento: this.formData.tipo_identificacion,
        telefono: this.formData.celular,
        correo: this.formData.correo,
        placa: this.formData.placa
      },

      reserva: {
        ciudad: this.ciudadSeleccionada.name.trim(),
        sede: this.proveedorSeleccionado.name.trim(),
        direccion: this.proveedorSeleccionado.description || '',
        fecha: fechaObj,
        horario: this.franjaSeleccionada
      },

      valores: {
        valorBase: this.PRECIO_PRELIQUIDACION,
        descuento: 0,
        total: this.PRECIO_PRELIQUIDACION
      },

      metadata: {
        tipo_tramite: this.tramiteSeleccionado.title,
        comprador: {
          tipo_identificacion: this.formData.tipo_identificacion_comprador,
          identificacion: this.formData.identificacion_comprador
        }
      }
    };

    this.paymentModalSvc.open(paymentData);
    
    setTimeout(() => {
      this.cerrarModal();
    }, 300);
  }

  private generarServiceLabel(): string {
    // Formato: GPS826, Trámite Matrícula/Registro, Preliquidación Trámites Vehiculares
    return `${this.formData.placa}, ${this.tramiteSeleccionado.title}, ${this.proveedorSeleccionado!.name.trim()}`;
  }

  volverStep(): void {
    if (this.step > 1) {
      this.step--;
      this.errorMessage = '';
    }
  }

  cerrarModal(): void {
    this.resetearEstado();
    this.cerrar.emit();
    this.modalSvc.cerrar();
  }

  get fechaMinima(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  parseFecha(fechaString: string): { year: number; month: number; day: number } {
    const [year, month, day] = fechaString.split('-').map(Number);
    return { year, month, day };
  }

  /**
   * ✅ Parsear fecha sin problemas de timezone
   * Convierte "2025-12-30" → Date(2025, 11, 30) en hora local
   */
  parseFechaLocal(fechaString: string): Date {
    const [year, month, day] = fechaString.split('-').map(Number);
    // month - 1 porque los meses en JS van de 0-11
    return new Date(year, month - 1, day);
  }

  verCondiciones(): void {
    console.log('📋 Ver condiciones del trámite');
  }
}
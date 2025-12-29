import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ConsultaPeritajeModalService } from './consulta-peritaje-modal.service';
import { PeritajeModalService } from '../peritaje-modal/peritaje-modal.service';
import { PagosService } from '../../../services/pagos.service';
import { PaymentModalService, PaymentData } from '../payment-modal/payment-modal.service';
import { FormsModule } from '@angular/forms';

interface SedeUi {
  id?: number;
  nombre: string;
  name?: string;
  direccion?: string;
  address?: string;
  horario?: string;
  description?: string;
  lat?: string;
  lng?: string;
  lon?: string;
  distancia?: number;
}

@Component({
  selector: 'app-consulta-peritaje-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './consulta-peritaje-modal.html',
  styleUrls: ['./consulta-peritaje-modal.css']
})
export class ConsultaPeritajeModalComponent implements OnInit, OnDestroy {
  private modal = inject(ConsultaPeritajeModalService);
  private peritajeSvc = inject(PeritajeModalService);
  private pagosService = inject(PagosService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  private paymentModalService = inject(PaymentModalService);

  open = signal(false);
  sub?: Subscription;

  // Estados
  step = 0;
  loadingUbicacion = false;
  loadingSedes = signal(false);
  loadingHorarios = false;
  loadingCiudades = false;
  isAgendando = false;

  // Ubicación
  ubicacionActivada = false;
  ciudadDetectada: string | null = null;
  userLat: number | null = null;
  userLon: number | null = null;

  // Ciudades y sedes
  ciudades = signal<any[]>([]);
  selectedCiudadId = signal<number | null>(null);
  sedes = signal<SedeUi[]>([]);
  sedeSeleccionada: SedeUi | null = null;
  mapaUrl: SafeResourceUrl | null = null;

  // Servicio seleccionado
  servicioSeleccionado = signal<any>(null);
  descripcionServicioSeleccionado = '';
  valorEstimado = 0;
  mostrarDesde = false;

  // Horarios
  fechaSeleccionada: Date | null = null;
  franjaSeleccionada: string | null = null;
  horariosDisponibles: string[] = [];
  errorHorarios = '';
  errorAgendamiento = '';

  // Formularios
  filtroForm: FormGroup;
  agendaForm: FormGroup;

  constructor() {
    this.filtroForm = this.fb.group({
      ciudad: ['', Validators.required]
    });

    this.agendaForm = this.fb.group({
      placa: ['', Validators.required],
      nombre: ['', Validators.required],
      telefono: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]],
      tipoDocumento: ['', Validators.required],
      documento: ['', Validators.required],
      direccionServicio: [''], // Ya no es requerido
      correoResultado: [''], // Nuevo campo
      nombreResultado: [''], // Nuevo campo
      aceptoDatos: [false, Validators.requiredTrue]
    });
  }

  ngOnInit() {
    this.sub = this.modal.isOpen.subscribe(open => {
      this.open.set(open);
      if (open) {
        this.resetWizard();
        this.cargarDatosIniciales();
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  // ===============================
  // DATOS INICIALES
  // ===============================
  cargarDatosIniciales() {
    console.log('📦 Cargando datos iniciales de peritaje...');

    // Obtener servicios guardados
    const servicios = this.modal.getServicios();
    if (servicios && servicios.length > 0) {
      const servicio = servicios[0];
      this.servicioSeleccionado.set(servicio);
      this.descripcionServicioSeleccionado = servicio.name || 'Servicio de peritaje';
      this.valorEstimado = servicio.price || 0;
      this.mostrarDesde = false;
      console.log('✅ Servicio cargado:', servicio);
    }

    // 🔥 LEER DATOS DEL LOCALSTORAGE
    const datosGuardados = localStorage.getItem('peritaje_datos_formulario');
    
    if (datosGuardados) {
      try {
        const datos = JSON.parse(datosGuardados);
        console.log('✅ Datos recuperados del localStorage:', datos);
        
        this.agendaForm.patchValue({
          placa: datos.placa || '',
          nombre: datos.nombre || datos.nombres || '',
          telefono: datos.telefono || datos.celular || '',
          tipoDocumento: datos.tipoDocumento || '',
          documento: datos.documento || datos.identificacion || ''
        });
        
        console.log('✅ Formulario precargado desde localStorage');
      } catch (e) {
        console.error('❌ Error al parsear datos del localStorage:', e);
      }
    } else {
      console.log('⚠️ No hay datos en localStorage');
    }

    // Cargar ciudades desde RTM o API
    const ciudadesDesdeModal = this.modal.ciudades();
    if (ciudadesDesdeModal && ciudadesDesdeModal.length > 0) {
      console.log('✅ Ciudades desde modal:', ciudadesDesdeModal.length);
      this.ciudades.set(ciudadesDesdeModal);
    } else {
      console.log('🔄 Cargando ciudades desde API...');
      this.cargarCiudadesDesdeAPI();
    }
  }

  // ===============================
  // CIUDADES
  // ===============================
  cargarCiudades() {
    this.cargarCiudadesDesdeAPI();
  }

  private cargarCiudadesDesdeAPI() {
    this.loadingCiudades = true;
    
    this.modal.obtenerCiudades().subscribe({
      next: (resp) => {
        console.log('✅ Respuesta ciudades:', resp);
        const ciudadesData = resp?.data ?? [];
        this.ciudades.set(ciudadesData);
        this.modal.setCiudades(ciudadesData);
        this.loadingCiudades = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar ciudades', err);
        this.loadingCiudades = false;
      }
    });
  }

  // ===============================
  // PRECIO DINÁMICO
  // ===============================
  get precioServicio(): number {
    const servicio = this.servicioSeleccionado();
    if (servicio && servicio.price) {
      return servicio.price;
    }
    return this.valorEstimado || 0;
  }

  // ===============================
  // DETECTAR SI ES SERVICIO A DOMICILIO
  // ===============================
  get esServicioADomicilio(): boolean {
    const servicio = this.servicioSeleccionado();
    if (!servicio || !servicio.name) return false;
    
    const nombre = servicio.name.toLowerCase();
    return nombre.includes('domicilio') || nombre.includes('a domicilio');
  }

  get puedeAgendar(): boolean {
    return !!this.sedeSeleccionada;
  }

  get nombreCiudadSeleccionada(): string {
    const ciudad = this.ciudades().find(c => c.id === this.selectedCiudadId());
    return ciudad?.name ?? 'Selecciona una ciudad';
  }

  // ===============================
  // UBICACIÓN (IGUAL QUE RTM)
  // ===============================
  activarUbicacion() {
    console.log('🛰 Solicitando ubicación...');
    
    if (!('geolocation' in navigator)) {
      console.warn('⚠ Geolocalización no disponible');
      this.step = 1;
      return;
    }

    this.loadingUbicacion = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('✅ Ubicación obtenida:', pos.coords);
        this.ubicacionActivada = true;
        this.userLat = pos.coords.latitude;
        this.userLon = pos.coords.longitude;
        
        this.detectarCiudadPorCoordenadas(pos.coords.latitude, pos.coords.longitude);
        this.loadingUbicacion = false;
        this.step = 1;
      },
      (err) => {
        console.warn('⚠ Error al obtener ubicación:', err.message);
        this.loadingUbicacion = false;
        this.step = 1;
      },
      { 
        enableHighAccuracy: true, 
        timeout: 30000,
        maximumAge: 10000
      }
    );
  }

  private detectarCiudadPorCoordenadas(lat: number, lon: number) {
    const ciudadesColombia: { [key: string]: { lat: number; lon: number } } = {
      'Bogotá': { lat: 4.7110, lon: -74.0721 },
      'Medellín': { lat: 6.2476, lon: -75.5658 },
      'Cali': { lat: 3.4516, lon: -76.5320 },
      'Barranquilla': { lat: 10.9639, lon: -74.7964 },
      'Cartagena': { lat: 10.3910, lon: -75.4794 }
    };

    let ciudadMasCercana = 'Bogotá';
    let distanciaMinima = Infinity;

    Object.entries(ciudadesColombia).forEach(([ciudad, coords]) => {
      const R = 6371;
      const dLat = (coords.lat - lat) * Math.PI / 180;
      const dLon = (coords.lon - lon) * Math.PI / 180;
      
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(coords.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distancia = R * c;
      
      console.log(`📏 Distancia a ${ciudad}:`, distancia.toFixed(2), 'km');
      
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        ciudadMasCercana = ciudad;
      }
    });

    console.log('📍 Ciudad detectada:', ciudadMasCercana);
    this.ciudadDetectada = ciudadMasCercana;

    const ciudadEncontrada = this.ciudades().find(c => 
      c.name.toLowerCase().includes(ciudadMasCercana.toLowerCase())
    );

    if (ciudadEncontrada) {
      this.preseleccionarCiudad(ciudadEncontrada.id, ciudadEncontrada.name);
    }
  }

  private preseleccionarCiudad(ciudadId: number, nombreCiudad: string) {
    console.log('🎯 Preseleccionando ciudad:', nombreCiudad);
    this.selectedCiudadId.set(ciudadId);
    this.filtroForm.patchValue({ ciudad: ciudadId.toString() });
    this.cargarSedes(ciudadId);
  }

  seleccionarCiudad(ciudadId: number | string) {
    const id = Number(ciudadId);
    if (!id) return;
    this.selectedCiudadId.set(id);
    this.cargarSedes(id);
  }

  // ===============================
  // SEDES (IGUAL QUE RTM)
  // ===============================
  private cargarSedes(ciudadId: number) {
    if (!ciudadId) return;

    const ciudad = this.ciudades().find(c => c.id === ciudadId);
    const nombreCiudad = ciudad?.name;

    if (!nombreCiudad) return;

    // 🔥 OBTENER ID DEL SERVICIO SELECCIONADO
    const servicio = this.servicioSeleccionado();
    const servicioId = servicio?.id;

    console.log('📍 Cargando sedes para:', nombreCiudad, 'Servicio ID:', servicioId);

    this.loadingSedes.set(true);

    this.modal.obtenerProveedores(nombreCiudad, servicioId).subscribe({
      next: (resp) => {
        console.log('✅ Proveedores para', nombreCiudad, '(servicio:', servicioId, ')', resp);
        let data = resp?.data ?? [];
        
        // Ordenar por cercanía si hay ubicación
        if (this.userLat !== null && this.userLon !== null && data.length > 0) {
          data = this.ordenarSedesPorCercania(data);
        }
        
        this.sedes.set(data);
        this.loadingSedes.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar sedes', err);
        this.loadingSedes.set(false);
      }
    });
  }

  elegirSede(s: SedeUi) {
    this.sedeSeleccionada = s;
    console.log('🏢 Sede seleccionada:', s.nombre);

    if (s.direccion) {
      const q = encodeURIComponent(s.direccion);
      const url = `https://www.google.com/maps?q=${q}&output=embed`;
      this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  private ordenarSedesPorCercania(sedes: any[]): any[] {
    if (!this.userLat || !this.userLon) return sedes;

    return sedes
      .map(sede => {
        let sedeLat = parseFloat(sede.lat || '4.7110');
        let sedeLon = parseFloat(sede.lng || sede.lon || '-74.0721');

        const R = 6371;
        const dLat = (sedeLat - this.userLat!) * Math.PI / 180;
        const dLon = (sedeLon - this.userLon!) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.userLat! * Math.PI / 180) * Math.cos(sedeLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distancia = R * c;

        console.log(`📍 ${sede.name}: ${distancia.toFixed(2)} km`);
        return { ...sede, distancia };
      })
      .sort((a, b) => (a.distancia || 999) - (b.distancia || 999));
  }

  // ===============================
  // UTILIDADES (IGUAL QUE RTM)
  // ===============================
  extraerDireccion(description: string | null | undefined): string {
    if (!description) return '';
    const match = description.match(/@Dirección:\s*(.+?)(?:<\/p>|$)/i);
    return match ? this.limpiarTextoHtml(match[1]) : '';
  }

  extraerHorarios(description: string | null | undefined): string {
    if (!description) return '';
    const match = description.match(/@Horarios:\s*(.+?)(?:<\/p>|$)/i);
    return match ? this.limpiarTextoHtml(match[1]) : '';
  }

  private limpiarTextoHtml(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ===============================
  // AGENDAR PERITAJE
  // ===============================
  agendarPeritaje() {
    if (!this.sedeSeleccionada) {
      alert('Por favor selecciona una sede');
      return;
    }
    console.log('✅ Avanzando a formulario de agendamiento');
    this.step = 2;
  }

  // ===============================
  // HORARIOS
  // ===============================
  onFechaChange(event: any) {
    const fechaStr = event.target.value;
    if (!fechaStr) return;

    this.fechaSeleccionada = new Date(fechaStr + 'T00:00:00');
    this.franjaSeleccionada = null;
    this.horariosDisponibles = [];
    this.errorHorarios = '';

    this.cargarHorarios();
  }

  cargarHorarios() {
    if (!this.fechaSeleccionada || !this.sedeSeleccionada) return;

    const servicio = this.servicioSeleccionado();
    if (!servicio) return;

    // 🔥 LOG PARA DEBUGGING - COPIAR ESTO PARA POSTMAN
    console.log('🔍 ═══════════════════════════════════════');
    console.log('🔍 BODY EXACTO PARA POSTMAN:');
    const bodyParaPostman = {
      sede: this.sedeSeleccionada.nombre || this.sedeSeleccionada.name || '',
      servicio: servicio?.name || '',
      fecha_agenda: {
        day: this.fechaSeleccionada.getDate(),
        month: this.fechaSeleccionada.getMonth() + 1,
        year: this.fechaSeleccionada.getFullYear()
      },
      from_flow: 'peritaje'
    };
    console.log(JSON.stringify(bodyParaPostman, null, 2));
    console.log('🔍 ═══════════════════════════════════════');

    this.loadingHorarios = true;
    this.errorHorarios = '';

    this.modal.obtenerHorariosDisponibles({
      sede: this.sedeSeleccionada.nombre || this.sedeSeleccionada.name || '',
      servicio: servicio?.name || '',
      fecha_agenda: {
        day: this.fechaSeleccionada.getDate(),
        month: this.fechaSeleccionada.getMonth() + 1,
        year: this.fechaSeleccionada.getFullYear()
      }
      // 🔥 from_flow se agrega automáticamente en el servicio
    }).subscribe({
      next: (resp) => {
        console.log('📦 Respuesta horarios RAW:', resp);
        
        // 🔥 PARSEAR CORRECTAMENTE LA RESPUESTA
        if (Array.isArray(resp) && resp.length > 0) {
          // Estructura: [{ id, date, slots: [{id, time, available_count, total_count}] }]
          const slots = resp[0].slots || [];
          
          // 🔥 VERIFICAR SI ES OBJETO O STRING
          if (slots.length > 0) {
            if (typeof slots[0] === 'object' && slots[0].time) {
              // Slots son objetos: { id, time, available_count, total_count }
              this.horariosDisponibles = slots
                .filter((slot: any) => slot.available_count > 0) // Solo slots disponibles
                .map((slot: any) => slot.time); // Extraer el tiempo
            } else if (typeof slots[0] === 'string') {
              // Slots son strings: ["08:00 AM", "09:00 AM"]
              this.horariosDisponibles = slots;
            } else {
              this.horariosDisponibles = [];
            }
          } else {
            this.horariosDisponibles = [];
          }
            
        } else if (resp.data) {
          // Estructura antigua: { data: [] }
          this.horariosDisponibles = resp.data || [];
        } else {
          this.horariosDisponibles = [];
        }
        
        console.log('✅ Horarios parseados:', this.horariosDisponibles.length);
        console.log('📋 Horarios:', this.horariosDisponibles);
        this.loadingHorarios = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar horarios:', err);
        this.errorHorarios = 'No se pudieron cargar los horarios.';
        this.loadingHorarios = false;
      }
    });
  }

  // ===============================
  // IR A PAGO
  // ===============================
  irAPago() {
    if (this.agendaForm.invalid) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (!this.sedeSeleccionada) {
      alert('Por favor selecciona una sede');
      return;
    }

    // 🔥 SI HAY HORARIOS DISPONIBLES, DEBE SELECCIONAR UNO
    if (this.horariosDisponibles.length > 0 && !this.franjaSeleccionada) {
      alert('Por favor selecciona un horario disponible');
      return;
    }

    // 🔥 SI NO HAY HORARIOS, PERMITIR CONTINUAR SIN HORARIO ESPECÍFICO
    // (El sistema no tiene horarios configurados para peritaje)

    const servicio = this.servicioSeleccionado();
    if (!servicio) return;

    const datosRunt = this.peritajeSvc.datosRunt();
    const form = this.agendaForm.value;

    // 🔥 DETERMINAR SI ES SERVICIO A DOMICILIO
    const nombreServicio = servicio?.name?.toLowerCase() || '';
    const esADomicilio = nombreServicio.includes('domicilio') || nombreServicio.includes('a domicilio');

    const params: any = {
      cliente: 'pagina_web',
      placa: form.placa,
      nombres: form.nombre,
      celular: form.telefono,
      correo: form.correo,
      tipo_identificacion: this.mapearTipoDocumento(form.tipoDocumento),
      identificacion: form.documento,
      fecha_agenda: this.fechaSeleccionada ? {
        day: this.fechaSeleccionada.getDate(),
        month: this.fechaSeleccionada.getMonth() + 1,
        year: this.fechaSeleccionada.getFullYear()
      } : null,
      franja: this.franjaSeleccionada || 'Por Confirmar', // 🔥 Si no hay horarios, enviar "Por Confirmar"
      ciudad: this.nombreCiudadSeleccionada,
      sede: this.sedeSeleccionada.nombre || this.sedeSeleccionada.name || '',
      servicio: servicio?.name || '',
      recibir_resultado: 'true',
      correo_resultado: form.correoResultado || form.correo,
      nombre_resultado: form.nombreResultado || form.nombre,
      clase_vehiculo: datosRunt?.clase_vehiculo,
      tipo_servicio: datosRunt?.tipo_servicio,
      tipo_combustible: datosRunt?.tipo_combustible,
      modelo: datosRunt?.modelo
    };

    // 🔥 AGREGAR direccion_servicio si es a domicilio
    if (esADomicilio) {
      if (!form.direccionServicio || form.direccionServicio.trim() === '') {
        alert('Por favor ingresa la dirección donde se realizará el peritaje');
        return;
      }
      params.direccion_servicio = form.direccionServicio;
    }

    console.log('📝 Agendando servicio...', params);
    this.isAgendando = true;
    this.errorAgendamiento = '';

    this.modal.agendar(params).subscribe({
      next: (resp) => {
        console.log('✅ Servicio agendado:', resp);

        // 🔥 CONSTRUIR DATOS PARA PAYMENT-MODAL
        const servicio = this.servicioSeleccionado();
        const form = this.agendaForm.value;
        const datosRunt = this.peritajeSvc.datosRunt();

        const paymentData: PaymentData = {
          invoiceId: resp.invoice_id || null,
          pagoUuid: null,
          
          servicio: {
            tipo: 'peritaje',
            nombre: servicio?.name || 'Peritaje Vehicular',
            descripcion: servicio?.name || 'Peritaje Vehicular'
          },
          
          cliente: {
            nombre: form.nombre || '',
            documento: form.documento || '',
            tipoDocumento: this.mapearTipoDocumento(form.tipoDocumento) || 'CC',
            telefono: form.telefono || '',
            correo: form.correo || '',
            placa: form.placa || ''
          },
          
          reserva: {
            ciudad: this.nombreCiudadSeleccionada || '',
            sede: this.sedeSeleccionada?.nombre || this.sedeSeleccionada?.name || '',
            direccion: this.sedeSeleccionada?.direccion || this.sedeSeleccionada?.address || '',
            fecha: this.fechaSeleccionada || new Date(),
            horario: this.franjaSeleccionada || ''
          },
          
          valores: {
            valorBase: this.precioServicio,
            descuento: 0,
            total: this.precioServicio
          },
          
          metadata: {
            codeBooking: resp.codeBooking,
            modelo: datosRunt?.modelo,
            clase_vehiculo: datosRunt?.clase_vehiculo,
            tipo_servicio: datosRunt?.tipo_servicio,
            tipo_combustible: datosRunt?.tipo_combustible
          }
        };

        console.log('💳 Abriendo payment-modal con:', paymentData);

        // 🔥 CERRAR ESTE MODAL Y ABRIR PAYMENT-MODAL
        this.cerrar();
        
        setTimeout(() => {
          this.paymentModalService.open(paymentData);
        }, 300);

        this.isAgendando = false;
      },
      error: (err) => {
        console.error('❌ Error al agendar:', err);
        
        // 🔥 MEJOR MANEJO DE ERRORES
        let mensajeError = 'Error al agendar el servicio.';
        
        if (err.error) {
          if (typeof err.error === 'string') {
            // Es HTML (error 500)
            mensajeError = 'Error interno del servidor. Verifica que todos los datos sean correctos.';
          } else if (err.error.franja) {
            mensajeError = 'Error en horario: ' + err.error.franja.join(', ');
          } else if (err.error.direccion_servicio) {
            mensajeError = 'Error en dirección: ' + err.error.direccion_servicio.join(', ');
          } else if (err.error.message) {
            mensajeError = err.error.message;
          }
        }
        
        this.errorAgendamiento = mensajeError;
        this.isAgendando = false;
        alert(mensajeError);
      }
    });
  }

  mapearTipoDocumento(tipo: string): string {
    const mapeo: any = {
      'cc': 'Cedula de Ciudadania',
      'ce': 'Cedula de Extranjeria',
      'nit': 'NIT'
    };
    return mapeo[tipo] || 'Cedula de Ciudadania';
  }

  cerrar() {
    this.modal.close();
  }

  resetWizard() {
    this.step = 0;
    this.sedeSeleccionada = null;
    this.fechaSeleccionada = null;
    this.franjaSeleccionada = null;
    this.horariosDisponibles = [];
    this.ubicacionActivada = false;
    this.ciudadDetectada = null;
    this.userLat = null;
    this.userLon = null;
    this.agendaForm.reset();
    this.filtroForm.reset();
  }
}
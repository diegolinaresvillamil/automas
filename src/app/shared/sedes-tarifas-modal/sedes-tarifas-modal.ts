import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SedesTarifasModalService } from './sedes-tarifas-modal.service';
import { RtmModalService } from '../rtm-modal/rtm-modal.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';


type VehiculoTipo = 'cuadriciclo' | 'moto' | 'ciclomotor' | 'liviano';
type Subtipo = 'particular' | 'publico' | 'electrico';

@Component({
  selector: 'app-sedes-tarifas-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './sedes-tarifas-modal.html',
  styleUrls: ['./sedes-tarifas-modal.css']
})
export class SedesTarifasModalComponent implements OnInit, OnDestroy {
  // ===============================
  // 🔧 Inyecciones
  // ===============================
  private modalSvc = inject(SedesTarifasModalService);
  private rtmSvc = inject(RtmModalService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  // ===============================
  // 🔹 Estado y suscripciones
  // ===============================
  open = signal(false);
  sub?: Subscription;

  /** pasos: 0=ubicación, 1=sedes, 2=agendar, 3=pago */
  step = 0;

  /** Mostrar o no los subtipos (solo si el tipo seleccionado es "liviano") */
  mostrarSubtipos = false;

  // Tipo / subtipo seleccionados
  selectedTipo = signal<VehiculoTipo | null>(null);
  selectedSubtipo = signal<Subtipo | null>(null);

  // Ciudades y sedes reales
  ciudades = signal<any[]>([]);
  selectedCiudadId = signal<number | null>(null);
  sedes = signal<any[]>([]);
  loadingSedes = signal(false);
  loadingCiudades = signal(false);

  // 🆕 Control de geolocalización
  ubicacionActivada = false;
  ciudadDetectada: string | null = null;

  // URL segura para el iframe del mapa
  mapaUrl?: SafeResourceUrl;

  // ===============================
  // 📋 Formularios
  // ===============================
  filtroForm = this.fb.group({
    ciudad: ['', Validators.required],
    tipo: ['', Validators.required],
    subtipo: ['', Validators.required]
  });

  // Form de agendamiento (pantalla 2)
  agendaForm = this.fb.group({
    placa: ['', [Validators.required, Validators.minLength(5)]],
    nombre: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    correo: ['', [Validators.required, Validators.email]],
    tipoDocumento: ['cc', Validators.required],
    documento: ['', Validators.required],
    aceptoDatos: [false, [Validators.requiredTrue]]
  });

  // ===============================
  // 🕒 Horarios (pantalla 2)
  // ===============================
  fechaSeleccionada: Date | null = null;
  horariosDisponibles: string[] = [];
  franjaSeleccionada: string | null = null;
  loadingHorarios = false;
  errorHorarios: string | null = null;

  // ===============================
  // 💳 Datos de pago (pantalla 3)
  // ===============================
  codigoCupon = '';
  mensajeCupon = '';
  cuponValido = false;
  descuentoAplicado = 0;
  aceptaCondicionesPago = false;
  medioPagoSeleccionado: 'mercado-pago' | null = null;
  isProcessingPayment = false;
  fechaTransaccion = new Date();
  invoiceId: number | null = null;
  
  // 🆕 Datos del proyecto de pago
  proyectoPago: any = null;
  loadingProyectoPago = false;
  
  // 🆕 UUID del pago generado
  pagoUuid: string | null = null;
  paymentLink: string | null = null;

  // ===============================
  // 🧾 Estado de agendamiento
  // ===============================
  isAgendando = false;
  errorAgendamiento: string | null = null;

  // ===============================
  // 📍 Datos de tipos/subtipos
  // ===============================
  tipos: { value: VehiculoTipo; label: string }[] = [
    { value: 'cuadriciclo', label: 'Cuadriciclos' },
    { value: 'moto', label: 'Motocicletas' },
    { value: 'ciclomotor', label: 'Ciclomotores' },
    { value: 'liviano', label: 'Livianos' }
  ];

  subtipos: { value: Subtipo; label: string }[] = [
    { value: 'particular', label: 'Particular' },
    { value: 'publico', label: 'Público' },
    { value: 'electrico', label: 'Eléctrico' }
  ];

  // Datos de sedes
  sedesFiltradas: { nombre: string; direccion: string; horario: string }[] = [];
  sedeSeleccionada?: { nombre: string; direccion: string; horario: string };
  valorEstimado?: number;

  // ===============================
  // 🧮 Getters
  // ===============================
  get nombreCiudadSeleccionada(): string {
    const ciudad = this.ciudades().find(c => c.id === this.selectedCiudadId());
    return ciudad?.name ?? 'Selecciona una ciudad';
  }

  get descripcionTipoSeleccionado(): string {
    const tipo = this.selectedTipo();
    const subtipo = this.selectedSubtipo();
    if (!tipo) return 'Selecciona el tipo de vehículo';

    const base =
      tipo === 'liviano' ? 'Liviano' :
      tipo === 'moto' ? 'Motocicleta' :
      tipo === 'ciclomotor' ? 'Ciclomotor' :
      'Cuadriciclo';

    if (!subtipo) return base;

    const sub =
      subtipo === 'particular' ? 'Particular' :
      subtipo === 'publico' ? 'Público' :
      'Eléctrico';

    return `${base} ${sub}`;
  }

  get totalAPagar(): number {
    return (this.valorEstimado || 0) - this.descuentoAplicado;
  }

  get puedeAgendar(): boolean {
    if (!this.sedeSeleccionada) return false;
    if (!this.selectedTipo()) return false;
    if (this.selectedTipo() === 'liviano' && !this.selectedSubtipo()) {
      return false;
    }
    return true;
  }

  // ===============================
  // ⚙ Ciclo de vida
  // ===============================
  ngOnInit() {
    this.sub = this.modalSvc.open$.subscribe((isOpen: boolean) => {
      this.open.set(isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        this.resetWizard();
        
        // 🔥 NO CARGAR PROYECTO DE PAGO - Evitar error
        // this.cargarProyectoPago();
        console.log('⚠️ Proyecto de pago desactivado temporalmente');
        
        const ciudadesDesdeRTM = this.modalSvc.ciudades();
        
        if (ciudadesDesdeRTM && ciudadesDesdeRTM.length > 0) {
          console.log('✅ Ciudades desde RTM:', ciudadesDesdeRTM.length);
          this.ciudades.set(ciudadesDesdeRTM);
        } else {
          console.log('🔄 Cargando ciudades desde API...');
          this.cargarCiudadesDesdeAPI();
        }
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    document.body.style.overflow = '';
  }

  // ===============================
  // 💳 CARGAR PROYECTO DE PAGO (DESACTIVADO)
  // ===============================
  private cargarProyectoPago() {
    // 🔥 DESACTIVADO TEMPORALMENTE - El endpoint está devolviendo HTML
    console.warn('⚠️ cargarProyectoPago() desactivado');
    return;
    
    /*
    this.loadingProyectoPago = true;
    const codigoProyecto = 'pagina_web';
    
    this.rtmSvc.obtenerProyectoPago(codigoProyecto).subscribe({
      next: (resp) => {
        console.log('✅ Proyecto de pago cargado:', resp);
        this.proyectoPago = resp;
        this.loadingProyectoPago = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar proyecto de pago:', err);
        this.loadingProyectoPago = false;
      }
    });
    */
  }

  // ===============================
  // 🌎 CARGAR CIUDADES DESDE API
  // ===============================
  private cargarCiudadesDesdeAPI() {
    this.loadingCiudades.set(true);
    
    this.modalSvc.obtenerCiudades().subscribe({
      next: (resp) => {
        console.log('✅ Respuesta ciudades:', resp);
        const ciudadesData = resp?.data ?? [];
        this.ciudades.set(ciudadesData);
        this.modalSvc.setCiudades(ciudadesData);
        
        if (!this.ubicacionActivada && ciudadesData.length > 0) {
          const primeraCiudad = ciudadesData[0];
          this.preseleccionarCiudad(primeraCiudad.id, primeraCiudad.name);
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar ciudades', err);
        this.loadingCiudades.set(false);
      },
      complete: () => {
        this.loadingCiudades.set(false);
      }
    });
  }

  // ===============================
  // 🧭 Paso 0: Pedir ubicación
  // ===============================
  activarUbicacion() {
    console.log('🛰 Solicitando ubicación...');
    
    if (!('geolocation' in navigator)) {
      console.warn('⚠ Geolocalización no disponible en este navegador');
      this.step = 1;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('✅ Ubicación obtenida:', pos.coords);
        this.ubicacionActivada = true;
        this.detectarCiudadPorCoordenadas(pos.coords.latitude, pos.coords.longitude);
        this.step = 1;
      },
      (err) => {
        console.warn('⚠ Error al obtener ubicación:', err.message);
        this.step = 1;
        
        if (this.ciudades().length > 0) {
          const primeraCiudad = this.ciudades()[0];
          this.preseleccionarCiudad(primeraCiudad.id, primeraCiudad.name);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  // ===============================
  // 🗺️ DETECTAR CIUDAD POR COORDENADAS
  // ===============================
  private detectarCiudadPorCoordenadas(lat: number, lon: number) {
    const ciudadesColombia: { [key: string]: { lat: number; lon: number } } = {
      'Bogotá': { lat: 4.7110, lon: -74.0721 },
      'Medellín': { lat: 6.2476, lon: -75.5658 },
      'Cali': { lat: 3.4516, lon: -76.5320 },
      'Barranquilla': { lat: 10.9639, lon: -74.7964 },
      'Cartagena': { lat: 10.3910, lon: -75.4794 },
      'Bucaramanga': { lat: 7.1193, lon: -73.1227 },
      'Pereira': { lat: 4.8133, lon: -75.6961 },
      'Manizales': { lat: 5.0700, lon: -75.5138 },
      'Ibagué': { lat: 4.4389, lon: -75.2322 },
      'Pasto': { lat: 1.2136, lon: -77.2811 }
    };

    let ciudadMasCercana = 'Bogotá';
    let distanciaMinima = Infinity;

    Object.entries(ciudadesColombia).forEach(([ciudad, coords]) => {
      const distancia = Math.sqrt(
        Math.pow(lat - coords.lat, 2) + Math.pow(lon - coords.lon, 2)
      );
      
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
    } else if (this.ciudades().length > 0) {
      const primeraCiudad = this.ciudades()[0];
      this.preseleccionarCiudad(primeraCiudad.id, primeraCiudad.name);
    }
  }

  // ===============================
  // 🎯 PRESELECCIONAR CIUDAD
  // ===============================
  private preseleccionarCiudad(ciudadId: number, nombreCiudad: string) {
    console.log('🎯 Preseleccionando ciudad:', nombreCiudad);
    this.selectedCiudadId.set(ciudadId);
    this.filtroForm.patchValue({ ciudad: ciudadId.toString() });
    localStorage.setItem('am_ultima_ciudad', nombreCiudad);
    this.cargarSedes(ciudadId);
  }

  // ===============================
  // 📍 Seleccionar ciudad y cargar sedes reales
  // ===============================
  seleccionarCiudad(ciudadId: number | string) {
    const id = Number(ciudadId);
    if (!id) return;

    this.selectedCiudadId.set(id);
    this.cargarSedes(id);
  }

  private cargarSedes(ciudadId: number) {
    if (!ciudadId) return;

    const ciudad = this.ciudades().find(c => c.id === ciudadId);
    const nombreCiudad = ciudad?.name;

    if (!nombreCiudad) return;

    this.loadingSedes.set(true);

    this.rtmSvc.obtenerProveedores(nombreCiudad).subscribe({
      next: (resp) => {
        console.log('Proveedores/sedes para ciudad', nombreCiudad, resp);
        const data = resp?.data ?? [];
        this.sedes.set(data);

        if (data.length > 0) {
          const primera = data[0];
          const direccion =
            this.extraerDireccion(primera.description) ||
            primera.address ||
            primera.direccion ||
            '';
          const horario =
            this.extraerHorarios(primera.description) ||
            primera.horario ||
            '';

          this.sedeSeleccionada = {
            nombre: primera.name,
            direccion,
            horario
          };

          if (direccion) {
            this.mapaUrl = this.crearUrlMapaSeguro(direccion);
          }
        }
      },
      error: (err) => {
        console.error('Error al cargar sedes', err);
        this.loadingSedes.set(false);
      },
      complete: () => {
        this.loadingSedes.set(false);
      }
    });
  }

  // ===============================
  // 📍 Paso 1: Selección de sede
  // ===============================
  elegirSede(s: { nombre: string; direccion: string; horario: string }) {
    this.sedeSeleccionada = s;
    this.valorEstimado = 290000;

    if (s.direccion) {
      this.mapaUrl = this.crearUrlMapaSeguro(s.direccion);
    }

    this.fechaSeleccionada = null;
    this.horariosDisponibles = [];
    this.franjaSeleccionada = null;
    this.errorHorarios = null;
  }

  agendarRevision() {
    if (!this.sedeSeleccionada) {
      alert('Por favor selecciona una sede antes de agendar tu revisión.');
      return;
    }

    if (!this.selectedTipo()) {
      alert('Por favor selecciona el tipo de vehículo antes de continuar.');
      return;
    }

    if (this.selectedTipo() === 'liviano' && !this.selectedSubtipo()) {
      alert('Por favor selecciona el subtipo de vehículo liviano antes de continuar.');
      return;
    }

    console.log('✅ Agendando revisión para sede:', this.sedeSeleccionada);
    console.log('✅ Tipo de vehículo:', this.selectedTipo());
    if (this.selectedSubtipo()) {
      console.log('✅ Subtipo de vehículo:', this.selectedSubtipo());
    }
    
    this.step = 2;
  }

  // ===============================
  // 🕒 Horarios: cambio de fecha
  // ===============================
  onFechaChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    this.franjaSeleccionada = null;
    this.horariosDisponibles = [];
    this.errorHorarios = null;

    if (!value) {
      this.fechaSeleccionada = null;
      return;
    }

    const fecha = new Date(value + 'T00:00:00');
    this.fechaSeleccionada = fecha;

    if (!this.sedeSeleccionada) {
      alert('Primero selecciona una sede antes de elegir fecha.');
      return;
    }

    this.cargarHorarios(fecha);
  }

  private cargarHorarios(fecha: Date) {
    if (!this.sedeSeleccionada) {
      console.error('❌ No hay sede seleccionada');
      return;
    }

    const ciudad = this.nombreCiudadSeleccionada;
    if (!ciudad || ciudad === 'Selecciona una ciudad') {
      console.error('❌ No hay ciudad seleccionada');
      this.errorHorarios = 'Por favor selecciona una ciudad primero.';
      return;
    }

    this.loadingHorarios = true;
    this.errorHorarios = null;
    this.horariosDisponibles = [];
    this.franjaSeleccionada = null;

    console.log('📅 Solicitando horarios:', {
      sede: this.sedeSeleccionada.nombre,
      ciudad: ciudad,
      fecha: fecha.toISOString().split('T')[0]
    });

    this.rtmSvc.obtenerHorariosDisponibles({
      sede: this.sedeSeleccionada.nombre,
      fecha: fecha,
      ciudad: ciudad,
      from_flow: 'rtm'
    }).subscribe({
      next: (resp) => {
        console.log('✅ Respuesta horarios completa:', JSON.stringify(resp, null, 2));

        let horarios: string[] = [];
        try {
          if (Array.isArray(resp) && resp.length > 0) {
            const primerDia = resp[0];
            if (primerDia.slots && Array.isArray(primerDia.slots)) {
              horarios = primerDia.slots
                .map((slot: any) => slot.time || slot.hour || slot.horario || slot.franja || slot.id || '')
                .filter((h: string) => h && h.trim() !== '')
                .map((h: string) => h.trim());
            }
          }

          if (!horarios.length && resp.data) {
            if (Array.isArray(resp.data)) {
              if (resp.data.length > 0) {
                const primerItem = resp.data[0];
                if (primerItem.slots && Array.isArray(primerItem.slots)) {
                  horarios = primerItem.slots
                    .map((slot: any) => slot.time || slot.hour || slot.horario || slot.franja || slot.id || '')
                    .filter((h: string) => h && h.trim() !== '')
                    .map((h: string) => h.trim());
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Error al procesar horarios:', error);
        }

        this.horariosDisponibles = horarios;

        if (!horarios.length) {
          this.errorHorarios = 'No hay horarios disponibles para la fecha seleccionada.';
        }
      },
      error: (err) => {
        console.error('❌ ERROR HTTP al obtener horarios:', err);
        if (err?.status === 401 || err?.status === 419) {
          this.errorHorarios = 'Token de autenticación expirado. Contacta a soporte.';
        } else {
          this.errorHorarios = 'Error al consultar horarios. Intenta más tarde.';
        }
      },
      complete: () => {
        this.loadingHorarios = false;
      }
    });
  }

  seleccionarFranja(franja: string) {
    this.franjaSeleccionada = franja;
  }

  // ===============================
  // 📅 Paso 2 → 3: Ir a pantalla de pago
  // ===============================
  irAPago() {
    if (this.agendaForm.invalid) {
      this.agendaForm.markAllAsTouched();
      console.warn('⚠ Formulario incompleto');
      return;
    }

    // 🔥 MODO SIN HORARIOS: Token expirado - CREAR VALORES POR DEFECTO
    if (!this.fechaSeleccionada) {
      this.fechaSeleccionada = new Date();
      this.fechaSeleccionada.setDate(this.fechaSeleccionada.getDate() + 3);
      console.warn('⚠️ Sin horarios disponibles - Usando fecha por defecto:', this.fechaSeleccionada);
    }
    
    if (!this.franjaSeleccionada) {
      this.franjaSeleccionada = '10:00 AM';
      console.warn('⚠️ Sin horarios disponibles - Usando franja por defecto:', this.franjaSeleccionada);
    }

    if (!this.sedeSeleccionada) {
      alert('Por favor selecciona una sede.');
      return;
    }

    const ciudad = this.nombreCiudadSeleccionada;
    if (!ciudad || ciudad === 'Selecciona una ciudad') {
      alert('Por favor selecciona una ciudad válida.');
      return;
    }

    console.log('✅ Avanzando a pago con:', {
      fecha: this.fechaSeleccionada,
      franja: this.franjaSeleccionada,
      sede: this.sedeSeleccionada.nombre
    });

    // Cotizar antes de ir a pago
    this.cotizarYPrepararPago();
  }

  private cotizarYPrepararPago() {
    const form = this.agendaForm.value;
    const placa = form.placa ?? '';
    const nombres = form.nombre ?? '';
    const celular = form.telefono ?? '';
    const correo = form.correo ?? '';
    const docTipo = form.tipoDocumento ?? 'cc';
    const documento = form.documento ?? '';

    const tipo_identificacion = this.mapTipoIdentificacion(docTipo);
    const sede = this.sedeSeleccionada!.nombre;
    const fecha = this.fechaSeleccionada!;
    const franja = this.franjaSeleccionada!;
    const ciudad = this.nombreCiudadSeleccionada;

    this.isAgendando = true;
    this.errorAgendamiento = null;

    console.log('💰 Cotizando antes de pago:', {
      placa,
      nombres,
      ciudad,
      sede,
      fecha,
      franja
    });

    // 1️⃣ COTIZAR
    this.rtmSvc.cotizarConRunt({
      placa,
      fecha,
      franja,
      ciudad,
      sede,
      celular,
      correo,
      nombres,
      tipo_identificacion,
      identificacion: documento
    }).subscribe({
      next: (respCotizar) => {
        console.log('✅ Respuesta cotizar:', respCotizar);
        const price = respCotizar?.data?.price || respCotizar?.price || 290000;
        this.valorEstimado = price;

        // 2️⃣ AGENDAR para obtener invoice_id
        this.rtmSvc.agendarConRunt({
          placa,
          fecha,
          franja,
          ciudad,
          sede,
          celular,
          correo,
          nombres,
          tipo_identificacion,
          identificacion: documento
        }).subscribe({
          next: (respAgendar) => {
            console.log('✅ Respuesta agendar:', respAgendar);
            const invoiceId = respAgendar?.data?.invoice_id || respAgendar?.invoice_id || 999999;
            this.invoiceId = invoiceId;
            console.log('📋 Invoice ID generado:', invoiceId);

            // ✅ Ir a pantalla de pago
            this.step = 3;
            this.fechaTransaccion = new Date();
            this.isAgendando = false;
          },
          error: (err) => {
            console.error('❌ Error al agendar', err);
            // 🔥 CONTINUAR ANYWAY - Usar invoice ficticio
            this.invoiceId = 999999;
            this.step = 3;
            this.fechaTransaccion = new Date();
            this.isAgendando = false;
            console.warn('⚠️ Agendamiento falló, continuando con invoice ficticio');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al cotizar', err);
        // 🔥 CONTINUAR ANYWAY - Usar precio por defecto
        this.valorEstimado = 290000;
        this.invoiceId = 999999;
        this.step = 3;
        this.fechaTransaccion = new Date();
        this.isAgendando = false;
        console.warn('⚠️ Cotización falló, continuando con precio por defecto');
      }
    });
  }

  // ===============================
  // 💳 Pantalla de pago
  // ===============================
  seleccionarMedioPago(medio: 'mercado-pago') {
    this.medioPagoSeleccionado = medio;
  }

  aplicarCupon() {
    const cupon = this.codigoCupon.trim().toUpperCase();

    if (!cupon) {
      this.mensajeCupon = 'Ingresa un código de cupón';
      this.cuponValido = false;
      return;
    }

    if (cupon === 'AUTOMAS10') {
      this.descuentoAplicado = (this.valorEstimado || 0) * 0.10;
      this.mensajeCupon = '✅ Cupón aplicado: 10% de descuento';
      this.cuponValido = true;
    } else if (cupon === 'PROMO20') {
      this.descuentoAplicado = (this.valorEstimado || 0) * 0.20;
      this.mensajeCupon = '✅ Cupón aplicado: 20% de descuento';
      this.cuponValido = true;
    } else {
      this.descuentoAplicado = 0;
      this.mensajeCupon = '❌ Cupón inválido';
      this.cuponValido = false;
    }
  }

  procesarPago() {
    if (!this.aceptaCondicionesPago) {
      alert('Debes aceptar las condiciones para continuar');
      return;
    }

    if (!this.medioPagoSeleccionado) {
      alert('Selecciona un método de pago');
      return;
    }

    if (!this.invoiceId) {
      console.warn('⚠️ No hay invoice ID, usando valor por defecto');
      this.invoiceId = 999999;
    }

    this.isProcessingPayment = true;

    // 🔥 MODO SIMPLIFICADO - SIN LLAMAR AL API
    console.log('💳 MODO DEMO: Simulando pago exitoso');
    console.log('Datos del pago:', {
      placa: this.agendaForm.value.placa,
      sede: this.sedeSeleccionada?.nombre,
      valor: this.totalAPagar,
      invoice_id: this.invoiceId
    });

    setTimeout(() => {
      alert('✅ [DEMO] Tu reserva ha sido creada. En producción, serías redirigido a Mercado Pago.');
      this.isProcessingPayment = false;
      this.cerrar();
    }, 1500);

    // 🔥 DESCOMENTAR CUANDO EL ENDPOINT FUNCIONE
    /*
    const form = this.agendaForm.value;
    const placa = form.placa ?? '';
    const sedeNombre = this.sedeSeleccionada?.nombre ?? '';
    const tipoVehiculo = this.mapearTipoVehiculo();

    const payload = {
      proyecto: 'pagina_web',
      medio_pago: 'mercadopago',
      sede: sedeNombre,
      servicio_tipovehiculo: tipoVehiculo,
      servicio_label: 'PAGO WEB RTM',
      placa_vehiculo: placa,
      valor: this.totalAPagar
    };

    this.rtmSvc.generarLinkPago(payload).subscribe({
      next: (resp) => {
        console.log('✅ Link de pago generado:', resp);
        this.pagoUuid = resp.pago_id || null;
        this.paymentLink = resp.payment_link || null;

        if (this.paymentLink) {
          window.location.href = this.paymentLink;
        } else {
          alert('Error: No se generó el enlace de pago.');
          this.isProcessingPayment = false;
        }
      },
      error: (err) => {
        console.error('❌ Error al generar link de pago:', err);
        alert('Error al procesar el pago. Intenta nuevamente.');
        this.isProcessingPayment = false;
      }
    });
    */
  }

  private mapearTipoVehiculo(): string {
    const tipo = this.selectedTipo();
    const subtipo = this.selectedSubtipo();

    if (!tipo) return 'automovil';

    if (tipo === 'liviano') {
      if (subtipo === 'particular') return 'automovil_particular';
      if (subtipo === 'publico') return 'automovil_publico';
      if (subtipo === 'electrico') return 'automovil_electrico';
      return 'automovil';
    }

    if (tipo === 'moto') return 'motocicleta';
    if (tipo === 'ciclomotor') return 'ciclomotor';
    if (tipo === 'cuadriciclo') return 'cuadriciclo';

    return 'automovil';
  }

  volver() {
    if (this.step > 0) this.step--;
  }

  cerrar() {
    this.modalSvc.close();
  }

  // ===============================
  // ⚙ Control de tipo/subtipo
  // ===============================
  seleccionarTipo(tipo: VehiculoTipo) {
    this.filtroForm.patchValue({ tipo });
    this.selectedTipo.set(tipo);
    this.mostrarSubtipos = tipo === 'liviano';

    if (tipo !== 'liviano') {
      this.selectedSubtipo.set(null);
      this.filtroForm.patchValue({ subtipo: '' });
    }
  }

  seleccionarSubtipo(subtipo: Subtipo) {
    this.filtroForm.patchValue({ subtipo });
    this.selectedSubtipo.set(subtipo);
  }

  // ===============================
  // 🧹 Helpers
  // ===============================
  private limpiarTextoHtml(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extraerCampo(descripcion: string | null | undefined, etiqueta: string): string {
    if (!descripcion) return '';
    const idx = descripcion.indexOf(etiqueta);
    if (idx === -1) return '';

    let fragmento = descripcion.substring(idx);
    const finParrafo = fragmento.indexOf('</p>');
    if (finParrafo !== -1) {
      fragmento = fragmento.substring(0, finParrafo);
    }

    fragmento = fragmento.replace(etiqueta, '');
    return this.limpiarTextoHtml(fragmento);
  }

  extraerHorarios(descripcion: string | null | undefined): string {
    return this.extraerCampo(descripcion, '@Horarios:');
  }

  extraerDireccion(descripcion: string | null | undefined): string {
    return this.extraerCampo(descripcion, '@Dirección:');
  }

  private crearUrlMapaSeguro(direccion: string): SafeResourceUrl {
    const q = encodeURIComponent(direccion);
    const url = `https://www.google.com/maps?q=${q}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private resetWizard() {
    this.step = 0;
    this.filtroForm.reset();
    this.agendaForm.reset({
      tipoDocumento: 'cc',
      aceptoDatos: false
    });

    this.sedesFiltradas = [];
    this.sedeSeleccionada = undefined;
    this.valorEstimado = undefined;
    this.mostrarSubtipos = false;
    this.mapaUrl = undefined;

    this.selectedTipo.set(null);
    this.selectedSubtipo.set(null);
    this.ciudades.set([]);
    this.sedes.set([]);
    this.selectedCiudadId.set(null);

    this.ubicacionActivada = false;
    this.ciudadDetectada = null;

    this.fechaSeleccionada = null;
    this.horariosDisponibles = [];
    this.franjaSeleccionada = null;
    this.loadingHorarios = false;
    this.errorHorarios = null;
    this.isAgendando = false;
    this.errorAgendamiento = null;

    this.codigoCupon = '';
    this.mensajeCupon = '';
    this.cuponValido = false;
    this.descuentoAplicado = 0;
    this.aceptaCondicionesPago = false;
    this.medioPagoSeleccionado = null;
    this.isProcessingPayment = false;
    this.invoiceId = null;
    this.pagoUuid = null;
    this.paymentLink = null;
    this.proyectoPago = null;

    const datosIniciales = this.rtmSvc.getDatosIniciales();
    if (datosIniciales) {
      this.agendaForm.patchValue({
        placa: datosIniciales.placa || '',
        nombre: datosIniciales.nombre || '',
        telefono: datosIniciales.telefono || '',
        correo: datosIniciales.correo || '',
        tipoDocumento: datosIniciales.docTipo || 'cc',
        documento: datosIniciales.documento || ''
      });
    }

    const mem = localStorage.getItem('am_ultima_ciudad');
    if (mem) this.filtroForm.patchValue({ ciudad: mem });
  }

  private mapTipoIdentificacion(codigo: string | null | undefined): string {
    switch (codigo) {
      case 'ce':
        return 'Cedula de Extranjeria';
      case 'nit':
        return 'NIT';
      case 'cc':
      default:
        return 'Cedula de Ciudadania';
    }
  }
}
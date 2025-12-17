import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SedesTarifasModalService } from './sedes-tarifas-modal.service';
import { RtmModalService } from '../rtm-modal/rtm-modal.service';
import { PaymentModalService, PaymentData } from '../payment-modal/payment-modal.service'
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
  private modalSvc = inject(SedesTarifasModalService);
  private rtmSvc = inject(RtmModalService);
  private paymentSvc = inject(PaymentModalService);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  open = signal(false);
  sub?: Subscription;

  step = 0;

  mostrarSubtipos = false;
  selectedTipo = signal<VehiculoTipo | null>(null);
  selectedSubtipo = signal<Subtipo | null>(null);

  ciudades = signal<any[]>([]);
  selectedCiudadId = signal<number | null>(null);
  sedes = signal<any[]>([]);
  loadingSedes = signal(false);
  loadingCiudades = signal(false);
  loadingUbicacion = false; // ✅ 1. Estado de carga para geolocalización

  ubicacionActivada = false;
  ciudadDetectada: string | null = null;
  
  // ✅ 2. Coordenadas del usuario para ordenar sedes
  userLat: number | null = null;
  userLon: number | null = null;

  mapaUrl?: SafeResourceUrl;

  // ✅ 3. Pre-seleccionar tipo de vehículo según RUNT
  datosRunt: any = null;
  precioRunt: number | null = null;
  mostrarDesde = true; // ✅ 4. Controla si muestra "Desde" en el precio
  tipoVehiculoBloqueado = false; // ✅ NUEVO: Bloquear selección si viene del RUNT

  filtroForm = this.fb.group({
    ciudad: ['', Validators.required],
    tipo: ['', Validators.required],
    subtipo: ['', Validators.required]
  });

  agendaForm = this.fb.group({
    placa: ['', [Validators.required, Validators.minLength(5)]],
    nombre: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.minLength(7)]],
    correo: ['', [Validators.required, Validators.email]],
    tipoDocumento: ['cc', Validators.required],
    documento: ['', Validators.required],
    aceptoDatos: [false, [Validators.requiredTrue]]
  });

  fechaSeleccionada: Date | null = null;
  horariosDisponibles: string[] = [];
  franjaSeleccionada: string | null = null;
  loadingHorarios = false;
  errorHorarios: string | null = null;
  
  invoiceId: number | null = null;
  isAgendando = false;
  errorAgendamiento: string | null = null;

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

  sedesFiltradas: { nombre: string; direccion: string; horario: string }[] = [];
  sedeSeleccionada?: { nombre: string; direccion: string; horario: string };
  valorEstimado?: number;

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

  get puedeAgendar(): boolean {
    if (!this.sedeSeleccionada) return false;
    if (!this.selectedTipo()) return false;
    if (this.selectedTipo() === 'liviano' && !this.selectedSubtipo()) {
      return false;
    }
    return true;
  }

  ngOnInit() {
    this.sub = this.modalSvc.open$.subscribe((isOpen: boolean) => {
      this.open.set(isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        this.resetWizard();
        
        const ciudadesDesdeRTM = this.modalSvc.ciudades();
        
        if (ciudadesDesdeRTM && ciudadesDesdeRTM.length > 0) {
          console.log('✅ Ciudades desde RTM:', ciudadesDesdeRTM.length);
          this.ciudades.set(ciudadesDesdeRTM);
          
          // ✅ 3. Pre-seleccionar tipo de vehículo según RUNT
          this.preseleccionarDatosRunt();
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

  // ✅ 3. PRE-SELECCIONAR DATOS DEL RUNT
  private preseleccionarDatosRunt() {
    const datosIniciales = this.rtmSvc.getDatosIniciales();
    if (!datosIniciales) {
      console.warn('⚠️ No hay datos iniciales del RTM');
      return;
    }

    // ✅ Obtener datos del RUNT directamente del servicio
    // El servicio RTM tiene un signal datosRunt() que contiene la respuesta del RUNT
    let datosRunt = null;
    
    try {
      // Intentar obtener datosRunt del componente RTM
      const rtmComponent = (this.rtmSvc as any);
      
      // Buscar en diferentes posibles ubicaciones
      if (rtmComponent.datosRunt && typeof rtmComponent.datosRunt === 'function') {
        datosRunt = rtmComponent.datosRunt();
      } else if (rtmComponent._datosRunt) {
        datosRunt = rtmComponent._datosRunt;
      }
      
      console.log('🔍 Buscando datos RUNT:', { 
        encontrado: !!datosRunt,
        datosRunt 
      });
    } catch (error) {
      console.error('❌ Error al obtener datos RUNT:', error);
    }
    
    if (!datosRunt) {
      console.warn('⚠️ No se encontraron datos del RUNT - continuando sin pre-selección');
      return;
    }

    console.log('✅ Datos RUNT recibidos:', datosRunt);
    this.datosRunt = datosRunt;
    
    // ✅ Pre-seleccionar tipo de vehículo
    if (datosRunt.clase_vehiculo) {
      const tipoMapeado = this.mapearClaseVehiculoATipo(datosRunt.clase_vehiculo);
      console.log(`🚗 Pre-seleccionando tipo: ${datosRunt.clase_vehiculo} → ${tipoMapeado}`);
      this.seleccionarTipo(tipoMapeado);
      this.tipoVehiculoBloqueado = true; // ✅ BLOQUEAR
    }
    
    // ✅ Pre-seleccionar subtipo (Particular/Público/Eléctrico)
    if (datosRunt.tipo_servicio) {
      const subtipoMapeado = this.mapearTipoServicioASubtipo(datosRunt.tipo_servicio);
      console.log(`📋 Pre-seleccionando subtipo: ${datosRunt.tipo_servicio} → ${subtipoMapeado}`);
      this.seleccionarSubtipo(subtipoMapeado);
    }
    
    // ✅ Guardar precio del RUNT si viene (CÓDIGO ORIGINAL RESTAURADO)
    if (datosRunt.price) {
      this.precioRunt = datosRunt.price;
      this.valorEstimado = datosRunt.price;
      this.mostrarDesde = false; // ❌ Ocultar "Desde"
      console.log('💰 Precio del RUNT:', this.precioRunt);
    }
  }

  // ✅ 3. Mapear clase_vehiculo del RUNT a tipo de UI
  private mapearClaseVehiculoATipo(claseVehiculo: string): VehiculoTipo {
    const clase = claseVehiculo.toUpperCase();
    
    // Livianos
    if (['AUTOMOVIL', 'CAMPERO', 'CAMIONETA', 'PICK UP', 'PICKUP'].includes(clase)) {
      return 'liviano';
    }
    
    // Motocicletas
    if (['MOTOCICLETA', 'MOTO', 'CUATRIMOTO'].includes(clase)) {
      return 'moto';
    }
    
    // Ciclomotores
    if (['CICLOMOTOR', 'MOTOCARGUERO'].includes(clase)) {
      return 'ciclomotor';
    }
    
    // Cuadriciclos
    if (['CUADRICICLO', 'CUATRIMOTO'].includes(clase)) {
      return 'cuadriciclo';
    }
    
    // Default: Livianos
    return 'liviano';
  }

  // ✅ 3. Mapear tipo_servicio del RUNT a subtipo de UI
  private mapearTipoServicioASubtipo(tipoServicio: string): Subtipo {
    const tipo = tipoServicio.toLowerCase();
    
    if (tipo.includes('particular')) {
      return 'particular';
    } else if (tipo.includes('publico') || tipo.includes('público')) {
      return 'publico';
    } else if (tipo.includes('electrico') || tipo.includes('eléctrico')) {
      return 'electrico';
    }
    
    return 'particular'; // Default
  }

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

  // ✅ 1. Agregar loading al activar ubicación
  activarUbicacion() {
    console.log('🛰 Solicitando ubicación...');
    
    if (!('geolocation' in navigator)) {
      console.warn('⚠ Geolocalización no disponible en este navegador');
      this.step = 1;
      return;
    }

    this.loadingUbicacion = true; // ✅ Activar loading

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('✅ Ubicación obtenida:', pos.coords);
        this.ubicacionActivada = true;
        
        // ✅ 2. Guardar coordenadas del usuario
        this.userLat = pos.coords.latitude;
        this.userLon = pos.coords.longitude;
        
        this.detectarCiudadPorCoordenadas(pos.coords.latitude, pos.coords.longitude);
        this.loadingUbicacion = false; // ✅ Desactivar loading
        this.step = 1;
      },
      (err) => {
        console.warn('⚠ Error al obtener ubicación:', err.message);
        this.loadingUbicacion = false;
        this.step = 1;
        
        if (this.ciudades().length > 0) {
          const primeraCiudad = this.ciudades()[0];
          this.preseleccionarCiudad(primeraCiudad.id, primeraCiudad.name);
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 30000, // ✅ Aumentar timeout a 30 segundos
        maximumAge: 10000 // Aceptar ubicación de hace hasta 10 segundos
      }
    );
  }

  // ✅ 2. CORREGIR: Usar coordenadas reales de ciudades colombianas
  private detectarCiudadPorCoordenadas(lat: number, lon: number) {
    const ciudadesColombia: { [key: string]: { lat: number; lon: number } } = {
      'Bogotá': { lat: 4.7110, lon: -74.0721 },
      'Medellín': { lat: 6.2476, lon: -75.5658 },
      'Cali': { lat: 3.4516, lon: -76.5320 },
      'Barranquilla': { lat: 10.9639, lon: -74.7964 },
      'Cartagena': { lat: 10.3910, lon: -75.4794 },
      'Rionegro': { lat: 6.1549, lon: -75.3736 }
    };

    let ciudadMasCercana = 'Bogotá';
    let distanciaMinima = Infinity;

    Object.entries(ciudadesColombia).forEach(([ciudad, coords]) => {
      // Calcular distancia usando fórmula de Haversine (más precisa)
      const R = 6371; // Radio de la Tierra en km
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

    console.log('📍 Ciudad detectada:', ciudadMasCercana, `(${distanciaMinima.toFixed(2)} km)`);
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

  private preseleccionarCiudad(ciudadId: number, nombreCiudad: string) {
    console.log('🎯 Preseleccionando ciudad:', nombreCiudad);
    this.selectedCiudadId.set(ciudadId);
    this.filtroForm.patchValue({ ciudad: ciudadId.toString() });
    localStorage.setItem('am_ultima_ciudad', nombreCiudad);
    this.cargarSedes(ciudadId);
  }

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
        let data = resp?.data ?? [];
        
        // ✅ 2. Ordenar sedes por cercanía si hay coordenadas del usuario
        if (this.userLat !== null && this.userLon !== null && data.length > 0) {
          data = this.ordenarSedesPorCercania(data);
        }
        
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

  elegirSede(s: { nombre: string; direccion: string; horario: string }) {
    this.sedeSeleccionada = s;
    
    console.log('🏢 Sede seleccionada:', s.nombre);
    console.log('📊 Datos RUNT disponibles:', !!this.datosRunt);
    
    // ✅ Si hay datos del RUNT, cotizar para obtener precio real
    if (this.datosRunt) {
      this.cotizarSedeConDatosRunt(s);
    } else {
      // Sin RUNT: usar precio estimado genérico
      this.valorEstimado = 290000;
      this.mostrarDesde = true;
    }

    if (s.direccion) {
      this.mapaUrl = this.crearUrlMapaSeguro(s.direccion);
    }

    this.fechaSeleccionada = null;
    this.horariosDisponibles = [];
    this.franjaSeleccionada = null;
    this.errorHorarios = null;
  }

  // ✅ RESTAURADO: Cotizar con datos del RUNT al seleccionar sede
  private cotizarSedeConDatosRunt(sede: { nombre: string; direccion: string; horario: string }) {
    const datosIniciales = this.rtmSvc.getDatosIniciales();
    if (!datosIniciales) {
      console.warn('⚠️ No hay datos iniciales para cotizar');
      this.valorEstimado = 290000;
      this.mostrarDesde = true;
      return;
    }

    const ciudad = this.nombreCiudadSeleccionada;
    
    // Fecha temporal para cotización (3 días en el futuro)
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 3);

    console.log('💰 Cotizando precio con datos del RUNT...');
    
    this.rtmSvc.cotizarConRunt({
      placa: datosIniciales.placa,
      fecha: fecha,
      franja: '10:30 AM',
      ciudad: ciudad,
      sede: sede.nombre,
      celular: datosIniciales.telefono || '3000000000',
      correo: 'cotizacion@automas.com.co', // Temporal para cotización
      nombres: datosIniciales.nombre || 'Usuario',
      tipo_identificacion: this.mapTipoIdentificacion(datosIniciales.docTipo),
      identificacion: datosIniciales.documento || '0'
    }).subscribe({
      next: (resp) => {
        console.log('✅ Respuesta cotización:', resp);
        const price = resp?.price || resp?.data?.price || 290000;
        this.precioRunt = price;
        this.valorEstimado = price;
        this.mostrarDesde = false;
        console.log('💰 Precio obtenido:', price);
      },
      error: (err) => {
        console.error('❌ Error al cotizar:', err);
        this.valorEstimado = 290000;
        this.mostrarDesde = true;
      }
    });
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

    console.log('✅ Avanzando a formulario de agendamiento');
    this.step = 2;
  }

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
    if (!this.sedeSeleccionada) return;

    const ciudad = this.nombreCiudadSeleccionada;
    if (!ciudad || ciudad === 'Selecciona una ciudad') {
      this.errorHorarios = 'Por favor selecciona una ciudad primero.';
      return;
    }

    this.loadingHorarios = true;
    this.errorHorarios = null;
    this.horariosDisponibles = [];
    this.franjaSeleccionada = null;

    this.rtmSvc.obtenerHorariosDisponibles({
      sede: this.sedeSeleccionada.nombre,
      fecha: fecha,
      ciudad: ciudad,
      from_flow: 'rtm'
    }).subscribe({
      next: (resp) => {
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
        } catch (error) {
          console.error('❌ Error al procesar horarios:', error);
        }

        this.horariosDisponibles = horarios;

        if (!horarios.length) {
          this.errorHorarios = 'No hay horarios disponibles para la fecha seleccionada.';
        }
      },
      error: (err) => {
        console.error('❌ ERROR al obtener horarios:', err);
        this.errorHorarios = 'Error al consultar horarios.';
      },
      complete: () => {
        this.loadingHorarios = false;
      }
    });
  }

  irAPago() {
    if (this.agendaForm.invalid) {
      this.agendaForm.markAllAsTouched();
      console.warn('⚠ Formulario incompleto');
      return;
    }

    if (!this.fechaSeleccionada) {
      this.fechaSeleccionada = new Date();
      this.fechaSeleccionada.setDate(this.fechaSeleccionada.getDate() + 3);
      console.warn('⚠️ Sin horarios - Usando fecha por defecto:', this.fechaSeleccionada);
    }
    
    if (!this.franjaSeleccionada) {
      this.franjaSeleccionada = '10:00 AM';
      console.warn('⚠️ Sin horarios - Usando franja por defecto:', this.franjaSeleccionada);
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

    this.cotizarYAgendar();
  }

  private cotizarYAgendar() {
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
      correo,  // ← VERIFICAR ESTE VALOR
      celular,
      ciudad,
      sede,
      fecha,
      franja
    });

    // ✅ Si hay datos del RUNT, usar cotizarConRunt
    const usarRunt = this.datosRunt !== null;

    if (usarRunt) {
      // 1️⃣ COTIZAR CON RUNT
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
          console.log('✅ Respuesta cotizar CON RUNT:', respCotizar);
          const price = respCotizar?.price || respCotizar?.data?.price || this.precioRunt || 290000;
          this.valorEstimado = price;

          // 2️⃣ AGENDAR CON RUNT
          console.log('📤 ENVIANDO AGENDAMIENTO CON ESTOS DATOS:', {
            placa,
            nombres,
            celular,
            correo,  // ← VERIFICAR QUE ESTE SEA EL CORREO REAL DEL USUARIO
            ciudad,
            sede,
            fecha: fecha.toISOString(),
            franja
          });
          
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
              console.log('✅ Respuesta agendar CON RUNT:', respAgendar);
              const invoiceId = respAgendar?.invoice_id || respAgendar?.data?.invoice_id || 999999;
              this.invoiceId = invoiceId;
              
              // ✅ USAR PRECIO DEL AGENDAMIENTO (más preciso)
              const precioFinal = respAgendar?.price || respAgendar?.data?.price || price;
              this.valorEstimado = precioFinal;
              console.log('💰 Precio final del agendamiento:', precioFinal);
              
              // ✅ Pasar respuestaAgendamiento completa
              this.abrirModalPagoCentralizado(invoiceId, precioFinal, respAgendar);
              this.isAgendando = false;
            },
            error: (err) => {
              console.error('❌ Error al agendar', err);
              const invoiceId = 999999;
              const price = this.valorEstimado || 290000;
              this.abrirModalPagoCentralizado(invoiceId, price);
              this.isAgendando = false;
            }
          });
        },
        error: (err) => {
          console.error('❌ Error al cotizar', err);
          const invoiceId = 999999;
          const price = this.precioRunt || 290000;
          this.valorEstimado = price;
          this.abrirModalPagoCentralizado(invoiceId, price);
          this.isAgendando = false;
        }
      });
    } else {
      // SIN RUNT: usar datos estimados
      this.rtmSvc.cotizarSinRunt({
        placa,
        fecha,
        franja,
        ciudad,
        sede,
        celular,
        correo,
        nombres,
        clase_vehiculo: 'AUTOMOVIL',
        tipo_servicio: 'Particular',
        tipo_combustible: 'GASOLINA',
        modelo: '2020',
        fecha_vencimiento_rtm: new Date().toISOString()
      }).subscribe({
        next: (respCotizar) => {
          console.log('✅ Respuesta cotizar SIN RUNT:', respCotizar);
          const price = respCotizar?.price || respCotizar?.data?.price || 290000;
          this.valorEstimado = price;

          this.rtmSvc.agendarSinRunt({
            placa,
            fecha,
            franja,
            ciudad,
            sede,
            celular,
            correo,
            nombres,
            clase_vehiculo: 'AUTOMOVIL',
            tipo_servicio: 'Particular',
            tipo_combustible: 'GASOLINA',
            modelo: '2020',
            fecha_vencimiento_rtm: new Date().toISOString()
          }).subscribe({
            next: (respAgendar) => {
              console.log('✅ Respuesta agendar SIN RUNT:', respAgendar);
              const invoiceId = respAgendar?.invoice_id || respAgendar?.data?.invoice_id || 999999;
              this.invoiceId = invoiceId;
              
              // ✅ USAR PRECIO DEL AGENDAMIENTO (más preciso)
              const precioFinal = respAgendar?.price || respAgendar?.data?.price || price;
              this.valorEstimado = precioFinal;
              console.log('💰 Precio final del agendamiento:', precioFinal);
              
              // ✅ Pasar respuestaAgendamiento completa
              this.abrirModalPagoCentralizado(invoiceId, precioFinal, respAgendar);
              this.isAgendando = false;
            },
            error: (err) => {
              console.error('❌ Error al agendar', err);
              const invoiceId = 999999;
              const price = this.valorEstimado || 290000;
              this.abrirModalPagoCentralizado(invoiceId, price);
              this.isAgendando = false;
            }
          });
        },
        error: (err) => {
          console.error('❌ Error al cotizar', err);
          const invoiceId = 999999;
          const price = 290000;
          this.valorEstimado = price;
          this.abrirModalPagoCentralizado(invoiceId, price);
          this.isAgendando = false;
        }
      });
    }
  }

  private abrirModalPagoCentralizado(invoiceId: number, valorBase: number, respuestaAgendamiento?: any) {
    const form = this.agendaForm.value;
    
    // ✅ Extraer codeBooking del agendamiento
    const codeBooking = respuestaAgendamiento?.codeBooking || 
                        respuestaAgendamiento?.data?.codeBooking || 
                        null;
    
    console.log('🎟️ Código de reserva:', codeBooking);
    
    // ✅ GUARDAR DATOS DE RESERVA EN LOCALSTORAGE (para páginas de resultado)
    const datosReserva = {
      sede: this.sedeSeleccionada?.nombre || '',
      fecha: this.fechaSeleccionada 
        ? `${this.fechaSeleccionada.toLocaleDateString('es-CO')} - ${this.franjaSeleccionada}` 
        : '',
      monto: valorBase,
      placa: form.placa,
      nombre: form.nombre,
      codeBooking: codeBooking,
      invoiceId: invoiceId // ✅ Guardar invoice_id para registrar el pago después
    };
    
    localStorage.setItem('ultima_reserva', JSON.stringify(datosReserva));
    console.log('💾 Datos de reserva guardados en localStorage:', datosReserva);
    
    const paymentData: PaymentData = {
      invoiceId,
      
      servicio: {
        tipo: 'rtm',
        nombre: 'Revisión Técnico-Mecánica',
        descripcion: this.descripcionTipoSeleccionado
      },
      
      cliente: {
        nombre: form.nombre ?? '',
        documento: form.documento ?? '',
        tipoDocumento: form.tipoDocumento ?? 'cc',
        telefono: form.telefono ?? '',
        correo: form.correo ?? '',
        placa: form.placa ?? ''
      },
      
      reserva: {
        ciudad: this.nombreCiudadSeleccionada,
        sede: this.sedeSeleccionada?.nombre ?? '',
        direccion: this.sedeSeleccionada?.direccion,
        fecha: this.fechaSeleccionada!,
        horario: this.franjaSeleccionada!
      },
      
      valores: {
        valorBase,
        descuento: 0,
        total: valorBase
      },
      
      // ✅ METADATA ACTUALIZADA con codeBooking y modelo
      metadata: {
        codeBooking: codeBooking, // ✅ Para el label del pago
        modelo: this.datosRunt?.modelo || respuestaAgendamiento?.modelo || '',
        clase_vehiculo: this.datosRunt?.clase_vehiculo || '',
        tipo_servicio: this.datosRunt?.tipo_servicio || '',
        tipoVehiculo: this.selectedTipo(),
        subtipoVehiculo: this.selectedSubtipo()
      }
    };

    console.log('✅ Abriendo modal de pago con datos:', paymentData);

    this.modalSvc.close();

    setTimeout(() => {
      this.paymentSvc.open(paymentData);
    }, 300);
  }

  cerrar() {
    this.modalSvc.close();
  }

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

  private limpiarTextoHtml(texto: string): string {
    if (!texto) return '';
    return texto
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
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

  // ✅ 2. ORDENAR SEDES POR CERCANÍA
  private ordenarSedesPorCercania(sedes: any[]): any[] {
    if (!this.userLat || !this.userLon) return sedes;

    return sedes
      .map(sede => {
        // Extraer coordenadas de la sede (si están disponibles)
        let sedeLat = sede.lat || null;
        let sedeLon = sede.lng || sede.lon || null;

        // Si no hay coordenadas, intentar parsear de la descripción o usar geocodificación aproximada
        if (!sedeLat || !sedeLon) {
          // Bogotá centro por defecto si no hay coordenadas
          sedeLat = 4.7110;
          sedeLon = -74.0721;
        }

        // Calcular distancia usando Haversine
        const R = 6371; // Radio de la Tierra en km
        const dLat = (sedeLat - this.userLat!) * Math.PI / 180;
        const dLon = (sedeLon - this.userLon!) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.userLat! * Math.PI / 180) * Math.cos(sedeLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distancia = R * c;

        return { ...sede, distancia };
      })
      .sort((a, b) => a.distancia - b.distancia)
      .map(sede => {
        console.log(`📍 Sede: ${sede.name} - Distancia: ${sede.distancia.toFixed(2)} km`);
        return sede;
      });
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
    this.loadingUbicacion = false;

    this.fechaSeleccionada = null;
    this.horariosDisponibles = [];
    this.franjaSeleccionada = null;
    this.loadingHorarios = false;
    this.errorHorarios = null;
    this.isAgendando = false;
    this.errorAgendamiento = null;

    this.invoiceId = null;
    
    // ✅ Resetear datos RUNT
    this.datosRunt = null;
    this.precioRunt = null;
    this.mostrarDesde = true;

    // ✅ CORRECTO: Pre-llenar TODO excepto correo
    // El usuario ya ingresó estos datos en el paso 1 (modal inicial del RUNT)
    const datosIniciales = this.rtmSvc.getDatosIniciales();
    if (datosIniciales) {
      this.agendaForm.patchValue({
        placa: datosIniciales.placa || '',
        nombre: datosIniciales.nombre || '',      // ✅ Pre-llenar
        telefono: datosIniciales.telefono || '',  // ✅ Pre-llenar
        tipoDocumento: datosIniciales.docTipo || 'cc',
        documento: datosIniciales.documento || ''
        // ❌ correo: NO pre-llenar - el único campo que el usuario debe llenar aquí
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
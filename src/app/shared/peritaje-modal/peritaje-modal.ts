import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PeritajeModalService } from './peritaje-modal.service';
import { PagosService } from '../../../services/pagos.service';
import { RtmModalService } from '../rtm-modal/rtm-modal.service';

type Plan = 'diamante' | 'oro' | 'plata';
type Tab  = 'livianos' | 'pesados' | 'motos';
type MedioPago = 'mercado-pago';

interface SedeUi {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
  lat: number;
  lon: number;
  ciudad: string;
}

@Component({
  selector: 'app-peritaje-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './peritaje-modal.html',
  styleUrls: ['./peritaje-modal.css']
})
export class PeritajeModalComponent implements OnInit, OnDestroy {
  private modal = inject(PeritajeModalService);
  private fb = inject(FormBuilder);
  private pagosService = inject(PagosService);
  // 👇 mismo servicio que usas en RTM
  private rtmSvc = inject(RtmModalService);

  open = signal(false);
  sub?: Subscription;

  // ===============================
  // Estados principales
  // ===============================
  paso = signal<1 | 2 | 3 | 4>(1); // 1: Form, 2: Planes, 3: Sede, 4: Pago
  planActivo = signal<Plan>('diamante');
  tabActiva = signal<Tab>('livianos');

  mostrarComparador = signal(false);
  planComparado = signal<Plan | null>(null);

  // ===============================
  // Validadores personalizados
  // ===============================
  private placaValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.toUpperCase() || '';
    const placaRegex = /^[A-Z]{3}[0-9]{3}$/;
    if (!value) return null;
    if (!placaRegex.test(value)) return { placaInvalida: true };
    return null;
  }

  private soloLetrasValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    const letrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!value) return null;
    if (!letrasRegex.test(value)) return { soloLetras: true };
    return null;
  }

  private telefonoValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    const telefonoRegex = /^[0-9]{7,10}$/;
    if (!value) return null;
    if (!telefonoRegex.test(value)) return { telefonoInvalido: true };
    return null;
  }

  private documentoValidator = (control: AbstractControl): ValidationErrors | null => {
    const docTipo = this.form?.get('docTipo')?.value;
    const value = control.value || '';
    if (!value) return null;

    switch (docTipo) {
      case 'cc':
        if (!/^[0-9]{6,10}$/.test(value)) {
          return { documentoInvalido: { tipo: 'Cédula', formato: '6-10 dígitos' } };
        }
        break;
      case 'ce':
        if (!/^[0-9]{6,7}$/.test(value)) {
          return { documentoInvalido: { tipo: 'Cédula de extranjería', formato: '6-7 dígitos' } };
        }
        break;
      case 'nit':
        if (!/^[0-9]{9,10}$/.test(value)) {
          return { documentoInvalido: { tipo: 'NIT', formato: '9-10 dígitos' } };
        }
        break;
      case 'pas':
        if (!/^[A-Z0-9]{6,9}$/i.test(value)) {
          return { documentoInvalido: { tipo: 'Pasaporte', formato: '6-9 caracteres alfanuméricos' } };
        }
        break;
    }

    return null;
  };

  // ===============================
  // Formulario paso 1
  // ===============================
  form = this.fb.group({
    placa: ['', [Validators.required, this.placaValidator.bind(this)]],
    nombre: ['', [Validators.required, this.soloLetrasValidator.bind(this)]],
    telefono: ['', [Validators.required, this.telefonoValidator.bind(this)]],
    docTipo: ['cc', [Validators.required]],
    documento: ['', [Validators.required, this.documentoValidator.bind(this)]],
    aceptoDatos: [false, [Validators.requiredTrue]]
  });

  // ===============================
  // Fechas (demo)
  // ===============================
  fechaFactura = new Date();
  fechaVencimiento = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // ===============================
  // Precios
  // ===============================
  precios: Record<Plan, number> = {
    diamante: 390000,
    oro: 350000,
    plata: 320000
  };

  // ===============================
  // Paso 3 – Selección de Sede
  // ===============================
  sedes = signal<SedeUi[]>([]);
  sedeSeleccionada = signal<SedeUi | null>(null);
  cargandoSedes = signal<boolean>(false);

  usarUbicacion = signal<boolean>(false);
  ubicacionUsuario = signal<{ lat: number; lon: number } | null>(null);

  // Ciudades desde el API de RTM
  ciudadesDisponibles = signal<any[]>([]);
  ciudadFiltro = signal<string>('todas');

  // Lista de nombres de ciudad para el <select> del HTML
  ciudades = computed(() =>
    this.ciudadesDisponibles().map(c => c.name as string).sort()
  );

  // Sedes a mostrar:
  // - si usa ubicación → todas (ya ordenadas si quieres)
  // - si no → filtro por ciudad y máx 6
  sedesParaMostrar = computed(() => {
    const lista = this.sedes();
    if (!lista.length) return [];

    if (this.usarUbicacion() && this.ubicacionUsuario()) {
      return lista;
    }

    let filtradas = lista;
    if (this.ciudadFiltro() !== 'todas') {
      filtradas = lista.filter(s => s.ciudad === this.ciudadFiltro());
    }

    return filtradas.slice(0, 6);
  });

  // ===============================
  // Paso 4 – Pago
  // ===============================
  cupon = signal<string>('');
  descuento = signal<number>(0);
  medioPago = signal<MedioPago>('mercado-pago');
  aceptaCondiciones = signal<boolean>(false);

  procesandoPago = signal<boolean>(false);
  errorPago = signal<string | null>(null);
  pagoId = signal<string | null>(null);

  precioPlan = computed(() => this.precios[this.planActivo()]);
  totalConDescuento = computed(() => Math.max(this.precioPlan() - this.descuento(), 0));

  get nombrePlan(): string {
    const p = this.planActivo();
    if (p === 'diamante') return 'Combo Diamante';
    if (p === 'oro') return 'Combo Oro';
    return 'Combo Plata';
  }

  // ===============================
  // Getters errores
  // ===============================
  get placaError(): string | null {
    const control = this.form.get('placa');
    if (!control?.touched || !control.errors) return null;
    if (control.errors['required']) return 'La placa es obligatoria';
    if (control.errors['placaInvalida']) return 'Formato inválido. Debe ser 3 letras y 3 números (ej: ABC123)';
    return null;
  }

  get nombreError(): string | null {
    const control = this.form.get('nombre');
    if (!control?.touched || !control.errors) return null;
    if (control.errors['required']) return 'El nombre es obligatorio';
    if (control.errors['soloLetras']) return 'Solo se permiten letras y espacios';
    return null;
  }

  get telefonoError(): string | null {
    const control = this.form.get('telefono');
    if (!control?.touched || !control.errors) return null;
    if (control.errors['required']) return 'El teléfono es obligatorio';
    if (control.errors['telefonoInvalido']) return 'Debe ser un teléfono válido (7-10 dígitos)';
    return null;
  }

  get documentoError(): string | null {
    const control = this.form.get('documento');
    if (!control?.touched || !control.errors) return null;
    if (control.errors['required']) return 'El documento es obligatorio';
    if (control.errors['documentoInvalido']) {
      const error = control.errors['documentoInvalido'];
      return `${error.tipo} inválido. Formato: ${error.formato}`;
    }
    return null;
  }

  // ===============================
  // Ciclo de vida
  // ===============================
  ngOnInit(): void {
    this.sub = this.modal.open$.subscribe(isOpen => {
      this.open.set(isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        this.inicializarFormulario();
        this.cargarCiudades(); // 👈 traemos ciudades del API (mismo que RTM)
      }
    });

    this.form.get('docTipo')?.valueChanges.subscribe(() => {
      this.form.get('documento')?.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    document.body.style.overflow = '';
  }

  private inicializarFormulario(): void {
    this.form.reset({
      placa: '',
      nombre: '',
      telefono: '',
      docTipo: 'cc',
      documento: '',
      aceptoDatos: false
    });

    this.paso.set(1);
    this.sedeSeleccionada.set(null);
    this.usarUbicacion.set(false);
    this.ubicacionUsuario.set(null);
    this.ciudadFiltro.set('todas');
  }

  cerrar() {
    this.modal.close();
  }

  // ===============================
  // Inputs formateo
  // ===============================
  onPlacaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length > 6) value = value.substring(0, 6);
    this.form.patchValue({ placa: value }, { emitEvent: false });
    input.value = value;
  }

  onNombreInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.form.patchValue({ nombre: value }, { emitEvent: false });
    input.value = value;
  }

  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > 10) value = value.substring(0, 10);
    this.form.patchValue({ telefono: value }, { emitEvent: false });
    input.value = value;
  }

  onDocumentoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    const docTipo = this.form.get('docTipo')?.value;

    if (docTipo === 'pas') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (value.length > 9) value = value.substring(0, 9);
    } else {
      value = value.replace(/[^0-9]/g, '');
      switch (docTipo) {
        case 'cc':
        case 'nit':
          if (value.length > 10) value = value.substring(0, 10);
          break;
        case 'ce':
          if (value.length > 7) value = value.substring(0, 7);
          break;
      }
    }

    this.form.patchValue({ documento: value }, { emitEvent: false });
    input.value = value;
  }

  // ===============================
  // Paso 1 → Paso 2
  // ===============================
  consultar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.warn('⚠️ Formulario inválido', this.form.errors);
      return;
    }

    console.log('✅ Consultando peritaje con datos:', this.form.value);
    this.paso.set(2);
  }

  volverAPaso1() {
    this.paso.set(1);
  }

  // ===============================
  // Paso 2 → Paso 3 (Selección de sede)
  // ===============================
  irASeleccionSede() {
    this.paso.set(3);

    const ciudades = this.ciudadesDisponibles();
    if (!ciudades.length) {
      console.warn('⚠️ No hay ciudades aún, intenta de nuevo cuando carguen');
      return;
    }

    // Ciudad por defecto si no hay filtro: Bogotá si existe, sino la primera
    let ciudadDefault = this.ciudadFiltro();
    if (ciudadDefault === 'todas') {
      const bogota = ciudades.find(c => (c.name as string).toLowerCase().includes('bogotá'));
      ciudadDefault = bogota?.name || ciudades[0].name;
    }

    this.ciudadFiltro.set(ciudadDefault);
    this.cargarSedes(ciudadDefault);
  }

  // ===============================
  // Ciudades / Sedes (API RTM)
  // ===============================
  private cargarCiudades() {
    if (this.ciudadesDisponibles().length > 0) return;

    this.rtmSvc.obtenerCiudades().subscribe({
      next: (resp) => {
        console.log('✅ obtenerCiudades (peritaje):', resp);
        const data = resp?.data ?? [];
        this.ciudadesDisponibles.set(data);
      },
      error: (err) => {
        console.error('❌ Error al cargar ciudades en peritaje:', err);
      }
    });
  }

  private cargarSedes(nombreCiudad: string) {
    if (!nombreCiudad) return;

    this.cargandoSedes.set(true);
    this.sedeSeleccionada.set(null);

    this.rtmSvc.obtenerProveedores(nombreCiudad).subscribe({
      next: (resp) => {
        console.log('✅ obtenerProveedores (peritaje) para', nombreCiudad, resp);
        const data = resp?.data ?? [];

        const sedesAdaptadas: SedeUi[] = data.map((p: any) => ({
          id: p.id,
          nombre: p.name,
          direccion: (p.address || p.address1 || p.direccion || '').toString(),
          telefono: (p.phone || p.telefono || '').toString(),
          lat: p.lat != null ? Number(p.lat) : 0,
          lon: p.lng != null ? Number(p.lng) : 0,
          ciudad: nombreCiudad
        }));

        this.sedes.set(sedesAdaptadas);
        this.cargandoSedes.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar sedes en peritaje:', err);
        this.cargandoSedes.set(false);
      }
    });
  }

  cambiarCiudadFiltro(ciudad: string) {
    this.ciudadFiltro.set(ciudad);

    if (!this.usarUbicacion()) {
      if (ciudad === 'todas') {
        // dejar las sedes ya cargadas; si quieres, podrías cargar otra ciudad por defecto aquí
        return;
      }
      this.cargarSedes(ciudad);
    }
  }

  // Detectar ubicación: ordenar sedes actuales por cercanía
  detectarUbicacion() {
    this.usarUbicacion.set(true);
    console.log('🛰 Solicitando ubicación del usuario...');

    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      this.usarUbicacion.set(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        this.ubicacionUsuario.set(coords);
        console.log('📍 Ubicación detectada:', coords);

        // Solo reordenamos las sedes que ya tenemos cargadas
        this.ordenarSedesPorCercania(coords);
      },
      (error) => {
        console.error('❌ Error al obtener ubicación:', error);
        alert('No se pudo obtener tu ubicación. Por favor selecciona una sede manualmente.');
        this.usarUbicacion.set(false);
      }
    );
  }

  private ordenarSedesPorCercania(coords: { lat: number; lon: number }) {
    const sedesOrdenadas = [...this.sedes()].sort((a, b) => {
      const distA = this.calcularDistancia(coords.lat, coords.lon, a.lat, a.lon);
      const distB = this.calcularDistancia(coords.lat, coords.lon, b.lat, b.lon);
      return distA - distB;
    });
    this.sedes.set(sedesOrdenadas);
    console.log('📍 Sedes ordenadas por cercanía');
  }

  // Haversine simplificado
  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  seleccionarSede(sede: SedeUi) {
    this.sedeSeleccionada.set(sede);
    console.log('✅ Sede seleccionada (peritaje):', sede.nombre);
  }

  volverAPlanes() {
    this.paso.set(2);
  }

  irAPago() {
    if (!this.sedeSeleccionada()) {
      alert('Por favor selecciona una sede');
      return;
    }
    this.paso.set(4);
  }

  volverASedes() {
    this.paso.set(3);
  }

  // ===============================
  // Planes / Tabs
  // ===============================
  cambiarPlan(plan: Plan) {
    this.planActivo.set(plan);
  }

  cambiarTab(tab: Tab) {
    this.tabActiva.set(tab);
  }

  get imagenVehiculo(): string {
    switch (this.planActivo()) {
      case 'oro':   return 'assets/oro.png';
      case 'plata': return 'assets/plata.png';
      default:      return 'assets/diamante.png';
    }
  }

  // ===============================
  // Agendar → selección de sede
  // ===============================
  agendarPeritaje() {
    this.irASeleccionSede();
  }

  cerrarComparador(irAPago = false) {
    this.mostrarComparador.set(false);
    if (irAPago) {
      this.irAPago();
    }
  }

  volverASeleccionPlan() {
    this.paso.set(2);
  }

  // ===============================
  // Paso 4 – Pago
  // ===============================
  aplicarCupon() {
    const code = this.cupon().trim().toUpperCase();
    if (code === 'AUTOMAS10') {
      this.descuento.set(Math.round(this.precioPlan() * 0.1));
    } else {
      this.descuento.set(0);
    }
  }

  seleccionarMedioPago(m: MedioPago) {
    this.medioPago.set(m);
  }

  private readonly MODO_TESTING = false;

  avanzarPago() {
    if (!this.aceptaCondiciones()) {
      alert('Debes aceptar las condiciones antes de continuar');
      return;
    }

    if (!this.medioPago()) {
      alert('Por favor selecciona un método de pago');
      return;
    }

    if (this.MODO_TESTING) {
      console.warn('⚠️ MODO TESTING ACTIVADO - No se realiza pago real');
      this.procesandoPago.set(true);
      setTimeout(() => {
        alert(`✅ [MODO TEST] Pago simulado:\n\nPlan: ${this.nombrePlan}\nValor: $${this.totalConDescuento()}\n\n(Cambia MODO_TESTING a false para pago real)`);
        this.procesandoPago.set(false);
      }, 2000);
      return;
    }

    this.procesandoPago.set(true);
    this.errorPago.set(null);

const formData = this.form.value;
const sedeId = this.sedeSeleccionada()?.id ?? null;

// 👇 ajustamos tipos para que coincidan con el servicio
const params = {
  proyecto: 'pagina_web',
  medio_pago: 'mercadopago',
  servicio_label: `Peritaje ${this.nombrePlan}`,
  valor: this.totalConDescuento(),
  sede: sedeId !== null ? String(sedeId) : null,   // <- string | null
  // servicio_tipovehiculo: null, // si luego lo necesitas, también como string | null
  placa_vehiculo: formData.placa?.toUpperCase() || null
};


    console.log('💳 Iniciando pago con datos:', {
      plan: this.nombrePlan,
      valor: this.totalConDescuento(),
      usuario: formData.nombre,
      placa: formData.placa
    });

    console.log('📤 Payload completo para API:', JSON.stringify(params, null, 2));

    this.pagosService.generarLinkPago(params).subscribe({
      next: (response: any) => {
        console.log('✅ Link de pago generado:', response);

        this.pagoId.set(response.pago_id);

        if (response.payment_link) {
          console.log('🔗 Redirigiendo a:', response.payment_link);
          window.location.href = response.payment_link;
        } else if (response.pago_id) {
          console.log('⏳ Link no disponible aún, verificando estado del pago...');
          this.verificarYRedirigir(response.pago_id);
        } else {
          this.errorPago.set('No se pudo generar el link de pago. Intenta nuevamente.');
          this.procesandoPago.set(false);
        }
      },
      error: (err) => {
        console.error('❌ Error al generar pago:', err);

        let mensaje = 'Error al procesar el pago. Por favor intenta nuevamente.';

        if (err.status === 400) {
          const errorDetail = err.error?.sede || err.error?.servicio_tipovehiculo;

          if (errorDetail) {
            mensaje = 'El sistema de pagos requiere información adicional. Por favor contacta a soporte.';
          } else if (err.error && err.error.message) {
            mensaje = err.error.message;
          } else if (err.error && typeof err.error === 'string') {
            mensaje = err.error;
          } else if (err.error && err.error.detail) {
            mensaje = err.error.detail;
          } else {
            mensaje = 'Datos inválidos. Verifica la información e intenta nuevamente.';
          }
        } else if (err.status === 404) {
          mensaje = 'Servicio de pago no disponible. Contacta a soporte.';
        } else if (err.status === 401) {
          mensaje = 'Error de autenticación. Contacta a soporte.';
        }

        this.errorPago.set(mensaje);
        this.procesandoPago.set(false);
      }
    });
  }

  private verificarYRedirigir(pagoId: string, intentos: number = 0) {
    const MAX_INTENTOS = 10;
    const DELAY = 1000;

    if (intentos >= MAX_INTENTOS) {
      console.error('❌ Timeout: No se pudo obtener el link de pago después de varios intentos');
      this.errorPago.set(
        'El sistema de pagos está teniendo problemas técnicos. ' +
        'Por favor contacta a soporte con este ID de pago: ' + pagoId
      );
      this.procesandoPago.set(false);
      return;
    }

    console.log(`🔄 Intento ${intentos + 1}/${MAX_INTENTOS} - Verificando estado del pago...`);

    this.pagosService.verificarEstadoPago(pagoId).subscribe({
      next: (estado: any) => {
        console.log('📊 Estado del pago:', estado);

        if (estado.detalles_gateway && estado.detalles_gateway.error) {
          console.error('❌ Error en gateway:', estado.detalles_gateway.error);
          this.errorPago.set(
            'Error al procesar el pago con Mercado Pago: ' +
            estado.detalles_gateway.error +
            '. Por favor contacta a soporte.'
          );
          this.procesandoPago.set(false);
          return;
        }

        const link = estado.detalles_gateway?.init_point ||
                     estado.detalles_gateway?.sandbox_init_point ||
                     estado.payment_link;

        if (link) {
          console.log('✅ Link de pago encontrado:', link);
          window.location.href = link;
        } else {
          console.log('⏳ Link aún no disponible, reintentando en 1 segundo...');
          setTimeout(() => {
            this.verificarYRedirigir(pagoId, intentos + 1);
          }, DELAY);
        }
      },
      error: (err) => {
        console.error('❌ Error al verificar estado:', err);

        if (intentos < MAX_INTENTOS) {
          setTimeout(() => {
            this.verificarYRedirigir(pagoId, intentos + 1);
          }, DELAY);
        } else {
          this.errorPago.set(
            'No se pudo verificar el estado del pago. ' +
            'Por favor contacta a soporte con este ID: ' + pagoId
          );
          this.procesandoPago.set(false);
        }
      }
    });
  }
}

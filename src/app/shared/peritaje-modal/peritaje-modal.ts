import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PeritajeModalService } from './peritaje-modal.service';
import { ConsultaPeritajeModalService } from '../consulta-peritaje-modal/consulta-peritaje-modal.service';
import { PagosService } from '../../../services/pagos.service';
import { RtmModalService } from '../rtm-modal/rtm-modal.service';

type Plan = 'diamante' | 'oro' | 'plata';
type Tab  = 'livianos' | 'pesados' | 'motos' | 'domicilio';
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
  private consultaPeritajeSvc = inject(ConsultaPeritajeModalService);
  private fb = inject(FormBuilder);
  private pagosService = inject(PagosService);
  private rtmSvc = inject(RtmModalService);

  open = signal(false);
  sub?: Subscription;

  // ===============================
  // Estados principales
  // ===============================
  paso = signal<1 | 2 | 3 | 4>(1);
  planActivo = signal<Plan>('diamante');
  tabActiva = signal<Tab>('livianos');

  mostrarComparador = signal(false);
  planComparado = signal<Plan | null>(null);

  // PERITAJE: Estados para consulta RUNT y servicios
  consultandoRunt = signal(false);
  errorRunt = signal<string | null>(null);
  datosRunt = signal<any | null>(null);
  serviciosDisponibles = signal<any[]>([]);

  // ===============================
  // Validadores personalizados
  // ===============================
  private placaValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value?.toUpperCase() || '';
    
    // Formato carro: 3 letras + 3 números (ABC123)
    const placaCarroRegex = /^[A-Z]{3}[0-9]{3}$/;
    
    // Formato moto: 3 letras + 2 números + 1 letra (ABC12D)
    const placaMotoRegex = /^[A-Z]{3}[0-9]{2}[A-Z]$/;
    
    if (!value) return null;
    
    // Validar si cumple alguno de los dos formatos
    if (!placaCarroRegex.test(value) && !placaMotoRegex.test(value)) {
      return { placaInvalida: true };
    }
    
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
  // Precios (pueden venir del RUNT)
  // ===============================
  precios: Record<Plan, number> = {
    diamante: 390000,
    oro: 350000,
    plata: 320000
  };

  // ===============================
  // Paso 3 – Selección de Sede (YA NO SE USA EN PERITAJE)
  // ===============================
  sedes = signal<SedeUi[]>([]);
  sedeSeleccionada = signal<SedeUi | null>(null);
  cargandoSedes = signal<boolean>(false);

  usarUbicacion = signal<boolean>(false);
  ubicacionUsuario = signal<{ lat: number; lon: number } | null>(null);

  ciudadesDisponibles = signal<any[]>([]);
  ciudadFiltro = signal<string>('todas');

  ciudades = computed(() =>
    this.ciudadesDisponibles().map(c => c.name as string).sort()
  );

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
  // Paso 4 – Pago (YA NO SE USA - VA A CONSULTA-PERITAJE-MODAL)
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

  // PERITAJE: Determinar tab según clase de vehículo o tipo de servicio
  get tabCorrecta(): 'livianos' | 'pesados' | 'motos' | 'domicilio' {
    const datos = this.datosRunt();
    const servicios = this.serviciosDisponibles();
    
    // Verificar si es servicio a domicilio
    const esADomicilio = servicios.some((s: any) => {
      const nombre = (s.name || '').toLowerCase();
      return nombre.includes('domicilio') || nombre.includes('a domicilio');
    });
    
    if (esADomicilio) {
      console.log('🏠 Servicio a domicilio detectado');
      return 'domicilio';
    }
    
    if (!datos) return 'livianos';
    
    const clase = (datos.clase_vehiculo || '').toUpperCase();
    
    console.log('🚗 Determinando tab para clase:', clase);
    
    if (clase.includes('MOTO') || clase.includes('MOTOCICLETA')) {
      return 'motos';
    } else if (clase.includes('PESADO') || clase.includes('BUS')) {
      return 'pesados';
    } else {
      return 'livianos';
    }
  }

  // PERITAJE: Verificar qué planes están disponibles
  get planesDisponibles() {
    const servicios = this.serviciosDisponibles();
    const planes = {
      diamante: false,
      oro: false,
      plata: false
    };

    servicios.forEach((servicio: any) => {
      const nombre = (servicio.name || '').toLowerCase();
      
      if (nombre.includes('diamante')) {
        planes.diamante = true;
      } else if (nombre.includes('oro')) {
        planes.oro = true;
      } else if (nombre.includes('plata')) {
        planes.plata = true;
      }
    });

    return planes;
  }

  // PERITAJE: Contar cuántos planes están disponibles
  get cantidadPlanesDisponibles(): number {
    const planes = this.planesDisponibles;
    return (planes.diamante ? 1 : 0) + (planes.oro ? 1 : 0) + (planes.plata ? 1 : 0);
  }

  // PERITAJE: Descripción del vehículo desde RUNT
  get descripcionVehiculo(): string {
    const datos = this.datosRunt();
    if (!datos) return '';
    
    const formData = this.form.value;
    const placa = formData.placa?.toUpperCase() || '';
    
    const marca = datos.marca || '';
    const linea = datos.linea || '';
    const modelo = datos.modelo || '';
    const claseVehiculo = datos.clase_vehiculo || '';
    const tipoServicio = datos.tipo_servicio || '';
    
    let descripcion = '';
    
    if (marca && linea) {
      descripcion = `${marca} ${linea}`;
    } else if (marca) {
      descripcion = marca;
    } else {
      descripcion = claseVehiculo || 'Vehículo';
    }
    
    if (modelo) {
      descripcion += ` ${modelo}`;
    }
    
    descripcion += `, placa [${placa}]`;
    
    if (claseVehiculo || tipoServicio) {
      descripcion += ', clasificado como';
      if (claseVehiculo) descripcion += ` ${claseVehiculo}`;
      if (tipoServicio) descripcion += ` ${tipoServicio}`;
    }
    
    return descripcion;
  }

  // ===============================
  // Getters errores
  // ===============================
  get placaError(): string | null {
    const control = this.form.get('placa');
    if (!control?.touched || !control.errors) return null;
    if (control.errors['required']) return 'La placa es obligatoria';
    if (control.errors['placaInvalida']) return 'Formato inválido. Carros: 3 letras y 3 números (ABC123) | Motos: 3 letras, 2 números y 1 letra (ABC12D)';
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
        this.precargarServiciosYDatosRunt();
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
    this.consultandoRunt.set(false);
    this.errorRunt.set(null);
    this.datosRunt.set(null);
    this.serviciosDisponibles.set([]);
  }

  // PERITAJE: Pre-cargar servicios y datos del RUNT
  private precargarServiciosYDatosRunt() {
    const datosIniciales = this.modal.getDatosIniciales();
    if (!datosIniciales) {
      console.warn('⚠️ No hay datos iniciales de peritaje');
      return;
    }

    const servicios = this.modal.serviciosDisponibles();
    if (servicios && servicios.length > 0) {
      this.serviciosDisponibles.set(servicios);
      console.log('✅ Servicios pre-cargados:', servicios);
    }

    const datosRunt = this.modal.getDatosRunt();
    if (datosRunt) {
      this.datosRunt.set(datosRunt);
      console.log('✅ Datos RUNT pre-cargados:', datosRunt);
      
      if (datosRunt.price) {
        this.precios.diamante = Math.round(datosRunt.price * 1.2);
        this.precios.oro = datosRunt.price;
        this.precios.plata = Math.round(datosRunt.price * 0.8);
      }
    }
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
  // PERITAJE: Paso 1 → Consultar RUNT → Obtener Servicios → Paso 2
  // ===============================
  consultar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      console.warn('⚠️ Formulario inválido', this.form.errors);
      return;
    }

    const formData = this.form.value;
    
    this.modal.setDatosIniciales({
      placa: formData.placa || '',
      nombre: formData.nombre || '',
      telefono: formData.telefono || '',
      docTipo: formData.docTipo || 'cc',
      documento: formData.documento || ''
    });

    console.log('🔍 Consultando RUNT con datos:', formData);
    
    this.consultandoRunt.set(true);
    this.errorRunt.set(null);

    const tipoIdentificacion = this.mapTipoIdentificacion(formData.docTipo || 'cc');

    this.modal.consultarVehiculo({
      placa: formData.placa?.toUpperCase() || '',
      tipo_identificacion: tipoIdentificacion,
      identificacion: formData.documento || ''
    }).subscribe({
      next: (respRunt) => {
        console.log('✅ Respuesta RUNT oficial:', respRunt);
        
        if (!respRunt.data) {
          this.errorRunt.set('No se encontró información del vehículo en el RUNT.');
          this.consultandoRunt.set(false);
          return;
        }

        const dataVehiculo = respRunt.data;
        console.log('📦 Datos del vehículo:', dataVehiculo);

        const datosRunt = {
          marca: dataVehiculo.marca || '',
          linea: dataVehiculo.linea || '',
          modelo: dataVehiculo.modelo || '',
          clase_vehiculo: dataVehiculo.claseVehiculo || 'AUTOMOVIL',
          tipo_servicio: dataVehiculo.tipoServicio || 'Particular',
          tipo_combustible: dataVehiculo.tipoCombustible || 'GASOLINA',
          color: dataVehiculo.color || '',
          placa: dataVehiculo.noPlaca || formData.placa?.toUpperCase(),
          cilindraje: dataVehiculo.cilindraje || '0'  // 🔥 NUEVO: Agregar cilindraje
        };

        console.log('📊 Datos del RUNT extraídos:', datosRunt);

        this.modal.setDatosRunt(datosRunt);
        this.datosRunt.set(datosRunt);

        this.obtenerServiciosDisponibles(datosRunt);
      },
      error: (err) => {
        console.error('❌ Error al consultar RUNT:', err);
        
        let mensajeError = 'No se pudo consultar el vehículo. ';
        
        if (err.status === 400) {
          mensajeError += 'Verifica que los datos ingresados sean correctos.';
        } else if (err.status === 404) {
          mensajeError += 'No se encontró información del vehículo en el RUNT.';
        } else {
          mensajeError += 'Intenta nuevamente más tarde.';
        }
        
        this.errorRunt.set(mensajeError);
        this.consultandoRunt.set(false);
      }
    });
  }

  // PERITAJE: Obtener servicios según datos del RUNT
  private obtenerServiciosDisponibles(datosRunt: any) {
    const formData = this.form.value;

    console.log('🔍 Obteniendo servicios de peritaje...');

    this.modal.obtenerServicios({
      grupo_servicio: 'Peritaje presencial',
      servicios_por_placa: true,
      placa: formData.placa?.toUpperCase() || '',
      cliente: 'pagina_web',
      tipo_combustible: datosRunt.tipo_combustible,
      modelo: datosRunt.modelo,
      tipo_servicio: datosRunt.tipo_servicio,
      clase_vehiculo: datosRunt.clase_vehiculo
    }).subscribe({
      next: (respServicios) => {
        console.log('✅ Servicios disponibles:', respServicios);
        
        const servicios = respServicios?.data || [];
        
        if (servicios.length === 0) {
          this.errorRunt.set('No se encontraron servicios de peritaje disponibles para este vehículo.');
          this.consultandoRunt.set(false);
          return;
        }

        this.serviciosDisponibles.set(servicios);
        this.modal.serviciosDisponibles.set(servicios);

        servicios.forEach((servicio: any) => {
          const nombre = (servicio.name || '').toLowerCase();
          const precio = servicio.price || 0;
          
          if (nombre.includes('diamante')) {
            this.precios.diamante = precio;
          } else if (nombre.includes('oro')) {
            this.precios.oro = precio;
          } else if (nombre.includes('plata')) {
            this.precios.plata = precio;
          }
        });

        console.log('💎 Precios actualizados:', this.precios);

        if (servicios.length > 0) {
          const primerServicio = servicios[0].name.toLowerCase();
          
          if (primerServicio.includes('diamante')) {
            this.cambiarPlan('diamante');
          } else if (primerServicio.includes('oro')) {
            this.cambiarPlan('oro');
          } else if (primerServicio.includes('plata')) {
            this.cambiarPlan('plata');
          }
        }

        this.tabActiva.set(this.tabCorrecta);

        this.consultandoRunt.set(false);
        this.paso.set(2);
      },
      error: (err) => {
        console.error('❌ Error al obtener servicios:', err);
        this.errorRunt.set('No se pudieron cargar los servicios disponibles.');
        this.consultandoRunt.set(false);
      }
    });
  }

  private mapTipoIdentificacion(codigo: string): string {
    switch (codigo) {
      case 'ce': return 'Cedula de Extranjeria';
      case 'nit': return 'NIT';
      case 'pas': return 'Pasaporte';
      case 'cc':
      default: return 'Cedula de Ciudadania';
    }
  }

  volverAPaso1() {
    this.paso.set(1);
  }

  // ===============================
  // 🔥 PERITAJE: Paso 2 → GUARDAR EN LOCALSTORAGE → Abrir consulta-peritaje-modal
  // ===============================
  agendarPeritaje() {
    console.log('🎯 INICIANDO agendarPeritaje()');
    console.log('📦 Plan activo:', this.planActivo());
    console.log('📦 Servicios disponibles:', this.serviciosDisponibles());

    const servicioSeleccionado = this.serviciosDisponibles().find((s: any) => {
      const nombre = (s.name || '').toLowerCase();
      const plan = this.planActivo();
      return nombre.includes(plan);
    });

    if (!servicioSeleccionado) {
      console.error('❌ No se encontró el servicio seleccionado');
      alert('No se encontró el servicio seleccionado');
      return;
    }

    console.log('✅ Servicio seleccionado:', servicioSeleccionado.name);
    console.log('💰 Precio:', servicioSeleccionado.price);

    // 🔥 GUARDAR DATOS EN LOCALSTORAGE ANTES DE ABRIR EL MODAL
    const formData = this.form.value;
    const datosFormulario = {
      placa: formData.placa || '',
      nombre: formData.nombre || '',
      telefono: formData.telefono || '',
      tipoDocumento: formData.docTipo || '',
      documento: formData.documento || ''
    };
    
    console.log('💾 Guardando en localStorage:', datosFormulario);
    localStorage.setItem('peritaje_datos_formulario', JSON.stringify(datosFormulario));

    // Guardar servicio seleccionado
    this.consultaPeritajeSvc.setServicios([servicioSeleccionado]);
    
    // Pasar ciudades al servicio de consulta
    if (this.ciudadesDisponibles().length > 0) {
      console.log('🌆 Guardando ciudades:', this.ciudadesDisponibles().length);
      this.consultaPeritajeSvc.setCiudades(this.ciudadesDisponibles());
    }

    // Cerrar modal actual
    console.log('🚪 Cerrando modal actual...');
    this.modal.close();

    // Abrir modal de consulta después de un delay
    setTimeout(() => {
      console.log('🚀 Abriendo consulta-peritaje-modal...');
      this.consultaPeritajeSvc.open();
    }, 300);
  }

  // ===============================
  // Planes / Tabs (SOLO VISUAL)
  // ===============================
  cambiarPlan(plan: Plan) {
    this.planActivo.set(plan);
  }

  cambiarTab(tab: Tab) {
    this.tabActiva.set(tab);
  }

  // 🔥 MODIFICADO: Imágenes personalizadas según tipo de vehículo
  get imagenVehiculo(): string {
    const datos = this.datosRunt();
    const plan = this.planActivo();
    
    if (!datos) {
      // Si no hay datos del RUNT, usar imágenes por defecto (livianos)
      switch (plan) {
        case 'oro':   return 'assets/oro.png';
        case 'plata': return 'assets/plata.png';
        default:      return 'assets/diamante.png';
      }
    }

    const claseVehiculo = (datos.clase_vehiculo || '').toUpperCase();
    const cilindraje = parseInt(datos.cilindraje || '0', 10);
    
    console.log('🖼️ Determinando imagen:', { claseVehiculo, cilindraje, plan });

    // 🏍️ MOTOCICLETAS
    if (claseVehiculo.includes('MOTO') || claseVehiculo.includes('MOTOCICLETA')) {
      if (cilindraje <= 229) {
        // Motos urbanas (≤ 229cc) - No tienen plata
        return plan === 'diamante' ? 'assets/urbana-diamante.png' : 'assets/urbana-oro.png';
      } else {
        // Motos grandes (≥ 230cc) - No tienen plata
        return plan === 'diamante' ? 'assets/moto-diamante.png' : 'assets/moto-oro.png';
      }
    }
    
    // 🚛 VEHÍCULOS PESADOS
    if (claseVehiculo.includes('PESADO') || claseVehiculo.includes('BUS') || claseVehiculo.includes('CAMION')) {
      switch (plan) {
        case 'oro':      return 'assets/pesado-oro.png';
        case 'plata':    return 'assets/pesado-plata.png';
        case 'diamante': return 'assets/pesado-diamante.png';
        default:         return 'assets/pesado-diamante.png';
      }
    }
    
    // 🚗 VEHÍCULOS LIVIANOS (por defecto)
    switch (plan) {
      case 'oro':   return 'assets/oro.png';
      case 'plata': return 'assets/plata.png';
      default:      return 'assets/diamante.png';
    }
  }

  // ===============================
  // MÉTODOS NO USADOS (CONSERVADOS POR COMPATIBILIDAD)
  // ===============================
  irASeleccionSede() {
    this.agendarPeritaje();
  }

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
    console.warn('⚠️ cargarSedes() ya no se usa en el flujo de peritaje');
  }

  cambiarCiudadFiltro(ciudad: string) {
    this.ciudadFiltro.set(ciudad);
  }

  detectarUbicacion() {
    console.warn('⚠️ detectarUbicacion() ya no se usa en el flujo de peritaje');
  }

  private ordenarSedesPorCercania(coords: { lat: number; lon: number }) {
    // Ya no se usa
  }

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
  }

  volverAPlanes() {
    this.paso.set(2);
  }

  irAPago() {
    console.warn('⚠️ irAPago() ya no se usa en el flujo de peritaje');
  }

  volverASedes() {
    this.paso.set(3);
  }

  cerrarComparador(irAPago = false) {
    this.mostrarComparador.set(false);
    if (irAPago) {
      this.agendarPeritaje();
    }
  }

  volverASeleccionPlan() {
    this.paso.set(2);
  }

  aplicarCupon() {
    // Ya no se usa
  }

  seleccionarMedioPago(m: MedioPago) {
    this.medioPago.set(m);
  }

  avanzarPago() {
    console.warn('⚠️ avanzarPago() ya no se usa en el flujo de peritaje');
  }

  private verificarYRedirigir(pagoId: string, intentos: number = 0) {
    // Ya no se usa
  }
}
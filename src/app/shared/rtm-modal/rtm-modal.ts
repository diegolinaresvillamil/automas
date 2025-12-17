import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RtmModalService } from './rtm-modal.service';
import { SedesTarifasModalService } from '../sedes-tarifas-modal/sedes-tarifas-modal.service';

@Component({
  selector: 'app-rtm-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rtm-modal.html',
  styleUrls: ['./rtm-modal.css']
})
export class RtmModalComponent implements OnInit, OnDestroy {
  private modal = inject(RtmModalService);
  private sedesModalSvc = inject(SedesTarifasModalService);
  private fb = inject(FormBuilder);

  open = signal(false);
  paso = signal<1 | 2>(1);

  private sub?: Subscription;
  private placaSub?: Subscription;
  private docTipoSub?: Subscription;
  private docValorSub?: Subscription;
  private nombreSub?: Subscription;
  private telSub?: Subscription;

  ciudades = signal<any[]>([]);
  loadingCiudades = signal(false);

  // 🔹 Estado para la pantalla 2
  vehiculoNombre = signal<string | null>(null);
  placaMostrada = signal<string | null>(null);
  fechaVenceRtm = signal<string | null>(null);
  
  // 🆕 Estados para consulta RUNT
  isConsultando = signal(false);
  datosRunt = signal<any | null>(null);
  vieneDeRunt = signal(false);

  form = this.fb.group({
    placa: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Z]{3}\d{3}$/)
      ]
    ],
    nombre: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/)
      ]
    ],
    telefono: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]
    ],
    docTipo: ['cc', [Validators.required]],
    documento: ['', [Validators.required]],
    aceptoDatos: [false, [Validators.requiredTrue]]
  });

  ngOnInit(): void {
    this.configurarNormalizacionPlaca();
    this.configurarNormalizacionNombre();
    this.configurarNormalizacionTelefono();
    this.configurarDocumentoDinamico();

    this.sub = this.modal.open$.subscribe(isOpen => {
      this.open.set(isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        this.cargarCiudades();
      } else {
        this.paso.set(1);
        this.resetearDatosRunt();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.placaSub?.unsubscribe();
    this.docTipoSub?.unsubscribe();
    this.docValorSub?.unsubscribe();
    this.nombreSub?.unsubscribe();
    this.telSub?.unsubscribe();
    document.body.style.overflow = '';
  }

  // ================= NORMALIZACIONES =================

  private configurarNormalizacionPlaca() {
    const placaCtrl = this.form.get('placa');
    if (!placaCtrl) return;

    this.placaSub = placaCtrl.valueChanges.subscribe(value => {
      if (typeof value !== 'string') return;
      let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length > 6) cleaned = cleaned.slice(0, 6);
      if (cleaned !== value) {
        placaCtrl.setValue(cleaned, { emitEvent: false });
      }
    });
  }

  private configurarNormalizacionNombre() {
    const nombreCtrl = this.form.get('nombre');
    if (!nombreCtrl) return;

    this.nombreSub = nombreCtrl.valueChanges.subscribe(value => {
      if (typeof value !== 'string') return;
      let cleaned = value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, '');
      cleaned = cleaned.replace(/\s+/g, ' ');
      if (cleaned !== value) {
        nombreCtrl.setValue(cleaned, { emitEvent: false });
      }
    });
  }

  private configurarNormalizacionTelefono() {
    const telCtrl = this.form.get('telefono');
    if (!telCtrl) return;

    this.telSub = telCtrl.valueChanges.subscribe(value => {
      if (typeof value !== 'string') return;
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
      if (cleaned !== value) {
        telCtrl.setValue(cleaned, { emitEvent: false });
      }
    });
  }

  private configurarDocumentoDinamico() {
    const docTipoCtrl = this.form.get('docTipo');
    const docCtrl = this.form.get('documento');

    if (!docTipoCtrl || !docCtrl) return;

    const aplicarValidadores = (tipo: string | null) => {
      const validators: any[] = [Validators.required];

      switch (tipo) {
        case 'cc':
          validators.push(Validators.pattern(/^\d{10}$/));
          break;
        case 'ce':
          validators.push(Validators.pattern(/^\d{6,15}$/));
          break;
        case 'nit':
          validators.push(Validators.pattern(/^\d{9,10}$/));
          break;
        case 'pas':
          validators.push(Validators.pattern(/^[A-Za-z0-9]{6,15}$/));
          break;
        default:
          validators.push(Validators.maxLength(20));
      }

      docCtrl.setValidators(validators);
      docCtrl.updateValueAndValidity({ emitEvent: false });
    };

    aplicarValidadores(docTipoCtrl.value);

    this.docTipoSub = docTipoCtrl.valueChanges.subscribe(tipo => {
      aplicarValidadores(tipo);
      docCtrl.setValue('', { emitEvent: false });
    });

    this.docValorSub = docCtrl.valueChanges.subscribe(value => {
      if (typeof value !== 'string') return;
      const tipo = docTipoCtrl.value;

      let cleaned = value;

      switch (tipo) {
        case 'cc':
          cleaned = value.replace(/\D/g, '');
          if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
          break;
        case 'ce':
          cleaned = value.replace(/\D/g, '');
          if (cleaned.length > 15) cleaned = cleaned.slice(0, 15);
          break;
        case 'nit':
          cleaned = value.replace(/\D/g, '');
          if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
          break;
        case 'pas':
          cleaned = value.replace(/[^A-Za-z0-9]/g, '');
          if (cleaned.length > 15) cleaned = cleaned.slice(0, 15);
          break;
        default:
          cleaned = value.replace(/\s+/g, ' ');
      }

      if (cleaned !== value) {
        docCtrl.setValue(cleaned, { emitEvent: false });
      }
    });
  }

  // ================= ACCIONES UI =================

  cerrar() {
    this.modal.close();
  }

  // 🆕 MÉTODO ACTUALIZADO: Consultar vehículo en RUNT
  siguiente() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const placa = v.placa ?? '';
    const nombrePropietario = v.nombre ?? '';
    const telefono = v.telefono ?? '';
    const docTipo = v.docTipo ?? 'cc';
    const documento = v.documento ?? '';

    // ✅ CORRECTO: Guardar todos los datos EXCEPTO correo
    // El correo es el ÚNICO campo que el usuario debe llenar manualmente en el modal de agendamiento
    this.modal.setDatosIniciales({
      placa,
      nombre: nombrePropietario,  // ✅ Sí guardar - viene del paso 1
      telefono,                    // ✅ Sí guardar - viene del paso 1
      docTipo,
      documento,
      correo: ''                   // ❌ NO guardar - usuario lo ingresa en el modal
    });

    this.placaMostrada.set(placa);
    this.isConsultando.set(true);

    console.log('🔍 Consultando vehículo en RUNT...');

    const tipoIdentificacion = this.mapTipoIdentificacion(docTipo);

    this.modal.consultarVehiculo({
      placa,
      tipo_identificacion: tipoIdentificacion,
      identificacion: documento,
      nombres: nombrePropietario,
      celular: telefono
    }).subscribe({
      next: (resp) => {
        console.log('✅ Respuesta consulta RUNT:', resp);

        if (resp && resp.data) {
          // ✅ CORRECCIÓN: resp.data contiene {error, mensaje, data}
          // Los datos del vehículo están en resp.data.data
          const dataCompleta = resp.data;
          const data = dataCompleta.data || dataCompleta; // Segundo nivel o fallback
          
          console.log('📋 DATA COMPLETA:', dataCompleta);
          console.log('📋 DATA DEL VEHÍCULO (extraída):', data);
          console.log('📋 data.claseVehiculo:', data.claseVehiculo);
          console.log('📋 data.tipoServicio:', data.tipoServicio);
          console.log('📋 data.tipoCombustible:', data.tipoCombustible);
          console.log('📋 data.modelo:', data.modelo);
          console.log('📋 data.revisionRTMActual:', data.revisionRTMActual);
          
          this.datosRunt.set(data);
          this.vieneDeRunt.set(resp.fromRunt);

          // ✅ MAPEO CORRECTO según la respuesta del RUNT oficial
          const dataMapeada = {
            // Campos principales del vehículo
            clase_vehiculo: data.claseVehiculo || data.clasificacion,
            tipo_servicio: data.tipoServicio || data.tipoServicioNombre,
            tipo_combustible: data.tipoCombustible,
            modelo: data.modelo,
            
            // Fecha de vencimiento RTM - está en revisionRTMActual
            fecha_vencimiento_rtm: data.revisionRTMActual?.fecha_vencimiento || null,
            
            // Información adicional del vehículo
            placa: data.noPlaca,
            marca: data.marca,
            linea: data.linea,
            color: data.color,
            cilindraje: data.cilindraje,
            noMotor: data.noMotor,
            noChasis: data.noChasis,
            
            // RTM actual
            nroRTM: data.revisionRTMActual?.numero,
            cdaExpide: data.revisionRTMActual?.cda_expide,
            fecha_expedicion_rtm: data.revisionRTMActual?.fecha_expedicion,
            vigente: data.revisionRTMActual?.vigente,
            
            // Datos del propietario (para referencia)
            estadoDelVehiculo: data.estadoDelVehiculo,
            organismoTransito: data.organismoTransito
          };

          console.log('🔄 Datos RUNT mapeados:', dataMapeada);

          // ✅ GUARDAR DATOS RUNT MAPEADOS EN EL SERVICIO
          (this.modal as any)._datosRunt = dataMapeada;
          console.log('💾 Datos RUNT guardados en servicio:', dataMapeada);

          // ✅ Construir nombre del vehículo: MARCA LÍNEA placa XXX
          if (dataMapeada.marca && dataMapeada.linea) {
            // Formato preferido: CHEVROLET SPARK placa IWK888
            const marca = dataMapeada.marca.toUpperCase();
            const linea = dataMapeada.linea.toUpperCase();
            this.vehiculoNombre.set(`${marca} ${linea} placa ${placa}`);
          } else if (dataMapeada.clase_vehiculo) {
            // Fallback 1: usar clase si no hay marca/línea
            const claseVehiculo = dataMapeada.clase_vehiculo.toUpperCase();
            this.vehiculoNombre.set(`${claseVehiculo} placa ${placa}`);
          } else if (dataMapeada.modelo) {
            // Fallback 2: usar modelo si no hay clase_vehiculo
            this.vehiculoNombre.set(`Vehículo ${dataMapeada.modelo} placa ${placa}`);
          } else {
            // Fallback 3: solo placa
            this.vehiculoNombre.set(`Vehículo placa ${placa}`);
          }

          const fechaVenc = dataMapeada.fecha_vencimiento_rtm || null;
          if (fechaVenc) {
            this.fechaVenceRtm.set(this.formatearFecha(fechaVenc));
          } else {
            this.fechaVenceRtm.set('No disponible');
          }

          console.log('✅ Datos del RUNT obtenidos:', {
            clase_vehiculo: dataMapeada.clase_vehiculo,
            tipo_servicio: dataMapeada.tipo_servicio,
            tipo_combustible: dataMapeada.tipo_combustible,
            fecha_vencimiento: fechaVenc,
            modelo: dataMapeada.modelo,
            marca: dataMapeada.marca,
            linea: dataMapeada.linea,
            fromRunt: resp.fromRunt
          });
        } else {
          console.warn('⚠️ No se obtuvieron datos del RUNT, continuar manualmente');
          this.vieneDeRunt.set(false);
          this.vehiculoNombre.set(`Vehículo placa ${placa}`);
          this.fechaVenceRtm.set('No disponible - Ingresa manualmente');
        }

        this.isConsultando.set(false);
        this.paso.set(2);
      },
      error: (err) => {
        console.error('❌ Error al consultar RUNT:', err);
        this.isConsultando.set(false);
        this.vieneDeRunt.set(false);
        this.vehiculoNombre.set(`Vehículo placa ${placa}`);
        this.fechaVenceRtm.set('No disponible - Ingresa manualmente');
        this.paso.set(2);
      }
    });
  }

  abrirModalSedes() {
    const ciudadesActuales = this.ciudades();
    this.sedesModalSvc.setCiudades(ciudadesActuales);

    this.cerrar();
    setTimeout(() => {
      this.sedesModalSvc.open();
    }, 300);
  }

  private cargarCiudades() {
    if (this.ciudades().length > 0) return;

    this.loadingCiudades.set(true);

    this.modal.obtenerCiudades().subscribe({
      next: (resp) => {
        console.log('✅ Respuesta obtener_ciudades:', resp);
        this.ciudades.set(resp?.data ?? []);

        if (this.ciudades().length > 0) {
          const primeraCiudad = this.ciudades()[0];
          this.probarProveedores(primeraCiudad.name);
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

  private probarProveedores(nombreCiudad: string) {
    this.modal.obtenerProveedores(nombreCiudad).subscribe({
      next: (resp) => {
        console.log('✅ Respuesta obtener_proveedores para', nombreCiudad, resp);
      },
      error: (err) => {
        console.error('❌ Error al cargar proveedores', err);
      }
    });
  }

  private resetearDatosRunt() {
    this.datosRunt.set(null);
    this.vieneDeRunt.set(false);
    this.vehiculoNombre.set(null);
    this.fechaVenceRtm.set(null);
    this.isConsultando.set(false);
  }

  private mapTipoIdentificacion(codigo: string): string {
    switch (codigo) {
      case 'ce':
        return 'Cedula de Extranjeria';
      case 'nit':
        return 'NIT';
      case 'pas':
        return 'Pasaporte';
      case 'cc':
      default:
        return 'Cedula de Ciudadania';
    }
  }

  private formatearFecha(fechaStr: string): string {
    try {
      // El RUNT devuelve formato: "07/02/2026" (DD/MM/YYYY)
      // Necesitamos convertirlo a formato legible
      
      if (fechaStr.includes('/')) {
        // Formato DD/MM/YYYY
        const [dia, mes, anio] = fechaStr.split('/');
        const fecha = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
        
        const opciones: Intl.DateTimeFormatOptions = { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        };
        return fecha.toLocaleDateString('es-CO', opciones);
      } else {
        // Formato ISO (fallback)
        const fecha = new Date(fechaStr);
        const opciones: Intl.DateTimeFormatOptions = { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        };
        return fecha.toLocaleDateString('es-CO', opciones);
      }
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return fechaStr;
    }
  }
}
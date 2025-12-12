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

  // subscripciones
  private sub?: Subscription;
  private placaSub?: Subscription;
  private docTipoSub?: Subscription;
  private docValorSub?: Subscription;
  private nombreSub?: Subscription;
  private telSub?: Subscription;

  // Estado para las ciudades
  ciudades = signal<any[]>([]);
  loadingCiudades = signal(false);

  // 🔹 Estado para la pantalla 2
  vehiculoNombre = signal<string | null>(null);
  placaMostrada  = signal<string | null>(null);
  fechaVenceRtm  = signal<string | null>(null);

  // ========= FORMULARIO =========
  form = this.fb.group({
    // 1. Placa: AAA123 (3 letras + 3 números, siempre mayúscula)
    placa: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Z]{3}\d{3}$/)
      ]
    ],

    // 2. Nombre: solo texto
    nombre: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+$/)
      ]
    ],

    // 3. Teléfono: solo números, exactamente 10 dígitos
    telefono: [
      '',
      [
        Validators.required,
        Validators.pattern(/^\d{10}$/)
      ]
    ],

    // 4. Tipo de documento
    docTipo: ['cc', [Validators.required]],

    // 5. Documento (reglas dinámicas según docTipo)
    documento: ['', [Validators.required]],

    // 6. Autorización datos
    aceptoDatos: [false, [Validators.requiredTrue]]
  });

  // ================= CICLO DE VIDA =================
  ngOnInit(): void {
    // normalizaciones y validaciones dinámicas
    this.configurarNormalizacionPlaca();
    this.configurarNormalizacionNombre();
    this.configurarNormalizacionTelefono();
    this.configurarDocumentoDinamico();

    // control de apertura/cierre del modal
    this.sub = this.modal.open$.subscribe(isOpen => {
      this.open.set(isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        this.cargarCiudades();
      } else {
        this.paso.set(1);
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

  /** Placa: mayúsculas, sin símbolos, máx 6 chars */
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

  /** Nombre: solo letras y espacios */
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

  /** Teléfono: solo números, máx 10 dígitos */
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

  /** Documento: validaciones y limpieza según tipo */
  private configurarDocumentoDinamico() {
    const docTipoCtrl = this.form.get('docTipo');
    const docCtrl     = this.form.get('documento');

    if (!docTipoCtrl || !docCtrl) return;

    const aplicarValidadores = (tipo: string | null) => {
      const validators: any[] = [Validators.required];

      switch (tipo) {
        case 'cc': // cédula ciudadanía: 10 dígitos
          validators.push(Validators.pattern(/^\d{10}$/));
          break;
        case 'ce': // cédula extranjería: 6–15 dígitos
          validators.push(Validators.pattern(/^\d{6,15}$/));
          break;
        case 'nit': // NIT: 9–10 dígitos
          validators.push(Validators.pattern(/^\d{9,10}$/));
          break;
        case 'pas': // pasaporte: 6–15 alfanumérico
          validators.push(Validators.pattern(/^[A-Za-z0-9]{6,15}$/));
          break;
        default:
          validators.push(Validators.maxLength(20));
      }

      docCtrl.setValidators(validators);
      docCtrl.updateValueAndValidity({ emitEvent: false });
    };

    // primera aplicación
    aplicarValidadores(docTipoCtrl.value);

    // cuando cambia el tipo de documento
    this.docTipoSub = docTipoCtrl.valueChanges.subscribe(tipo => {
      aplicarValidadores(tipo);
      docCtrl.setValue('', { emitEvent: false });
    });

    // limpieza de caracteres según el tipo
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

  siguiente() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Datos del formulario
    const v = this.form.value;

    const placa             = v.placa ?? '';
    const nombrePropietario = v.nombre ?? '';

    // ✅ Guardar datos iniciales en el servicio
    this.modal.setDatosIniciales({
      placa: placa,
      nombre: nombrePropietario,
      telefono: v.telefono ?? '',
      docTipo: v.docTipo ?? 'cc',
      documento: v.documento ?? '',
      // por ahora sin correo porque este form no lo tiene
      correo: ''
    });

    // Guardamos para la pantalla 2
    this.placaMostrada.set(placa);

    // Texto demo para el nombre del vehículo
    this.vehiculoNombre.set(`Vehículo placa ${placa}`);

    // Fecha RTM mock (luego se reemplaza por la del API)
    this.fechaVenceRtm.set('25 de julio de 2026');

    console.log('Formulario RTM válido, datos:', {
      placa,
      nombrePropietario,
      docTipo: v.docTipo,
      documento: v.documento,
      telefono: v.telefono
    });

    this.paso.set(2);
  }

  // Abrir la modal de sedes
  abrirModalSedes() {
    const ciudadesActuales = this.ciudades();

    this.sedesModalSvc.setCiudades(ciudadesActuales);

    this.cerrar();
    setTimeout(() => {
      this.sedesModalSvc.open();
    }, 300);
  }

  // === Llamada al servicio para obtener ciudades ===
  private cargarCiudades() {
    if (this.ciudades().length > 0) return;

    this.loadingCiudades.set(true);

    this.modal.obtenerCiudades().subscribe({
      next: (resp) => {
        console.log('Respuesta obtener_ciudades:', resp);
        this.ciudades.set(resp?.data ?? []);

        if (this.ciudades().length > 0) {
          const primeraCiudad = this.ciudades()[0];
          this.probarProveedores(primeraCiudad.name);
        }
      },
      error: (err) => {
        console.error('Error al cargar ciudades', err);
        this.loadingCiudades.set(false);
      },
      complete: () => {
        this.loadingCiudades.set(false);
      }
    });
  }

  // === Solo para probar obtener_proveedores en consola ===
  private probarProveedores(nombreCiudad: string) {
    this.modal.obtenerProveedores(nombreCiudad).subscribe({
      next: (resp) => {
        console.log('Respuesta obtener_proveedores para', nombreCiudad, resp);
      },
      error: (err) => {
        console.error('Error al cargar proveedores', err);
      }
    });
  }
}
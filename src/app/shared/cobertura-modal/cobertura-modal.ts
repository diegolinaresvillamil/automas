import { Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CoberturaModalService } from './cobertura-modal.service';

// =====================================
// 🟠 Tipos de datos
// =====================================
type Sede = {
  id: number;
  nombre: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  img: string;
  horarioRtm: string;
  horarioComercial: string;
  servicios: string[];
  lat?: number; // ✅ Coordenadas del API
  lng?: number; // ✅ Coordenadas del API
};

type SedeCercana = {
  id: number;
  nombre: string;
  ciudad: string;
  img: string;
};

// =====================================
// 🧩 Componente principal
// =====================================
@Component({
  selector: 'app-cobertura-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cobertura-modal.html',
  styleUrls: ['./cobertura-modal.css']
})
export class CoberturaModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();

  step = 1;
  filtroForm!: FormGroup;

  departamentos: string[] = [];
  ciudades: string[] = [];
  servicios: string[] = [];
  tiposCentro: string[] = [];

  sedes: Sede[] = [];
  detalle?: Sede;
  cercanas: SedeCercana[] = [];

  // 🆕 Estados de carga
  cargandoSedes = false;
  errorCarga: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private coberturaSvc: CoberturaModalService,
    private sanitizer: DomSanitizer
  ) {}

  // ===============================
  // 🔹 Inicialización
  // ===============================
  ngOnInit(): void {
    console.log('🚀 Inicializando modal de cobertura');
    
    // Cargar catálogos desde el API
    this.cargarCatalogosDesdeAPI();
  }

  /**
   * Cargar catálogos desde el API
   */
  private cargarCatalogosDesdeAPI(): void {
    console.log('📥 Cargando catálogos desde API...');

    // Cargar departamentos (fallback a hardcoded)
    this.coberturaSvc.getDepartamentosAsync().subscribe({
      next: (deptos) => {
        this.departamentos = deptos;
        console.log(`✅ ${deptos.length} departamentos cargados`);
      },
      error: (err) => {
        console.error('❌ Error al cargar departamentos:', err);
        this.departamentos = this.coberturaSvc.getDepartamentos();
      }
    });

    // Cargar ciudades desde API (REAL)
    this.coberturaSvc.getCiudadesAsync().subscribe({
      next: (ciudades) => {
        this.ciudades = ciudades;
        console.log(`✅ ${ciudades.length} ciudades cargadas desde API`);
        
        // Inicializar formulario después de cargar ciudades
        this.inicializarFormulario();
      },
      error: (err) => {
        console.error('❌ Error al cargar ciudades:', err);
        this.ciudades = this.coberturaSvc.getCiudades();
        this.inicializarFormulario();
      }
    });

    // Servicios y tipos (hardcoded por ahora)
    this.servicios = this.coberturaSvc.getServicios();
    this.tiposCentro = this.coberturaSvc.getTiposCentro();

    console.log('✅ Servicios y tipos de centro cargados');
  }

  /**
   * Inicializar formulario con valores por defecto
   */
  private inicializarFormulario(): void {
    this.filtroForm = this.fb.group({
      departamento: [this.departamentos[0] || 'Bogotá', Validators.required],
      ciudad: [this.ciudades[0] || 'Bogotá', Validators.required],
      servicio: [this.servicios[0], Validators.required],
      tipoCentro: [this.tiposCentro[0], Validators.required],
    });

    console.log('✅ Formulario inicializado con:', this.filtroForm.value);
  }

  ngOnChanges(): void {
    document.body.style.overflow = this.visible ? 'hidden' : '';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  // ===============================
  // 🔹 Eventos
  // ===============================
  @HostListener('window:keydown.escape')
  onEsc() {
    if (this.visible) this.close();
  }

  onBackdrop(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    if (target.classList.contains('cobertura-backdrop')) this.close();
  }

  // ===============================
  // 🔹 Lógica de pasos
  // ===============================
  
  /**
   * CONSULTA CON API REAL (ACTIVADO POR DEFECTO)
   */
  consultar(): void {
    if (!this.filtroForm.valid) {
      console.warn('⚠️ Formulario inválido');
      return;
    }

    console.log('🔍 Consultando sedes con filtro:', this.filtroForm.value);
    
    this.cargandoSedes = true;
    this.errorCarga = null;

    // ✅ Usar método asíncrono (API real) por defecto
    this.coberturaSvc.consultarSedesAsync(this.filtroForm.value).subscribe({
      next: (sedes) => {
        console.log(`✅ ${sedes.length} sedes encontradas con fotos del API`);
        
        // Verificar que las sedes tengan fotos
        sedes.forEach(sede => {
          console.log(`  📸 ${sede.nombre}: ${sede.img}`);
        });
        
        this.sedes = sedes;
        this.cargandoSedes = false;
        this.step = 2;
      },
      error: (err) => {
        console.error('❌ Error al consultar sedes:', err);
        this.errorCarga = 'Error al cargar sedes. Mostrando sedes de ejemplo.';
        this.cargandoSedes = false;
        
        // Fallback automático ya incluido en el servicio
      }
    });
  }

  verDetalle(s: Sede | SedeCercana): void {
    console.log('👁 Ver detalle de sede:', s.nombre);
    
    // Si ya es una sede completa, la usamos directamente
    if ('direccion' in s && 'telefono' in s && 'servicios' in s) {
      this.detalle = s;
      console.log('✅ Usando sede completa directamente');
      console.log('📸 Foto de la sede:', s.img);
      console.log('📍 Dirección:', s.direccion);
    } else {
      // Si es una sede cercana, buscar en las sedes ya cargadas
      console.log('🔍 Buscando sede cercana en lista cargada...');
      
      const sedeEncontrada = this.sedes.find(sede => sede.id === s.id);
      
      if (sedeEncontrada) {
        this.detalle = sedeEncontrada;
        console.log('✅ Sede encontrada en lista:', sedeEncontrada.nombre);
        console.log('📸 Foto:', sedeEncontrada.img);
        console.log('📍 Dirección:', sedeEncontrada.direccion);
      } else {
        // Fallback: buscar en hardcoded
        console.warn('⚠️ Sede no encontrada en lista, buscando en hardcoded...');
        const sedeCompleta = this.coberturaSvc.buscarSedePorId(s.id);
        
        if (sedeCompleta) {
          this.detalle = sedeCompleta;
          console.log('✅ Sede encontrada en hardcoded');
        } else {
          console.error('❌ No se encontró la sede con ID:', s.id);
          alert('No se pudo cargar el detalle de esta sede. Por favor intenta nuevamente.');
          return;
        }
      }
    }

    // ✅ Obtener sedes cercanas CON FOTOS DEL API
    console.log('📍 Cargando sedes cercanas con fotos del API...');
    
    this.coberturaSvc.obterCercanasAsync(s, this.filtroForm.value).subscribe({
      next: (cercanas) => {
        this.cercanas = cercanas;
        console.log(`✅ ${cercanas.length} sedes cercanas con fotos:`);
        cercanas.forEach(c => {
          console.log(`  📸 ${c.nombre}: ${c.img}`);
        });
      },
      error: (err) => {
        console.error('❌ Error al cargar sedes cercanas:', err);
        // Fallback a método síncrono
        this.cercanas = this.coberturaSvc.obterCercanas(s);
      }
    });
    
    this.step = 3;
  }

  volver(s: number): void {
    console.log('⬅️ Volviendo al paso:', s);
    this.step = s;
    if (s === 2) {
      this.detalle = undefined;
    }
    if (s === 1) {
      this.sedes = [];
      this.detalle = undefined;
      this.errorCarga = null;
    }
  }

  // ===============================
  // 🔹 Helpers
  // ===============================
  
  /**
   * Generar URL del iframe de Google Maps con coordenadas reales
   */
  getMapsIframeUrl(): string {
    const sede = this.detalle;
    if (!sede) return '';
    
    // Usar coordenadas si existen
    if (sede.lat && sede.lng) {
      console.log(`🗺️ Mapa con coordenadas reales: ${sede.lat}, ${sede.lng}`);
      return `https://maps.google.com/maps?q=${sede.lat},${sede.lng}&z=15&output=embed`;
    } else {
      // Fallback: buscar por dirección
      const direccion = encodeURIComponent(`${sede.direccion}, ${sede.ciudad}`);
      console.log(`🗺️ Mapa con dirección: ${sede.direccion}, ${sede.ciudad}`);
      return `https://maps.google.com/maps?q=${direccion}&z=15&output=embed`;
    }
  }

  /**
   * Sanitizar URL para el iframe de Google Maps
   */
  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  // ===============================
  // 🔹 Cierre del modal
  // ===============================
  close(): void {
    console.log('🚪 Cerrando modal');
    this.closed.emit();
    
    // Resetear al cerrar
    setTimeout(() => {
      this.step = 1;
      this.sedes = [];
      this.detalle = undefined;
      this.cercanas = [];
      this.errorCarga = null;
    }, 300);
  }
}
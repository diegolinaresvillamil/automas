import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { API_CONFIG } from '../../config';

// =====================================
// 🟠 Tipos de datos
// =====================================
type Filtro = {
  departamento: string;
  ciudad: string;
  servicio: string;
  tipoCentro: string;
};

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

// Interfaces del API
interface SedeAPI {
  id: number;
  name: string;
  ciudad?: string;
  // Posibles campos de dirección
  direccion?: string;
  address1?: string;
  address2?: string;
  address?: string;
  full_address?: string;
  // Teléfonos
  phone?: string;
  telefono?: string;
  phone_number?: string;
  // Fotos
  picture?: string;
  picture_preview?: string;
  image?: string;
  // Servicios
  services?: string[] | number[];
  // Coordenadas
  lat?: string | number;
  lng?: string | number;
  lon?: string | number;
  latitude?: string | number;
  longitude?: string | number;
  // Otros
  [key: string]: any; // Para campos adicionales no documentados
}

@Injectable({ providedIn: 'root' })
export class CoberturaModalService {
  private http = inject(HttpClient);

  // Configuración usando tu config.ts
  private readonly BASE_URL = API_CONFIG.BASE_URL;
  private readonly TOKEN = API_CONFIG.TOKEN;
  private readonly IS_PRODUCTION = API_CONFIG.IS_PRODUCTION;

  constructor() {
    console.log('🏢 CoberturaModalService inicializado');
    console.log('📡 Base URL:', this.BASE_URL);
    console.log('🌍 Entorno:', this.IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO');
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Token ${this.TOKEN}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Construir URL según entorno
   */
  private buildUrl(path: string): string {
    if (this.IS_PRODUCTION) {
      // Producción: /api-proxy.php?path=...
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `${this.BASE_URL}${cleanPath}`;
    } else {
      // Desarrollo: /rtm-api/...
      return `${this.BASE_URL}${path}`;
    }
  }

  // =====================================
  // 🔹 Catálogos - AHORA DESDE EL API
  // =====================================
  
  /**
   * Obtener departamentos del API
   */
  getDepartamentosAsync(): Observable<string[]> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/?accion=obtener_departamentos');
    
    return this.http.post<any>(url, {}, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('✅ Departamentos del API:', response);
        
        if (response.data && Array.isArray(response.data)) {
          // Extraer nombres únicos de departamentos con tipado explícito
          const nombres = response.data.map((d: any) => (d.name || d.nombre) as string);
          return [...new Set(nombres)] as string[];
        }
        return this.getDepartamentos(); // Fallback
      }),
      catchError(error => {
        console.error('❌ Error al cargar departamentos:', error);
        return of(this.getDepartamentos());
      })
    );
  }

  /**
   * Obtener ciudades del API
   */
  getCiudadesAsync(): Observable<string[]> {
    const url = this.buildUrl('wh/transversal/ejecutar-accion/?accion=obtener_ciudades');
    
    console.log('📥 Obteniendo ciudades desde API:', url);
    
    return this.http.post<any>(url, {}, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('✅ Respuesta ciudades:', response);
        
        if (response.data && Array.isArray(response.data)) {
          const ciudades = response.data.map((c: any) => (c.name || c.nombre) as string);
          console.log(`✅ ${ciudades.length} ciudades cargadas desde API`);
          return ciudades;
        }
        
        return this.getCiudades(); // Fallback
      }),
      catchError(error => {
        console.error('❌ Error al cargar ciudades:', error);
        return of(this.getCiudades());
      })
    );
  }
  
  // Fallback hardcoded (si falla el API)
  getDepartamentos(): string[] {
    return ['Bogotá', 'Antioquia', 'Valle del Cauca', 'Atlántico'];
  }

  getCiudades(): string[] {
    // Lista más completa como fallback
    return [
      'Bogotá',
      'Medellín',
      'Cali',
      'Barranquilla',
      'Cartagena',
      'Bucaramanga',
      'Pereira',
      'Manizales',
      'Armenia',
      'Neiva',
      'Pasto',
      'Villavicencio',
      'Ibagué',
      'Popayán',
      'Tunja',
      'Valledupar',
      'Montería',
      'Sincelejo',
      'Cúcuta',
      'Santa Marta'
    ];
  }

  getServicios(): string[] {
    return [
      'Todos', // ✅ Opción para ver todos los servicios
      'Plan viajero', 
      'Revisión Técnico Mecánica', 
      'Peritaje', 
      'Trámites'
    ];
  }

  getTiposCentro(): string[] {
    return ['Centro Autorizado', 'Centro Concesionado', 'CDA'];
  }

  // =====================================
  // 🔹 Consultar sedes (API REAL)
  // =====================================
  
  consultarSedes(filtro: Filtro): Sede[] {
    console.log('🔍 Consultando sedes con filtro:', filtro);

    // Por ahora, retornar sedes hardcodeadas mientras se completa la integración
    // TODO: Descomentar cuando el API esté listo
    /*
    const path = `wh/transversal/ejecutar-accion/?accion=obtener_proveedores&ciudad=${encodeURIComponent(filtro.ciudad)}&from_flow=tramites`;
    const url = this.buildUrl(path);

    this.http.post<any>(url, {}, { headers: this.getHeaders() }).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del API:', response);
        if (response.data) {
          return this.adaptarSedes(response.data);
        }
      },
      error: (err) => {
        console.error('❌ Error al consultar sedes:', err);
      }
    });
    */

    // Fallback: datos hardcodeados filtrados por ciudad
    return this.getSedesHardcoded().filter(s => s.ciudad === filtro.ciudad);
  }

  /**
   * Consultar sedes de forma asíncrona (Observable)
   */
  consultarSedesAsync(filtro: Filtro): Observable<Sede[]> {
    console.log('🔍 [ASYNC] Consultando sedes con filtro:', filtro);

    // Construir path
    let path = `wh/transversal/ejecutar-accion/?accion=obtener_proveedores&ciudad=${encodeURIComponent(filtro.ciudad)}`;
    
    // ✅ Solo agregar from_flow si NO es "Todos"
    if (filtro.servicio && filtro.servicio !== 'Todos') {
      const flowMap: Record<string, string> = {
        'Plan viajero': 'plan_viajero',
        'Revisión Técnico Mecánica': 'rtm',
        'Peritaje': 'peritaje',
        'Trámites': 'tramites'
      };
      const flow = flowMap[filtro.servicio] || 'tramites';
      path += `&from_flow=${flow}`;
    }
    // Si es "Todos", no agregamos from_flow para obtener todas las sedes
    
    const url = this.buildUrl(path);

    console.log('📡 URL construida:', url);

    return this.http.post<any>(url, {}, { headers: this.getHeaders() }).pipe(
      map(response => {
        console.log('✅ Respuesta del API:', response);
        
        if (response.data && Array.isArray(response.data)) {
          // ✅ Pasar la ciudad del filtro al adaptador
          const sedesAdaptadas = this.adaptarSedes(response.data, filtro.ciudad);
          console.log(`✅ ${sedesAdaptadas.length} sedes adaptadas para ${filtro.ciudad}`);
          return sedesAdaptadas;
        }
        
        return [];
      }),
      catchError(error => {
        console.error('❌ Error al consultar sedes:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        
        // Fallback: retornar sedes hardcodeadas
        console.log('⚠️ Usando sedes hardcodeadas como fallback');
        return of(this.getSedesHardcoded().filter(s => s.ciudad === filtro.ciudad));
      })
    );
  }

  // =====================================
  // 🔹 Adaptadores (API → App)
  // =====================================

  private adaptarSedes(sedesAPI: SedeAPI[], ciudadFiltro: string): Sede[] {
    return sedesAPI.map(s => this.adaptarSede(s, ciudadFiltro));
  }

  private adaptarSede(sedeAPI: SedeAPI, ciudadFiltro: string): Sede {
    // 🔍 LOG COMPLETO para debugging
    console.log('🔍 SEDE API COMPLETA:', JSON.stringify(sedeAPI, null, 2));
    
    // 📸 Prioridad de fotos:
    // 1. picture_preview (thumbnail optimizado)
    // 2. picture (imagen completa)
    // 3. Fallback a imagen local
    const fotoSede = sedeAPI.picture_preview || sedeAPI.picture || '/assets/sede.png';
    
    console.log(`📸 Foto de ${sedeAPI.name}:`, fotoSede);

    // 🏙️ Ciudad: del filtro (ya que el API no siempre la retorna en cada sede)
    const ciudad = sedeAPI.ciudad || ciudadFiltro;
    console.log(`🏙️ Ciudad de ${sedeAPI.name}:`, ciudad);

    // 📍 Dirección: intentar múltiples campos (orden de prioridad)
    const direccion = sedeAPI.full_address || 
                      sedeAPI.direccion || 
                      sedeAPI.address1 || 
                      sedeAPI.address2 ||
                      sedeAPI.address || 
                      ''; // ✅ String vacío en lugar de mensaje
    
    if (direccion) {
      console.log(`📍 Dirección de ${sedeAPI.name}:`, direccion);
    } else {
      console.log(`⚠️ ${sedeAPI.name}: Sin dirección disponible en el API`);
    }
    
    console.log(`   - sedeAPI.full_address:`, sedeAPI.full_address);
    console.log(`   - sedeAPI.direccion:`, sedeAPI.direccion);
    console.log(`   - sedeAPI.address1:`, sedeAPI.address1);
    console.log(`   - sedeAPI.address2:`, sedeAPI.address2);
    console.log(`   - sedeAPI.address:`, sedeAPI.address);

    // 🗺️ Coordenadas para el mapa
    const lat = sedeAPI.lat ? parseFloat(sedeAPI.lat.toString()) : 0;
    const lng = sedeAPI.lng ? parseFloat(sedeAPI.lng.toString()) : 0;
    
    // Generar URL de Google Maps con coordenadas reales
    const mapsUrl = (lat && lng) 
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : undefined;

    console.log(`🗺️ Coordenadas de ${sedeAPI.name}: lat=${lat}, lng=${lng}`);

    // 📋 Servicios: convertir IDs a nombres legibles
    let serviciosLegibles: string[] = [];
    
    if (sedeAPI.services && Array.isArray(sedeAPI.services)) {
      // Mapear y filtrar servicios sin nombre (null)
      serviciosLegibles = sedeAPI.services
        .map(serviceId => this.mapearServicioIdANombre(serviceId))
        .filter(servicio => servicio !== null) as string[]; // ✅ Filtrar nulls
      
      console.log(`📋 Servicios de ${sedeAPI.name}:`, serviciosLegibles);
      console.log(`   - IDs originales:`, sedeAPI.services);
      console.log(`   - Servicios válidos: ${serviciosLegibles.length}/${sedeAPI.services.length}`);
    }
    
    // Si después de filtrar no queda ningún servicio, usar fallback
    if (serviciosLegibles.length === 0) {
      serviciosLegibles = [
        'Tecnomecánica Livianos',
        'Tecnomecánica Motocicletas',
        'Plan Viajero'
      ];
      console.log('⚠️ No se encontraron servicios válidos, usando fallback');
    }

    return {
      id: sedeAPI.id,
      nombre: sedeAPI.name || 'Sede sin nombre',
      ciudad: ciudad, // ✅ Ciudad del filtro o del API
      direccion: direccion, // ✅ Dirección con múltiples fallbacks
      telefono: sedeAPI.phone || sedeAPI.telefono || 'Teléfono no disponible',
      
      // ✅ USAR FOTO DEL API, fallback a local
      img: fotoSede,
      
      // ✅ Coordenadas para el mapa
      lat: lat,
      lng: lng,
      
      // ✅ Horarios del API (si existen) o fallback
      horarioRtm: this.obtenerHorarioRTM(sedeAPI),
      horarioComercial: this.obtenerHorarioComercial(sedeAPI),
      
      // ✅ Servicios legibles (no IDs)
      servicios: serviciosLegibles
    };
  }

  /**
   * Mapear ID de servicio a nombre legible
   * Retorna null si no encuentra el servicio para poder filtrarlo
   */
  private mapearServicioIdANombre(serviceId: string | number): string | null {
    // Mapeo de IDs comunes a nombres
    const mapaServicios: Record<string, string> = {
      // Tecnomecánicas
      '1': 'Tecnomecánica Livianos Particulares',
      '2': 'Tecnomecánica Livianos Públicos',
      '3': 'Tecnomecánica Livianos Eléctricos',
      '4': 'Tecnomecánica Motocicletas',
      '5': 'Tecnomecánica Pesados',
      '6': 'Tecnomecánica Taxis',
      '90': 'Tecnomecánica Livianos Particulares Eléctricos',
      '105': 'Tecnomecánica Livianos Públicos',
      '111': 'Tecnomecánica Motocicletas',
      
      // Plan Viajero
      '7': 'Plan Viajero',
      '8': 'Plan Viajero Plus',
      
      // Peritajes
      '9': 'Peritaje',
      '10': 'Peritaje Premium',
      
      // Trámites
      '11': 'Trámites',
      '12': 'Matriculación',
      '13': 'Traspaso',
      '14': 'Duplicado',
      '15': 'Levantamiento de Prenda',
      
      // Otros servicios
      '75': 'Revisión Preventiva',
      '81': 'Certificado de Emisiones',
      
      // IDs comunes adicionales (ajustar según tu negocio)
      '72': 'Tecnomecánica Livianos',
      '73': 'Tecnomecánica Motocicletas',
      '179': 'Tecnomecánica',
      '180': 'Peritaje',
      '181': 'Plan Viajero',
      '212': 'Trámites',
    };

    const idString = serviceId.toString();
    
    // ✅ Si no existe en el mapa, retornar null para filtrarlo
    if (!mapaServicios[idString]) {
      console.log(`⚠️ Servicio sin nombre: ${idString} - será filtrado`);
      return null;
    }
    
    return mapaServicios[idString];
  }

  /**
   * Obtener horario RTM del API o fallback
   */
  private obtenerHorarioRTM(sedeAPI: SedeAPI): string {
    // TODO: Cuando el API tenga horarios, usar:
    // if (sedeAPI.horario_rtm) return sedeAPI.horario_rtm;
    
    // Por ahora, fallback estándar
    return 'Lunes a Viernes 7:00 AM a 5:30 PM<br/>Sábados 7:00 AM a 3:00 PM';
  }

  /**
   * Obtener horario comercial del API o fallback
   */
  private obtenerHorarioComercial(sedeAPI: SedeAPI): string {
    // TODO: Cuando el API tenga horarios, usar:
    // if (sedeAPI.horario_comercial) return sedeAPI.horario_comercial;
    
    // Por ahora, fallback estándar
    return 'Lunes a Viernes 8:00 AM a 5:00 PM<br/>Sábados 8:00 AM a 2:00 PM';
  }

  // =====================================
  // 🔹 Sedes cercanas - CON FOTOS REALES
  // =====================================

  /**
   * Obtener sedes cercanas de forma asíncrona (con fotos del API)
   */
  obterCercanasAsync(sede: Sede | SedeCercana, filtro: Filtro): Observable<SedeCercana[]> {
    console.log('📍 Obteniendo sedes cercanas a:', sede.nombre);
    
    // Consultar todas las sedes de la misma ciudad
    return this.consultarSedesAsync(filtro).pipe(
      map(sedes => {
        // Filtrar: misma ciudad, diferente ID, máximo 3
        const cercanas = sedes
          .filter(s => s.id !== sede.id && s.ciudad === sede.ciudad)
          .slice(0, 3)
          .map(s => ({
            id: s.id,
            nombre: s.nombre,
            ciudad: s.ciudad,
            img: s.img // ✅ Foto real del API
          }));
        
        console.log(`✅ ${cercanas.length} sedes cercanas encontradas con fotos del API`);
        return cercanas;
      })
    );
  }

  obterCercanas(sede: Sede | SedeCercana): SedeCercana[] {
    console.log('📍 Obteniendo sedes cercanas a:', sede.nombre);
    
    // TODO: Implementar endpoint real cuando esté disponible
    // Por ahora retornar datos hardcodeados
    
    const todasLasSedes = this.getSedesHardcoded();
    
    return todasLasSedes
      .filter(s => s.id !== sede.id && s.ciudad === sede.ciudad)
      .slice(0, 3) // Máximo 3 cercanas
      .map(s => ({
        id: s.id,
        nombre: s.nombre,
        ciudad: s.ciudad,
        img: s.img
      }));
  }

  buscarSedePorId(id: number): Sede | undefined {
    console.log('🔎 Buscando sede con ID:', id);
    
    // TODO: Implementar búsqueda en el API
    // Por ahora buscar en hardcoded
    
    return this.getSedesHardcoded().find(s => s.id === id);
  }

  // =====================================
  // 🔹 Datos hardcodeados (fallback)
  // =====================================

  private getSedesHardcoded(): Sede[] {
    return [
      {
        id: 1,
        nombre: 'CDA AutoMás Fontibón',
        ciudad: 'Bogotá',
        direccion: 'Cra 116 # 17 - 20',
        telefono: '3336025311 - 3158365888',
        img: '/assets/sede.png',
        horarioRtm:
          'Lunes a Viernes 6:00 AM a 6:00 PM<br/>Sábados 6:00 AM a 3:00 PM<br/>Domingos 7:00 AM a 1:00 PM',
        horarioComercial:
          'Lunes a Viernes 8:00 AM a 5:00 PM<br/>Sábados 8:00 AM a 3:00 PM',
        servicios: [
          'Tecnomecánica Livianos Particulares Eléctricos',
          'Tecnomecánica Livianos Públicos',
          'Tecnomecánica Livianos Públicos Eléctricos',
          'Tecnomecánica Motocicletas',
        ],
      },
      {
        id: 2,
        nombre: 'CDA AutoMás Norte',
        ciudad: 'Bogotá',
        direccion: 'Av. 19 # 128 - 20',
        telefono: '3111234567',
        img: '/assets/sede.png',
        horarioRtm: 'Lunes a Viernes 7:00 AM a 5:30 PM<br/>Sábados 7:00 AM a 3:00 PM',
        horarioComercial: 'Lunes a Viernes 8:00 AM a 5:00 PM<br/>Sábados 8:00 AM a 2:00 PM',
        servicios: ['Tecnomecánica Livianos', 'Motocicletas'],
      },
      {
        id: 3,
        nombre: 'CDA AutoMás Calle 13',
        ciudad: 'Bogotá',
        direccion: 'Diag 13 # 69 - 18',
        telefono: '601 6263583',
        img: '/assets/sede.png',
        horarioRtm: 'Lunes a Viernes 7:00 AM a 6:00 PM<br/>Sábados 7:00 AM a 4:00 PM',
        horarioComercial: 'Lunes a Viernes 8:00 AM a 5:00 PM<br/>Sábados 8:00 AM a 3:00 PM',
        servicios: ['Tecnomecánica Livianos', 'Plan Viajero', 'Trámites'],
      },
      {
        id: 4,
        nombre: 'CDA AutoMás Medellín Centro',
        ciudad: 'Medellín',
        direccion: 'Carrera 65 # 8 - 95',
        telefono: '604 3216549',
        img: '/assets/sede.png',
        horarioRtm: 'Lunes a Viernes 7:00 AM a 5:30 PM<br/>Sábados 7:00 AM a 3:00 PM',
        horarioComercial: 'Lunes a Viernes 8:00 AM a 5:00 PM<br/>Sábados 8:00 AM a 2:00 PM',
        servicios: ['Tecnomecánica Livianos', 'Motocicletas', 'Peritaje'],
      },
      {
        id: 5,
        nombre: 'CDA AutoMás Cali Sur',
        ciudad: 'Cali',
        direccion: 'Calle 5 # 38 - 13',
        telefono: '602 8765432',
        img: '/assets/sede.png',
        horarioRtm: 'Lunes a Viernes 7:00 AM a 6:00 PM<br/>Sábados 7:00 AM a 3:00 PM',
        horarioComercial: 'Lunes a Viernes 8:00 AM a 5:00 PM<br/>Sábados 8:00 AM a 2:00 PM',
        servicios: ['Tecnomecánica Livianos', 'Plan Viajero'],
      },
    ];
  }
}
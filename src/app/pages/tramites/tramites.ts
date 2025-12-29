import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaqComponent, FaqItem } from '../../shared/faq/faq';
import { BlogSectionComponent, BlogPost } from '../../shared/blog-section/blog-section';
import { TramitesModalComponent } from '../../shared/tramites-modal/tramites-modal';
import { TramitesModalService } from '../../shared/tramites-modal/tramites-modal.service';

@Component({
  selector: 'app-tramites',
  standalone: true,
  imports: [CommonModule, FaqComponent, BlogSectionComponent, TramitesModalComponent],
  templateUrl: './tramites.html',
  styleUrls: ['./tramites.css']
})
export class Tramites {
  // ===============================
  // 🔧 Inyección del servicio
  // ===============================
  private modalSvc = inject(TramitesModalService);

  // ==========================
  // SECCIÓN: LISTADO DE TRÁMITES
  // ==========================
  tramites = [
    {
      title: 'Matrícula/Registro',
      icon: 'assets/matricula.svg',
      open: false,
      docs: [
        'Manifiesto de importación',
        'Factura de venta',
        'Formulario de solicitud de trámite',
        'SOAT vigente',
        'Certificado de revisión técnico-mecánica'
      ]
    },
    {
      title: 'Transformación',
      icon: 'assets/transformacion.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Cambio de color',
      icon: 'assets/color.svg',
      open: false,
      docs: [
        'Factura o certificado del taller autorizado',
        'Formulario de solicitud de trámite',
        'Fotografía del vehículo actualizado'
      ]
    },
    {
      title: 'Traspaso',
      icon: 'assets/traspaso.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Regrabar Chasis',
      icon: 'assets/chasis.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Duplicado',
      icon: 'assets/duplicado.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Traslado Matrícula',
      icon: 'assets/traslado.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Regrabación de Motor',
      icon: 'assets/motor.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Levantamiento Prenda',
      icon: 'assets/prenda.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Radicado y Matrícula',
      icon: 'assets/radicado.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Cambio de servicio',
      icon: 'assets/servicio.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    },
    {
      title: 'Cancelación de Matrícula',
      icon: 'assets/cancelacion.svg',
      open: false,
      docs: [
        'Contrato de compraventa',
        'Cédula del comprador y vendedor',
        'Paz y salvo de impuestos',
        'SOAT vigente'
      ]
    }
  ];

  // Alterna la visibilidad del contenido de un trámite
  toggleTramite(index: number) {
    this.tramites[index].open = !this.tramites[index].open;
  }

  // ==========================
  // SECCIÓN: MODAL DE TRÁMITES
  // ✅ AHORA USA EL SERVICIO
  // ==========================
  
  // ❌ ELIMINADOS (ya no se usan):
  // selectedTramite = signal<any>(null);
  // modalAbierta = signal(false);

  abrirModal(tramite?: any) {
    console.log('🚀 Abriendo modal de trámites');
    
    // Opcional: si quieres pre-seleccionar un trámite, puedes guardarlo en el servicio
    // if (tramite) {
    //   this.modalSvc.tramite.set(tramite);
    // }
    
    this.modalSvc.abrir(); // ✅ Usa el servicio
  }

  cerrarModal() {
    console.log('🚪 Cerrando modal de trámites desde la página');
    this.modalSvc.cerrar(); // ✅ Usa el servicio
  }

  // ==========================
  // SECCIÓN: AGENDA
  // ==========================
  beneficios = [
    {
      title: 'Asesoría<br>Personalizada',
      icon: 'assets/asesoria.svg',
      iconHover: 'assets/asesoria-hover.svg',
      hover: false
    },
    {
      title: 'Sin vueltas<br> innecesarias',
      icon: 'assets/vueltas.svg',
      iconHover: 'assets/vueltas-hover.svg',
      hover: false
    },
    {
      title: 'Seguridad <br>Jurídica',
      icon: 'assets/seguridad.svg',
      iconHover: 'assets/seguridad-hover.svg',
      hover: false
    }
  ];

  // ==========================
  // SECCIÓN: FAQ
  // ==========================
  faqItems: FaqItem[] = [
    {
      question: '¿Cómo se interpreta el reporte?',
      answer: 'Es muy sencillo, mira cómo puedes interpretarlo Aquí.'
    },
    {
      question: '¿CertiMás evita el peritaje?',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ut ligula nec purus varius faucibus.'
    },
    {
      question: '¿Puedo comparar varios vehículos?',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras lacinia, tortor a pharetra efficitur, nunc lorem porttitor velit.'
    },
    {
      question: '¿Qué debo hacer si no recibo el CertiMás que compré?',
      answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin a leo sit amet lectus tempor feugiat.'
    }
  ];

  // ==========================
  // SECCIÓN: BLOG
  // ==========================
  blogPosts: BlogPost[] = [
    {
      title: '¡No Esperes a Que Sea Tarde!',
      tag: 'Revisión Técnico Mecánica',
      excerpt: 'Descubre por qué debes realizar tu Revisión Técnico Mecánica ahora.',
      image: '/assets/blog/destacado.jpg',
      url: '/blog/revision-tecnico-mecanica'
    },
    {
      title: '¿Comprando usado?',
      image: '/assets/blog/blog1.jpg',
      url: '/blog/comprando-usado'
    },
    {
      title: '¿Qué es un peritaje vehicular y cuánto cuesta?',
      image: '/assets/blog/blog2.jpg',
      url: '/blog/peritaje-costo'
    },
    {
      title: '¿Qué es un peritaje vehicular y cuánto cuesta?',
      image: '/assets/blog/blog3.jpg',
      url: '/blog/peritaje-costo-2'
    }
  ];
}
import { Component, inject, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaqComponent, FaqItem } from '../../shared/faq/faq';
import { BlogSectionComponent, BlogPost } from '../../shared/blog-section/blog-section';
import { TramitesModalComponent } from '../../shared/tramites-modal/tramites-modal';
import { TramitesModalService } from '../../shared/tramites-modal/tramites-modal.service';
import { ContactoPopupComponent } from '../../shared/contacto-popup/contacto-popup';

@Component({
  selector: 'app-landing-tramites',
  standalone: true,
  imports: [
    CommonModule,
    FaqComponent,
    BlogSectionComponent,
    TramitesModalComponent,
    ContactoPopupComponent
  ],
  templateUrl: './landing-tramites.html',
  styleUrls: ['./landing-tramites.css']
})
export class LandingTramites implements AfterViewInit {
  private modalSvc = inject(TramitesModalService);

  // ==========================
  // 🧩 SECCIÓN: LISTADO DE TRÁMITES
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
    }
  ];

  toggleTramite(index: number) {
    this.tramites[index].open = !this.tramites[index].open;
  }

  // ==========================
  // 💬 SECCIÓN: MODAL DE TRÁMITES
  // ==========================
  selectedTramite = signal<any>(null);
  modalAbierta = signal(false);

  abrirModal(tramite?: any) {
    const tramiteSeleccionado = tramite || this.tramites[0];
    this.selectedTramite.set(tramiteSeleccionado);
    this.modalAbierta.set(true);
  }

  cerrarModal() {
    this.modalAbierta.set(false);
  }

  // ==========================
  // 💡 SECCIÓN: BENEFICIOS
  // ==========================
  beneficios = [
    {
      title: 'Asesoría<br>Personalizada',
      icon: 'assets/asesoria.svg',
      iconHover: 'assets/asesoria-hover.svg',
      hover: false
    },
    {
      title: 'Sin vueltas<br>innecesarias',
      icon: 'assets/vueltas.svg',
      iconHover: 'assets/vueltas-hover.svg',
      hover: false
    },
    {
      title: 'Seguridad<br>Jurídica',
      icon: 'assets/seguridad.svg',
      iconHover: 'assets/seguridad-hover.svg',
      hover: false
    }
  ];

  // ==========================
  // ❓ SECCIÓN: PREGUNTAS FRECUENTES
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
  // 📰 SECCIÓN: BLOG
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
    }
  ];

  // ==========================
  // 🔢 SECCIÓN: CONTADORES ANIMADOS
  // ==========================
  private initCounters() {
    const counters = document.querySelectorAll('.counter');

    const startCounting = (counter: Element) => {
      const target = +(counter.getAttribute('data-target') || '0');
      const speed = 30;
      let count = 0;

      const updateCount = () => {
        if (count < target) {
          count += Math.ceil(target / 100);
          (counter as HTMLElement).innerText = '+' + count;
          setTimeout(updateCount, speed);
        } else {
          (counter as HTMLElement).innerText = '+' + target;
        }
      };
      updateCount();
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startCounting(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach((counter) => observer.observe(counter));
  }

  ngAfterViewInit(): void {
    this.initCounters();
  }
}

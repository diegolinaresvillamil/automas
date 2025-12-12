import { Component, AfterViewInit, OnInit, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterModule, NavigationStart, ActivatedRoute, ParamMap } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';

// 🟠 Data de las ciudades
import { CIUDADES } from './data-ciudades';

// 🟣 Modales y componentes compartidos
import { SedesTarifasModalService } from '../../shared/sedes-tarifas-modal/sedes-tarifas-modal.service';
import { RtmModalService } from '../../shared/rtm-modal/rtm-modal.service';
import { PeritajeModalService } from '../../shared/peritaje-modal/peritaje-modal.service';

import { SedesTarifasModalComponent } from '../../shared/sedes-tarifas-modal/sedes-tarifas-modal';
import { RtmModalComponent } from '../../shared/rtm-modal/rtm-modal';
import { PeritajeModalComponent } from '../../shared/peritaje-modal/peritaje-modal';
import { BlogSectionComponent, BlogPost } from '../../shared/blog-section/blog-section';

@Component({
  selector: 'app-ciudad',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SedesTarifasModalComponent,
    RtmModalComponent,
    PeritajeModalComponent,
    BlogSectionComponent
  ],
  templateUrl: './ciudad.html',
  styleUrls: ['./ciudad.css']
})
export class CiudadComponent implements AfterViewInit, OnInit, OnDestroy {
  ciudad: any;
  showVideo = false;
  videoUrl?: SafeResourceUrl;
  userLocation: { lat: number; lon: number } | null = null;
  errorMessage: string | null = null;

  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private sedesModalSvc = inject(SedesTarifasModalService);
  private rtmModalSvc = inject(RtmModalService);
  private peritajeModalSvc = inject(PeritajeModalService);

  private routerSub?: Subscription;
  private paramSub?: Subscription;
  private animationId?: number;
  private heroAutoInterval: any = null;

  // =========================
  // 🔹 CICLO DE VIDA
  // =========================
  ngOnInit(): void {
    // 🏙️ Detectar y escuchar cambios de la ciudad desde la URL
    this.paramSub = this.route.paramMap.subscribe((params: ParamMap) => {
      const slug = params.get('slug');
      this.cargarCiudad(slug);
    });

    // 📍 Mantener comportamiento del home
    this.checkOrRequestLocation();

    // Cerrar modales cuando se navega
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        setTimeout(() => {
          this.sedesModalSvc.close();
          this.rtmModalSvc.close();
          this.peritajeModalSvc.close();
          this.stopAndCloseVideo();
          document.body.style.overflow = '';
          if (this.animationId) cancelAnimationFrame(this.animationId);
        }, 100);
      });
  }

  ngAfterViewInit(): void {
    this.initCounters();
    this.initAliadosCarousel();
    this.initHeroCarousel();
    this.initServiceHover();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.paramSub?.unsubscribe();
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.stopAndCloseVideo();
    document.body.style.overflow = '';

    if (this.heroAutoInterval) {
      clearInterval(this.heroAutoInterval);
      this.heroAutoInterval = null;
    }
  }

  // =========================
  // 🏙️ Cargar datos de la ciudad
  // =========================
  private cargarCiudad(slug: string | null): void {
    if (!slug) return;
    this.ciudad = CIUDADES.find(c => c.slug === slug);

    if (!this.ciudad) {
      this.ciudad = {
        nombre: 'Ciudad no encontrada',
        banner: '/assets/banners/default.jpg',
        titulo: 'Próximamente',
        descripcion: 'Estamos preparando esta ciudad. Muy pronto estará disponible.'
      };
    }

    // Al cambiar de ciudad sube el scroll al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================
  // 🖼️ Hover dinámico
  // =========================
  private initServiceHover() {
    const serviceIcons = document.querySelectorAll<HTMLImageElement>('.service-icon');
    serviceIcons.forEach(icon => {
      const normalSrc = icon.getAttribute('src');
      const hoverSrc = icon.getAttribute('data-hover');
      if (!normalSrc || !hoverSrc) return;

      icon.addEventListener('mouseenter', () => (icon.src = hoverSrc));
      icon.addEventListener('mouseleave', () => (icon.src = normalSrc));
    });
  }

  // =========================
  // 🟧 Modales
  // =========================
  abrirModalSedes() { this.sedesModalSvc.open(); }
  abrirModalRTM() { this.rtmModalSvc.open(); }
  abrirModalPeritaje() { this.peritajeModalSvc.open(); }

  // =========================
  // 📍 Localización
  // =========================
  private checkOrRequestLocation() {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        this.userLocation = JSON.parse(savedLocation);
      } catch {
        localStorage.removeItem('userLocation');
      }
    }
  }

  // =========================
  // 🔢 Contadores
  // =========================
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

  // =========================
  // 🤝 Carrusel Aliados
  // =========================
  private initAliadosCarousel() {
    const track = document.getElementById('sliderTrack');
    const leftArrow = document.querySelector('.arrow-left');
    const rightArrow = document.querySelector('.arrow-right');
    if (!track || !leftArrow || !rightArrow) return;

    leftArrow.addEventListener('click', () => track.scrollBy({ left: -200, behavior: 'smooth' }));
    rightArrow.addEventListener('click', () => track.scrollBy({ left: 200, behavior: 'smooth' }));

    let isHovered = false;
    track.addEventListener('mouseenter', () => (isHovered = true));
    track.addEventListener('mouseleave', () => (isHovered = false));

    const autoScroll = () => {
      if (!isHovered) {
        track.scrollLeft += 1;
        if (track.scrollLeft >= track.scrollWidth / 2) track.scrollLeft = 0;
      }
      this.animationId = requestAnimationFrame(autoScroll);
    };
    this.animationId = requestAnimationFrame(autoScroll);
  }

  // =========================
  // 🎞️ HERO CAROUSEL
  // =========================
  private initHeroCarousel() {
    setTimeout(() => {
      const track = document.getElementById('heroTrack') as HTMLElement | null;
      const slides = document.querySelectorAll('.hero-slide');
      const prevBtn = document.getElementById('heroPrev') as HTMLButtonElement | null;
      const nextBtn = document.getElementById('heroNext') as HTMLButtonElement | null;

      if (!track || slides.length === 0 || !prevBtn || !nextBtn) return;

      let currentIndex = 0;
      const totalSlides = slides.length;

      const goToSlide = (index: number) => {
        currentIndex = (index + totalSlides) % totalSlides;
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      };

      const nextSlide = () => goToSlide(currentIndex + 1);
      const prevSlide = () => goToSlide(currentIndex - 1);

      prevBtn.onclick = () => {
        prevSlide();
        restartAuto();
      };
      nextBtn.onclick = () => {
        nextSlide();
        restartAuto();
      };

      const startAuto = () => {
        if (this.heroAutoInterval) clearInterval(this.heroAutoInterval);
        this.heroAutoInterval = setInterval(() => nextSlide(), 5000);
      };

      const restartAuto = () => {
        if (this.heroAutoInterval) clearInterval(this.heroAutoInterval);
        startAuto();
      };

      track.addEventListener('mouseenter', () => {
        if (this.heroAutoInterval) clearInterval(this.heroAutoInterval);
      });
      track.addEventListener('mouseleave', () => startAuto());

      goToSlide(0);
      startAuto();
    }, 0);
  }

  // =========================
  // 🎬 Video Modal
  // =========================
  openVideo() {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.youtube.com/embed/sB2YyyTlJgU?autoplay=1&rel=0'
    ) as SafeResourceUrl;
    this.showVideo = true;
  }

  closeVideo() {
    this.showVideo = false;
  }

  private stopAndCloseVideo() {
    if (this.showVideo) {
      const iframe = document.querySelector<HTMLIFrameElement>('.video-content iframe');
      if (iframe) {
        const src = iframe.src;
        iframe.src = '';
        setTimeout(() => (iframe.src = src), 0);
      }
    }
    this.showVideo = false;
    this.videoUrl = undefined;
  }

  // =========================
  // BLOG POSTS
  // =========================
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

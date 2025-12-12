import { Component, AfterViewInit, ChangeDetectorRef, NgZone, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterModule, NavigationStart } from '@angular/router'; // 👈 importa RouterModule aquí
import { filter, Subscription } from 'rxjs';
import { FaqComponent } from '../../shared/faq/faq';

@Component({
  selector: 'app-certimas',
  standalone: true,
  imports: [CommonModule, RouterModule, FaqComponent], // 👈 agrégalo aquí
  templateUrl: './certimas.html',
  styleUrls: ['./certimas.css']
})
export class Certimas implements AfterViewInit, OnDestroy {
  // ===============================
  // 🎥 VARIABLES MODAL DE VIDEO
  // ===============================
  showVideo = false;
  videoUrl?: SafeResourceUrl;

  // ===============================
  // 🧠 INYECCIONES
  // ===============================
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private routerSub?: Subscription;

  // ===============================
  // 🧩 ITEMS DE ACORDEONES
  // ===============================
  leftItems = [
    { title: 'Licencia de tránsito', icon: 'bi bi-person-vcard', open: false },
    { title: 'Rotación promedio últimos 5 años', icon: 'bi bi-arrow-repeat', open: false },
    { title: 'Características del vehículo', icon: 'bi bi-car-front', open: false },
    { title: 'Regrabaciones', icon: 'bi bi-vinyl', open: false },
    { title: 'Rapidez', icon: 'bi bi-speedometer2', open: false },
  ];

  rightItems = [
    { title: 'Score', icon: 'bi bi-speedometer', open: false },
    { title: 'Revisión Técnico Mecánica', icon: 'bi bi-shield-check', open: false },
    { title: 'SOAT', icon: 'bi bi-clipboard-check', open: false },
    { title: 'Medidas cautelares', icon: 'bi bi-exclamation-octagon', open: false },
    { title: 'Información del propietario actual', icon: 'bi bi-person-lines-fill', open: false },
  ];

  // ===============================
  // ❓ FAQ ITEMS
  // ===============================
  faqItems = [
    {
      question: '¿Qué es CertiMás?',
      answer:
        'CertiMás es un informe que te muestra el historial del vehículo basado en su placa. Incluye datos de tránsito, revisiones y estado general.'
    },
    {
      question: '¿Puedo consultar más de un vehículo?',
      answer:
        'Sí. Puedes adquirir varios CertiMás y consultar diferentes placas según tus necesidades.'
    },
    {
      question: '¿De dónde proviene la información?',
      answer:
        'La información es obtenida de fuentes oficiales de tránsito y entidades certificadas en Colombia.'
    },
    {
      question: '¿El reporte incluye el SOAT y la Revisión Técnico-Mecánica?',
      answer:
        'Sí, CertiMás te muestra el estado actual del SOAT y la revisión técnico-mecánica del vehículo consultado.'
    },
    {
      question: '¿Qué métodos de pago aceptan?',
      answer:
        'Puedes pagar con tarjeta, PSE o a través de diferentes medios habilitados en la plataforma AutoMás.'
    }
  ];

  // ===============================
  // 🧭 CONTROL DE ACORDEONES
  // ===============================
  toggleLeft(index: number) {
    this.leftItems[index].open = !this.leftItems[index].open;
  }

  toggleRight(index: number) {
    this.rightItems[index].open = !this.rightItems[index].open;
  }

  // ===============================
  // 🎬 MODAL DE VIDEO (100% SEGURO)
  // ===============================
  openVideo() {
    this.videoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.youtube.com/embed/sB2YyyTlJgU?autoplay=1&rel=0'
    );
    this.showVideo = true;
  }

  closeVideo() {
    this.showVideo = false;
    this.videoUrl = undefined;
  }

  // ===============================
  // 🧹 LIMPIEZA AL CAMBIAR DE RUTA
  // ===============================
  ngAfterViewInit(): void {
    // Forzamos render para evitar errores en Angular SSR o DOM
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => this.cdr.detectChanges());
      }, 50);
    });

    // ✅ Limpia video al navegar (evita freeze)
    this.routerSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        this.closeVideo();
        document.body.style.overflow = '';
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.closeVideo();
    document.body.style.overflow = '';
  }
}

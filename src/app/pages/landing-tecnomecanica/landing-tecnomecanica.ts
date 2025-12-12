import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactoPopupComponent } from '../../shared/contacto-popup/contacto-popup';

type TipoServicio = 'Livianos' | 'Pesados' | 'Motos' | 'Eléctricos';

interface Sede {
  nombre: string;
  tipo: TipoServicio;
  img: string;
  tags?: string[];
}

@Component({
  selector: 'app-landing-tecnomecanica',
  standalone: true,
  imports: [CommonModule, FormsModule, ContactoPopupComponent],
  templateUrl: './landing-tecnomecanica.html',
  styleUrls: ['./landing-tecnomecanica.css']
})
export class LandingTecnomecanica implements AfterViewInit {

  filtroServicio: 'all' | TipoServicio = 'all';
  busqueda = '';

  private sedes: Sede[] = [
    { nombre: 'AutoMás Pesados Fontibón', tipo: 'Pesados', img: '/assets/sede.png' },
    { nombre: 'Calle 13', tipo: 'Livianos', img: '/assets/sede.png' },
    { nombre: 'Calle 63', tipo: 'Pesados', img: '/assets/sede.png' },
    { nombre: '1 de Mayo', tipo: 'Motos', img: '/assets/sede.png' },
    { nombre: 'Cajicá', tipo: 'Eléctricos', img: '/assets/sede.png' },
    { nombre: 'AutoMás 134', tipo: 'Pesados', img: '/assets/sede.png' },
    { nombre: 'NQS Sur', tipo: 'Livianos', img: '/assets/sede.png' },
    { nombre: 'Suba', tipo: 'Livianos', img: '/assets/sede.png' },
    { nombre: 'Chía', tipo: 'Eléctricos', img: '/assets/sede.png' },
  ];

  sedesFiltradas: Sede[] = [];

  constructor() {
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    const term = this.normalizar(this.busqueda);
    let lista = this.sedes.slice();

    if (this.filtroServicio !== 'all') {
      lista = lista.filter(s => s.tipo === this.filtroServicio);
    }

    if (term) {
      lista = lista.filter(s => this.normalizar(s.nombre).includes(term));
    }

    this.sedesFiltradas = lista;
  }

  private normalizar(txt: string): string {
    return (txt || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private initCounters() {
    const counters = document.querySelectorAll('.counter');
    const speed = 50;
    const animateCounter = (counter: Element) => {
      const target = +(counter.getAttribute('data-target') || '0');
      let count = 0;
      const update = () => {
        if (count < target) {
          count += Math.ceil(target / 100);
          (counter as HTMLElement).innerText = '+' + count;
          setTimeout(update, speed);
        } else {
          (counter as HTMLElement).innerText = '+' + target;
        }
      };
      update();
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
  }

  ngAfterViewInit(): void {
    this.initCounters();
  }
}

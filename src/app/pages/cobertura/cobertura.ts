import { Component } from '@angular/core';
import { FaqComponent, FaqItem } from '../../shared/faq/faq';
import { BlogSectionComponent, BlogPost } from '../../shared/blog-section/blog-section';
import { CoberturaModalComponent } from '../../shared/cobertura-modal/cobertura-modal';

@Component({
  selector: 'app-cobertura',
  standalone: true,
  imports: [FaqComponent, BlogSectionComponent, CoberturaModalComponent],
  templateUrl: './cobertura.html',
  styleUrls: ['./cobertura.css']
})
export class Cobertura {

  // ===========================
  // 🔸 Control modal
  // ===========================
  modalVisible = false;

  abrirModal() {
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
  }

  // ===========================
  // 🔸 Preguntas frecuentes
  // ===========================
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

  // ===========================
  // 🔸 Blog
  // ===========================
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

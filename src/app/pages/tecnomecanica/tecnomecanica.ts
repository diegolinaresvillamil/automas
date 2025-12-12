import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FaqComponent, FaqItem } from '../../shared/faq/faq';
import { BlogSectionComponent, BlogPost } from '../../shared/blog-section/blog-section';

@Component({
  selector: 'app-tecnomecanica',
  standalone: true,
  imports: [CommonModule, FaqComponent, BlogSectionComponent],
  templateUrl: './tecnomecanica.html',
  styleUrls: ['./tecnomecanica.css']
})
export class Tecnomecanica {
  // ===============================
  // 💬 Preguntas Frecuentes
  // ===============================
  faqItems: FaqItem[] = [
    { question: '¿Cómo se interpreta el reporte?', answer: 'Es muy sencillo, mira cómo puedes interpretarlo Aquí.' },
    { question: '¿CertiMás evita el peritaje?', answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer ut ligula nec purus varius faucibus.' },
    { question: '¿Puedo comparar varios vehículos?', answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras lacinia, tortor a pharetra efficitur, nunc lorem porttitor velit.' },
    { question: '¿Qué debo hacer si no recibo el CertiMás que compré?', answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin a leo sit amet lectus tempor feugiat.' }
  ];

  // ===============================
  // 📰 Blog Section
  // ===============================
  blogPosts: BlogPost[] = [
    { title: '¡No Esperes a Que Sea Tarde!', tag: 'Revisión Técnico Mecánica', excerpt: 'Descubre por qué debes realizar tu Revisión Técnico Mecánica ahora.', image: '/assets/blog/destacado.jpg', url: '/blog/revision-tecnico-mecanica' },
    { title: '¿Comprando usado?', image: '/assets/blog/blog1.jpg', url: '/blog/comprando-usado' },
    { title: '¿Qué es un peritaje vehicular y cuánto cuesta?', image: '/assets/blog/blog2.jpg', url: '/blog/peritaje-costo' },
    { title: '¿Qué es un peritaje vehicular y cuánto cuesta?', image: '/assets/blog/blog3.jpg', url: '/blog/peritaje-costo-2' }
  ];

  // ===============================
  // 💰 Tarjetas de precios
  // ===============================
  precios = [
    { titulo: 'Livianos Particulares', precio: '$310.193' },
    { titulo: 'Livianos Públicos', precio: '$309.193' },
    { titulo: 'Livianos eléctricos', precio: '$231.265' },
    { titulo: 'Motocicletas', precio: '$209.664' },
    { titulo: 'Ciclomotores', precio: '$160.000' },
    { titulo: 'Pesados Particulares', precio: '$444.658' },
    { titulo: 'Pesados Públicos', precio: '$453.000' },
    { titulo: 'Cuadriciclos', precio: '$398.000' }
  ];
}

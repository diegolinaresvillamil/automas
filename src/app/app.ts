import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// 🔹 Componentes globales
import { Header } from './core/header/header';
import { Footer } from './core/footer/footer';
import { CiudadModalComponent } from './shared/ciudad-modal/ciudad-modal'; // ✅ Importamos la modal

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, // 🔸 Renderiza las rutas
    Header,       // 🔸 Encabezado global
    Footer,       // 🔸 Pie de página
    CiudadModalComponent // ✅ Modal de ciudades (queda disponible en todo el sitio)
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}

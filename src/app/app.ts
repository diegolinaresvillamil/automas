import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// 🔹 Componentes globales
import { Header } from './core/header/header';
import { Footer } from './core/footer/footer';
import { CiudadModalComponent } from './shared/ciudad-modal/ciudad-modal';
import { PaymentModalComponent } from './shared/payment-modal/payment-modal'; // ✅ AGREGAR

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Header,
    Footer,
    CiudadModalComponent,
    PaymentModalComponent // ✅ AGREGAR (Modal de pago centralizado)
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}
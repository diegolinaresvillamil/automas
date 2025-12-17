import { Routes } from '@angular/router';

// Páginas principales
import { Inicio } from './pages/inicio/inicio';
import { Tecnomecanica } from './pages/tecnomecanica/tecnomecanica';
import { Certimas } from './pages/certimas/certimas';
import { Peritaje } from './pages/peritaje/peritaje';
import { Tramites } from './pages/tramites/tramites';
import { Cobertura } from './pages/cobertura/cobertura';
import { LandingTecnomecanica } from './pages/landing-tecnomecanica/landing-tecnomecanica';
import { LandingPeritaje } from './pages/landing-peritaje/landing-peritaje';
import { LandingTramites } from './pages/landing-tramites/landing-tramites';
import { CheckoutCertimas } from './pages/checkout-certimas/checkout-certimas';

// Nueva landing dinámica por ciudad
import { CiudadComponent } from './pages/ciudad/ciudad';

// 💳 Páginas de resultado de pago
import { PagoExitoso } from './pages/pago-exitoso/pago-exitoso';
import { PagoFallido } from './pages/pago-fallido/pago-fallido';
import { PagoPendiente } from './pages/pago-pendiente/pago-pendiente';


export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'tecnomecanica', component: Tecnomecanica },
  { path: 'landing-tecnomecanica', component: LandingTecnomecanica },
  { path: 'landing-peritaje', component: LandingPeritaje },
  { path: 'landing-tramites', component: LandingTramites },
  { path: 'checkout-certimas', component: CheckoutCertimas },
  { path: 'certimas', component: Certimas },
  { path: 'peritaje', component: Peritaje },
  { path: 'tramites', component: Tramites },
  { path: 'cobertura', component: Cobertura },

  // 🟠 Ruta dinámica para landings de ciudad
  { path: 'ciudad/:slug', component: CiudadComponent },

  // 💳 Rutas de resultado de pago
  { 
    path: 'pago-exitoso', 
    component: PagoExitoso,
    title: 'Pago Exitoso | AutoMás'
  },
  { 
    path: 'pago-fallido', 
    component: PagoFallido,
    title: 'Pago Rechazado | AutoMás'
  },
  { 
    path: 'pago-pendiente', 
    component: PagoPendiente,
    title: 'Pago Pendiente | AutoMás'
  },

  // Redirección por defecto (DEBE IR AL FINAL)
  { path: '**', redirectTo: '' }
];
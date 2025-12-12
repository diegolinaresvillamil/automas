import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// ✅ Importaciones de router
import { provideRouter, withViewTransitions, withEnabledBlockingInitialNavigation } from '@angular/router';
import { routes } from './app/app.routes';
import { Router } from '@angular/router';

// ✅ Configuración completa
bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),

    // 🔹 Configura las rutas con soporte de recarga y animaciones
    provideRouter(
      routes,
      withEnabledBlockingInitialNavigation(), // ✅ Maneja correctamente reloads (recargas directas)
      withViewTransitions() // ✅ Transiciones suaves opcionales
    ),
  ],
})
  .then((appRef) => {
    // ✅ Restablece scroll al inicio en cada navegación
    const router = appRef.injector.get(Router);
    router.events.subscribe((event: any) => {
      if (event.constructor.name === 'NavigationEnd') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  })
  .catch((err) => console.error(err));

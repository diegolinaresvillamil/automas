import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TramitesModalService {
  // 🔹 Estado reactivo para el "open" de la modal
  private openSubject = new BehaviorSubject<boolean>(false);
  open$ = this.openSubject.asObservable();

  // 🔹 Señal para guardar el trámite actual (si se necesita)
  tramite = signal<any>(null);

  // 👉 Abre la modal con un trámite específico (opcional)
  abrir(tramite?: any) {
    if (tramite) this.tramite.set(tramite);
    this.openSubject.next(true);
  }

  // 👉 Cierra la modal
  cerrar() {
    this.openSubject.next(false);
  }

  // 👉 Devuelve el valor actual de si está abierta o no
  get isOpen(): boolean {
    return this.openSubject.value;
  }
}

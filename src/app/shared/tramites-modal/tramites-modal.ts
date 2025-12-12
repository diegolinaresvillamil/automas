import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { TramitesModalService } from './tramites-modal.service';

@Component({
  selector: 'app-tramites-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tramites-modal.html',
  styleUrls: ['./tramites-modal.css'],
})
export class TramitesModalComponent implements OnInit, OnDestroy {
  // ===============================
  // 🔧 Inyecciones
  // ===============================
  private modalSvc = inject(TramitesModalService);

  // ===============================
  // 📥 Inputs / Outputs
  // ===============================
  @Input() open: boolean = false;
  @Input() tramiteSeleccionado: any = null;
  @Output() cerrar = new EventEmitter<void>();

  // ===============================
  // 📦 Variables
  // ===============================
  sub?: Subscription;
  mostrarError = false;
  step = 1;
  fechaSeleccionada: string = '';

  tramites = [
    { title: 'Matrícula/Registro', icon: 'assets/matricula.svg' },
    { title: 'Traspaso', icon: 'assets/traspaso.svg' },
    { title: 'Traslado Matrícula', icon: 'assets/traslado.svg' },
    { title: 'Radicado y Matrícula', icon: 'assets/radicado.svg' },
    { title: 'Cambio de color', icon: 'assets/color.svg' },
    { title: 'Regrabar Chasis', icon: 'assets/chasis.svg' },
    { title: 'Regrabación de Motor', icon: 'assets/motor.svg' },
    { title: 'Cambio de servicio', icon: 'assets/servicio.svg' },
    { title: 'Transformación', icon: 'assets/transformacion.svg' },
    { title: 'Duplicado', icon: 'assets/duplicado.svg' },
    { title: 'Levantamiento Prenda', icon: 'assets/prenda.svg' },
    { title: 'Cancelación de Matrícula', icon: 'assets/cancelacion.svg' },
  ];

  // ===============================
  // 🧠 Ciclo de vida
  // ===============================
  ngOnInit(): void {
    this.sub = this.modalSvc.open$.subscribe((isOpen) => {
      this.open = isOpen;
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    document.body.style.overflow = '';
  }

  // ===============================
  // ⚙️ Métodos principales
  // ===============================
  seleccionarTramite(tramite: any): void {
    this.tramiteSeleccionado = tramite;
    this.mostrarError = false;
  }

  continuar(): void {
    if (!this.tramiteSeleccionado) {
      this.mostrarError = true;
      return;
    }

    console.log('✅ Continuar con el trámite:', this.tramiteSeleccionado);
    this.step = 2; // Pasar a la pantalla de sede y fecha
  }

  agendarRevision(): void {
    if (!this.tramiteSeleccionado || !this.fechaSeleccionada) {
      alert('Por favor selecciona un trámite y una fecha antes de continuar.');
      return;
    }

    console.log('🗓️ Agendando revisión para:', this.tramiteSeleccionado.title);
    console.log('📅 Fecha seleccionada:', this.fechaSeleccionada);

    this.cerrar.emit();
    this.modalSvc.cerrar();
    this.step = 1;
  }

  cerrarModal(): void {
    this.cerrar.emit();
    this.modalSvc.cerrar();
    this.step = 1;
  }

  // ===============================
  // 🧩 Helpers
  // ===============================
  get fechaMinima(): string {
    // Devuelve la fecha de hoy como mínimo permitido
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }
}

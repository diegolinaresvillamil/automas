import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CiudadModalService } from '../../shared/ciudad-modal/ciudad-modal.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header {
  // ===============================
  // 🔹 CONTROL DE MENÚS
  // ===============================
  topMenuOpen = false;
  navMenuOpen = false;

  constructor(private ciudadModalSvc: CiudadModalService) {}

  // 🟠 Abre/cierra el menú superior (elige ciudad, whatsapp, etc.)
  toggleTopMenu(): void {
    this.topMenuOpen = !this.topMenuOpen;
  }

  // ⚪ Abre/cierra el menú principal (Tecnomecánica, etc.)
  toggleNavMenu(): void {
    this.navMenuOpen = !this.navMenuOpen;
  }

  // ✅ Cierra el menú principal al seleccionar una opción (opcional)
  closeNavMenu(): void {
    this.navMenuOpen = false;
  }

  // 🧭 Abre la modal de ciudades
  abrirModalCiudad(): void {
    this.ciudadModalSvc.open();
  }
}

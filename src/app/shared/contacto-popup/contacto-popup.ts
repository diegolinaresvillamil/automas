import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contacto-popup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacto-popup.html',
  styleUrls: ['./contacto-popup.css']
})
export class ContactoPopupComponent {
  modalVisible = false;

  formData = {
    nombre: '',
    placa: '',
    correo: '',
    telefono: '',
    acepta: false
  };

  abrirModal() {
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
  }

  onSubmit() {
    if (!this.formData.acepta) {
      alert('Debes aceptar el tratamiento de datos personales.');
      return;
    }
    console.log('Formulario enviado', this.formData);
    alert('✅ ¡Gracias! Pronto un asesor se pondrá en contacto contigo.');
    this.modalVisible = false;
  }

  // Cierra si el usuario hace clic fuera del modal
  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent) {
    const modalContent = document.querySelector('.popup-content');
    if (this.modalVisible && modalContent && !modalContent.contains(event.target as Node)) {
      this.cerrarModal();
    }
  }
}

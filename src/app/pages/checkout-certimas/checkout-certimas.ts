import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-checkout-certimas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout-certimas.html',
  styleUrls: ['./checkout-certimas.css']
})
export class CheckoutCertimas {
  // ===============================
  // 🔹 VARIABLES
  // ===============================
  cantidadCertimas = 1;
  vehiculos: any[] = [];
  mostrarResumen = false;
  mostrarModalPlaca = false;
  placaTemporal = '';
  placaIndex = -1;

  // Datos solicitante y facturación
  solicitante: any = {
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    tipoId: '',
    identificacion: '',
    departamento: '',
    ciudad: '',
    direccion: '',
    empresa: ''
  };

  facturacion: any = {
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    tipoId: '',
    identificacion: '',
    departamento: '',
    ciudad: '',
    direccion: '',
    empresa: ''
  };

  mismosDatos = false;

  // ===============================
  // 🔹 CONSTRUCTOR E INICIALIZACIÓN
  // ===============================
  constructor(private route: ActivatedRoute) {
    // ✅ Recibir la cantidad desde los queryParams (por ejemplo ?cantidad=3)
    this.route.queryParams.subscribe(params => {
      const cant = Number(params['cantidad']);
      this.cantidadCertimas = cant && [1, 3, 5].includes(cant) ? cant : 1;
      this.generarCamposVehiculos(this.cantidadCertimas);
    });
  }

  seleccionarCantidad(num: number) {
    this.cantidadCertimas = num;
    this.generarCamposVehiculos(num);
  }

  generarCamposVehiculos(num: number) {
    this.vehiculos = [];
    for (let i = 1; i <= num; i++) {
      this.vehiculos.push({
        placa: '',
        kilometraje: '',
        departamento: '',
        ciudad: ''
      });
    }
  }

  // ===============================
  // 🔹 MODAL DE CONFIRMACIÓN DE PLACA
  // ===============================
  abrirModalPlaca(index: number) {
    const placa = this.vehiculos[index].placa;
    if (placa && placa.length >= 5) {
      this.placaTemporal = placa.toUpperCase();
      this.placaIndex = index;
      this.mostrarModalPlaca = true;
    }
  }

  confirmarPlaca() {
    this.mostrarModalPlaca = false;
    this.placaIndex = -1;
  }

  corregirPlaca() {
    if (this.placaIndex !== -1) {
      this.vehiculos[this.placaIndex].placa = '';
    }
    this.mostrarModalPlaca = false;
    this.placaIndex = -1;
  }

  // ===============================
  // 🔹 COPIAR DATOS SOLICITANTE → FACTURACIÓN
  // ===============================
  copiarDatosFacturacion() {
    if (this.mismosDatos) {
      this.facturacion = { ...this.solicitante };
    } else {
      this.facturacion = {
        nombres: '',
        apellidos: '',
        correo: '',
        telefono: '',
        tipoId: '',
        identificacion: '',
        departamento: '',
        ciudad: '',
        direccion: '',
        empresa: ''
      };
    }
  }

  // ===============================
  // 🔹 VALIDACIÓN Y RESUMEN
  // ===============================
  realizarPedido(form: NgForm) {
    if (!form.valid) {
      alert('Por favor completa todos los campos obligatorios antes de continuar.');
      return;
    }

    // Verificar que todas las placas estén confirmadas
    for (const v of this.vehiculos) {
      if (!v.placa) {
        alert('Debes ingresar y confirmar todas las placas.');
        return;
      }
    }

    this.mostrarResumen = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

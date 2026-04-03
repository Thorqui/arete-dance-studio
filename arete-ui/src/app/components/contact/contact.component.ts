import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
    selector: 'app-contact',
    standalone: true,
    imports: [CommonModule, FormsModule, HttpClientModule],
    templateUrl: './contact.component.html',
    styleUrls: ['./contact.component.scss']
})
export class ContactComponent {

    // Data model matching FastAPI backend
    contactData = {
        name: '',
        email: '',
        phone: '',
        message: ''
    };

    successMessage = '';
    errorMessage = '';
    isSubmitting = false;

    constructor(private http: HttpClient) { }

    onSubmit(form: NgForm) {
        if (form.valid) {
            this.isSubmitting = true;
            this.successMessage = '';
            this.errorMessage = '';

            // Send standard Form Payload to FastAPI endpoint
            this.http.post<any>('http://localhost:8000/api/contact', this.contactData).subscribe({
                next: (response) => {
                    this.successMessage = response.message || 'Mensaje enviado con éxito.';
                    this.isSubmitting = false;
                    form.resetForm();
                },
                error: (err) => {
                    console.error(err);
                    this.errorMessage = 'Hubo un error enviando el mensaje. Por favor intenta tarde.';
                    this.isSubmitting = false;
                }
            });
        }
    }
}

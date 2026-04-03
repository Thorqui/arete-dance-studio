import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CmsService } from '../../services/cms.service';

@Component({
  selector: 'app-classes-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './classes-view.html',
  styleUrl: './classes-view.scss',
})
export class ClassesView implements OnInit {
  cms = inject(CmsService);
  classes: any[] = [];
  fixedGroups: any[] = [];
  
  // Chat
  messages: any[] = [];
  newMessageText: string = '';
  studentId = 2;
  adminId = 1;

  ngOnInit() {
    this.loadClasses();
    this.loadEnrollments();
    this.loadChat();
  }

  loadChat() {
      this.cms.getChatHistory(this.studentId, this.adminId).subscribe({
          next: msgs => this.messages = msgs,
          error: console.error
      });
  }

  sendMessage() {
      if(!this.newMessageText.trim()) return;
      this.cms.sendMessage({ sender_id: this.studentId, recipient_id: this.adminId, content: this.newMessageText }).subscribe({
          next: () => {
              this.newMessageText = '';
              this.loadChat();
          }
      });
  }

  loadClasses() {
    // Clases sueltas / Refuerzos
    this.cms.getAvailableClasses().subscribe({
        next: (data) => this.classes = data,
        error: (err) => console.error('Error fetching classes', err)
    });
  }

  loadEnrollments() {
    // Grupos fijos (Fase 5). Hardcodeamos el id 2 para el alumno@arete.com demo
    this.cms.getUserEnrollments(2).subscribe({
        next: (data) => this.fixedGroups = data,
        error: (err) => console.error('Error fetching enrollments', err)
    });
  }

  bookSpot(classId: number) {
      // Mock user_id = 2 (id del estudiante por default seeders) para MVP
      this.cms.createBooking({ class_session_id: classId, user_id: 2 }).subscribe({
          next: () => {
              alert('Plaza reservada con éxito. ¡Te esperamos en clase!');
              this.loadClasses();
          },
          error: e => alert('Error: ' + (e.error?.detail || 'No quedan plazas'))
      });
  }
}

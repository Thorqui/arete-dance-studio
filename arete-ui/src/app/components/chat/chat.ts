import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CmsService } from '../../services/cms.service';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat implements OnInit {
  cms = inject(CmsService);
  route = inject(ActivatedRoute);

  role: string = 'student';
  messages: any[] = [];
  newMessageText: string = '';
  
  studentId = 2;
  adminId = 1;

  users: any[] = [];
  selectedStudentChatId: number | null = null;
  selectedGroup: string = 'todos';

  ngOnInit() {
      this.role = this.route.snapshot.data['role'] || 'student';
      if (this.role === 'student') {
         this.selectedStudentChatId = this.adminId;
         this.loadChat();
      } else {
         this.loadUsers();
      }
  }

  loadUsers() {
      this.cms.getUsers().subscribe(u => this.users = u);
  }

  selectChat(stuId: number | null, groupType: string = '') {
      this.selectedStudentChatId = stuId;
      this.selectedGroup = groupType;
      if(stuId) this.loadChat();
      else this.messages = [];
  }

  loadChat() {
      if(!this.selectedStudentChatId) return;
      const id1 = this.role === 'admin' ? this.adminId : this.studentId;
      const id2 = this.role === 'admin' ? this.selectedStudentChatId : this.adminId;
      this.cms.getChatHistory(id1, id2).subscribe(msgs => this.messages = msgs);
  }

  sendMessage() {
      if(!this.newMessageText.trim()) return;
      
      const sender = this.role === 'admin' ? this.adminId : this.studentId;

      if (this.role === 'admin' && !this.selectedStudentChatId) {
          // BROADCAST MODE
          let targets: any[] = [];
          if (this.selectedGroup === 'todos') {
              targets = this.users.filter(u => u.id !== this.adminId);
          } else if (this.selectedGroup === 'alumnos') {
              targets = this.users.filter(u => u.role === 'student');
          } else if (this.selectedGroup === 'profesores') {
              targets = this.users.filter(u => u.role === 'admin' && u.id !== this.adminId);
          }
          
          targets.forEach(u => {
              this.cms.sendMessage({ sender_id: sender, recipient_id: u.id, content: this.newMessageText }).subscribe();
          });
          alert('¡Mensaje enviado a todo el grupo seleccionado (' + targets.length + ' personas)!');
          this.newMessageText = '';
          return;
      }

      const recipient = this.role === 'admin' ? this.selectedStudentChatId : this.adminId;
      if (!recipient) return;

      this.cms.sendMessage({ sender_id: sender, recipient_id: recipient, content: this.newMessageText }).subscribe(() => {
          this.newMessageText = '';
          this.loadChat();
      });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CmsService } from '../../services/cms.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  cms = inject(CmsService);
  
  heroForm: any = { layout: {}, stats: [] };
  aboutForm: any = { layout: {}, images: [] };
  stylesForm: any = { items: [] };
  scheduleForm: any = { slots: [] };
  footerForm: any = {};
  pwaForm: any = {};

  activeTab: 'landing' | 'cms' | 'academia' = 'landing';

  // Fase 3
  users: any[] = [];
  newUserForm: any = { role: 'student' };
  classes: any[] = [];
  newClassForm: any = { total_spots: 2, target_role: 'general' };

  // Fase 5
  groups: any[] = [];
  newGroupForm: any = { max_students: 20 };
  newEnrollmentForm: any = {};

  // Fase 6
  chatMessages: any[] = [];
  newAdminMessage: string = '';
  selectedStudentChatId: number | null = null;
  adminId = 1;

  ngOnInit() {
    const heroData = this.cms.heroData();
    const aboutData = this.cms.aboutData();
    const stylesData = this.cms.stylesData();
    const scheduleData = this.cms.scheduleData();
    const footerData = this.cms.footerData();
    
    if(heroData) this.heroForm = JSON.parse(JSON.stringify(heroData));
    if(aboutData) {
        this.aboutForm = JSON.parse(JSON.stringify(aboutData));
        if(!this.aboutForm.images) this.aboutForm.images = ['', '', ''];
        if(!this.aboutForm.layout) this.aboutForm.layout = { imageAlignment: 'left' };
    }
    
    if(stylesData) {
        this.stylesForm = JSON.parse(JSON.stringify(stylesData));
        if(!this.stylesForm.items) this.stylesForm.items = [];
    }
    if(scheduleData) {
        this.scheduleForm = JSON.parse(JSON.stringify(scheduleData));
        if(!this.scheduleForm.slots) this.scheduleForm.slots = [];
    }
    if(footerData) this.footerForm = JSON.parse(JSON.stringify(footerData));
    
    const pwaData = this.cms.pwaConfigData();
    if (pwaData) this.pwaForm = JSON.parse(JSON.stringify(pwaData));

    this.loadUsers();
    this.loadClasses();
    this.loadGroups();
  }

  loadUsers() {
    this.cms.getUsers().subscribe({next: res => this.users = res, error: e => console.error(e)});
  }

  loadClasses() {
    this.cms.getClasses().subscribe({next: res => this.classes = res, error: e => console.error(e)});
  }

  loadGroups() {
    this.cms.getGroups().subscribe({next: res => this.groups = res, error: e => console.error(e)});
  }

  saveHero() {
    this.cms.updateCmsData('hero', this.heroForm).subscribe({
      next: () => alert('Hero actualizado correctamente.'),
      error: (e) => alert('Error: ' + e.message)
    });
  }

  saveAbout() {
    this.cms.updateCmsData('about', this.aboutForm).subscribe({
      next: () => alert('About actualizado correctamente.'),
      error: (e) => alert('Error: ' + e.message)
    });
  }

  // FASE 7 Arrays form methods
  addStyle() {
      if(!this.stylesForm.items) this.stylesForm.items = [];
      this.stylesForm.items.push({ id: '', name: '', videoUrl: '', number: '', description: '' });
  }
  removeStyle(i: number) { this.stylesForm.items.splice(i, 1); }

  addScheduleSlot() {
      if(!this.scheduleForm.slots) this.scheduleForm.slots = [];
      this.scheduleForm.slots.push({ id: '', time: '', title: '', subtitle: '', teacher: '', extraClass: '' });
  }
  removeScheduleSlot(i: number) { this.scheduleForm.slots.splice(i, 1); }

  saveStyles() {
      this.cms.updateCmsData('styles', this.stylesForm).subscribe({
          next: () => alert('Estilos actualizados.'),
          error: (e) => alert('Error: ' + e.message)
      });
  }

  saveSchedule() {
      this.cms.updateCmsData('schedule', this.scheduleForm).subscribe({
          next: () => alert('Horarios actualizados.'),
          error: (e) => alert('Error: ' + e.message)
      });
  }

  saveFooter() {
    this.cms.updateCmsData('footer', this.footerForm).subscribe({
      next: () => alert('Footer actualizado.'),
      error: (e) => alert('Error: ' + e.message)
    });
  }

  savePwa() {
    this.cms.updateCmsData('pwa-config', this.pwaForm).subscribe({
      next: () => alert('PWA Config actualizada.'),
      error: (e) => alert('Error: ' + e.message)
    });
  }

  createUser() {
    this.cms.createUser(this.newUserForm).subscribe({
        next: () => { alert('Usuario creado.'); this.newUserForm = { role: 'student'}; this.loadUsers(); },
        error: (e) => alert('Error: ' + (e.error?.detail || e.message))
    });
  }

  createClass() {
    this.cms.createClass(this.newClassForm).subscribe({
        next: () => { alert('Clase programada con éxito.'); this.newClassForm = { total_spots: 20}; this.loadClasses(); },
        error: (e: any) => alert('Error: ' + (e.error?.detail || e.message))
    });
  }

  deleteClass(id: number) {
    if(confirm('¿Seguro que deseas eliminar esta clase puntual de la cartelera?')) {
        this.cms.deleteClass(id).subscribe(() => {
            this.loadClasses();
        });
    }
  }

  createGroup() {
    this.cms.createGroup(this.newGroupForm).subscribe({
        next: () => { alert('Grupo fijo creado con éxito.'); this.newGroupForm = { max_students: 20 }; this.loadGroups(); },
        error: (e) => alert('Error: ' + (e.error?.detail || e.message))
    });
  }

  enrollStudent() {
    this.cms.enrollStudent(this.newEnrollmentForm).subscribe({
        next: () => { alert('Alumno matriculado en el grupo.'); this.newEnrollmentForm = {}; },
        error: (e) => alert('Error: ' + (e.error?.detail || e.message))
    });
  }

  // FASE 6 CHAT
  selectStudentChat(stuId: number) {
      this.selectedStudentChatId = stuId;
      this.loadChat();
  }

  loadChat() {
      if(!this.selectedStudentChatId) return;
      this.cms.getChatHistory(this.adminId, this.selectedStudentChatId).subscribe(msgs => this.chatMessages = msgs);
  }

  sendAdminMessage() {
      if(!this.newAdminMessage.trim() || !this.selectedStudentChatId) return;
      this.cms.sendMessage({ sender_id: this.adminId, recipient_id: this.selectedStudentChatId, content: this.newAdminMessage }).subscribe(() => {
          this.newAdminMessage = '';
          this.loadChat();
      });
  }
}

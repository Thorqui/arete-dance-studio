from database import engine, SessionLocal, Base
import models
from sqlalchemy.orm import Session

# Create tables
Base.metadata.create_all(bind=engine)

def seed_data(db: Session):
    sections = [
        models.CMSSection(
            slug="hero",
            content={
                "badge": "Tu academia de baile",
                "title": "Siente",
                "accent": "el movimiento.",
                "description": "Aprende a bailar, conecta con personas con la misma pasión y disfruta de un ambiente único. Salsa, Bachata, Comercial y más — tu ritmo te espera.",
                "videoUrl": "assets/img/AQNT1hxpNCSwTf6AHXNXU9-fjuRiuMMCiD2doW344H7v-IvTiB_aFHZb--il2aI6NZ6v47UpGHKNJoOMq5ZkSqp7f6XDGNkwtklsmOk..mp4",
                "stats": [
                    {"value": "+100", "label": "Alumnos"},
                    {"value": "4", "label": "Estilos"},
                    {"value": "5", "label": "Días / semana"}
                ],
                "layout": {
                    "alignment": "left",
                    "titleSize": "h1"
                }
            }
        ),
        models.CMSSection(
            slug="about",
            content={
                "overline": "Sobre nosotros",
                "title": "Pasión por",
                "accent": "el baile.",
                "bodyPrimary": "Somos Arete Dance Studio, una academia fundada en 2023 pero con muchos años de baile en nuestras piernas. Ofrecemos clases de alta calidad en bachata, salsa, comercial y ladys styling, con instructores experimentados comprometidos con crear un ambiente divertido y acogedor para todos los niveles.",
                "bodySecondary": "Creemos que el baile es una forma maravillosa de expresión, ejercicio y conexión social. ¡Únete a nuestra comunidad y descubre tu ritmo!",
                "images": [
                    "assets/img/Grupal2.jpg",
                    "assets/img/Grupal1.jpg",
                    "assets/img/Grupal3.jpg"
                ],
                "highlights": [
                    {"icon": "fa-graduation-cap", "label": "Todos los niveles"},
                    {"icon": "fa-heart", "label": "Ambiente familiar"},
                    {"icon": "fa-music", "label": "4 estilos de baile"}
                ],
                "layout": {
                    "imageAlignment": "left"
                }
            }
        ),
        models.CMSSection(
            slug="styles",
            content={
                "overline": "Aprende con nosotros",
                "title": "Elige tu",
                "accent": "estilo.",
                "subtitle": "Explora nuestra oferta de clases y encuentra el ritmo que más te apasiona.",
                "items": [
                    {
                        "id": "bachata",
                        "name": "Bachata",
                        "videoUrl": "assets/videos/Bachata.mp4",
                        "number": "01",
                        "description": "La bachata nació en la República Dominicana y es hoy uno de los bailes de pareja más populares del mundo. Destaca por sus pasos fluidos..."
                    },
                    {
                        "id": "salsa",
                        "name": "Salsa",
                        "videoUrl": "assets/videos/salsa.mp4",
                        "number": "02",
                        "description": "Un género de origen caribeño que funde ritmos afrocubanos, jazz y mambo en una explosión de energía."
                    },
                    {
                        "id": "comercial",
                        "name": "Comercial",
                        "videoUrl": "assets/videos/comercial.mp4",
                        "number": "03",
                        "description": "El Commercial Dance es el estilo que ves en videoclips de artistas pop, hip-hop y R&B."
                    },
                    {
                        "id": "ladys",
                        "name": "Ladys Styling",
                        "videoUrl": "assets/videos/ladys.mp4",
                        "number": "04",
                        "description": "Clases diseñadas para potenciar la feminidad, la postura y la expresión corporal."
                    }
                ],
                "layout": {
                    "alignment": "center"
                }
            }
        ),
        models.CMSSection(
            slug="schedule",
            content={
                "overline": "Planifica tu semana",
                "title": "Nuestros",
                "accent": "horarios.",
                "days": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
                "slots": [
                    { "time": "17:00 – 18:00", "classes": ["bachata", "", "comercial", "", "ladys"] },
                    { "time": "18:00 – 19:00", "classes": ["salsa", "bachata", "salsa", "comercial", "bachata"] },
                    { "time": "19:00 – 20:00", "classes": ["comercial", "salsa", "ladys", "salsa", ""] },
                    { "time": "20:00 – 21:00", "classes": ["ladys", "comercial", "bachata", "ladys", "salsa"] },
                    { "time": "21:00 – 22:00", "classes": ["", "ladys", "salsa", "bachata", "comercial"] }
                ]
            }
        ),
        models.CMSSection(
            slug="footer",
            content={
                "brandPrimary": "Arete",
                "brandSecondary": "Dance Studio",
                "description": "Tu academia de baile en 2023 — pasión, ritmo y conexión.",
                "instagramUrl": "https://www.instagram.com/arete.dancestudio/",
                "copyright": "Arete Dance Studio — Todos los derechos reservados."
            }
        ),
        models.CMSSection(
            slug="pwa-config",
            content={
                "name": "Arete Dance Studio",
                "shortName": "Arete",
                "themeColor": "#FF3366",
                "backgroundColor": "#121212",
                "display": "standalone"
            }
        )
    ]
    
    for section in sections:
        existing = db.query(models.CMSSection).filter(models.CMSSection.slug == section.slug).first()
        if not existing:
            db.add(section)
        else:
            existing.content = section.content # Update with new structured content if already exists
            
    db.commit()

    # --- FASE 3: Semilla Relacional (Usuarios y Clases) ---
    import datetime
    
    admin_user = db.query(models.User).filter(models.User.email == "moniarete").first()
    if not admin_user:
        admin_user = models.User(email="moniarete", password_hash="moni2026", role="admin", name="Moni Arete")
        db.add(admin_user)
        
    # Mantener el anterior por si acaso, o podrías borrarlo si quieres
    old_admin = db.query(models.User).filter(models.User.email == "admin@arete.com").first()
    if not old_admin:
        old_admin = models.User(email="admin@arete.com", password_hash="admin123", role="admin", name="Admin Arete")
        db.add(old_admin)
        
    student_user = db.query(models.User).filter(models.User.email == "alumno@arete.com").first()
    if not student_user:
        student_user = models.User(email="alumno@arete.com", password_hash="alumno123", role="student", name="Alumno Demo")
        db.add(student_user)
        
    # Clases de Ejemplo Programadas y Refuerzos
    if db.query(models.ClassSession).count() == 0:
        now = datetime.datetime.utcnow()
        classes = [
            models.ClassSession(name="Salsa Intermedio - Faltan chicos", start_time=now + datetime.timedelta(days=1, hours=19), total_spots=2, available_spots=2, target_role="chicos"),
            models.ClassSession(name="Bachata Sensual - Faltan chicas", start_time=now + datetime.timedelta(days=2, hours=20), total_spots=3, available_spots=3, target_role="chicas"),
            models.ClassSession(name="Comercial Nivel 1", start_time=now + datetime.timedelta(days=1, hours=18), total_spots=20, available_spots=20, target_role="general")
        ]
        db.add_all(classes)
        
    # FASE 5: Grupos Fijos
    if db.query(models.ClassGroup).count() == 0:
        groups = [
            models.ClassGroup(name="Bachata 0", schedule_description="Lunes 18:00 - 19:30", max_students=20),
            models.ClassGroup(name="Bachata 1", schedule_description="Martes 19:00 - 20:30", max_students=15),
            models.ClassGroup(name="Bachata 2", schedule_description="Miércoles 20:00 - 21:30", max_students=10),
            models.ClassGroup(name="Salsa 0", schedule_description="Jueves 18:00 - 19:30", max_students=20),
            models.ClassGroup(name="Salsa 1", schedule_description="Viernes 19:00 - 20:30", max_students=15)
        ]
        db.add_all(groups)
        db.commit()
        
        # Enrolar al alumno demo a un par de clases
        bachata_1 = db.query(models.ClassGroup).filter(models.ClassGroup.name == "Bachata 1").first()
        salsa_0 = db.query(models.ClassGroup).filter(models.ClassGroup.name == "Salsa 0").first()
        
        if student_user and bachata_1 and salsa_0:
            db.add_all([
                models.Enrollment(user_id=student_user.id, group_id=bachata_1.id),
                models.Enrollment(user_id=student_user.id, group_id=salsa_0.id)
            ])
            db.commit()

    # FASE 6: Chat test
    if db.query(models.Message).count() == 0:
        if admin_user and student_user:
            msg1 = models.Message(sender_id=student_user.id, recipient_id=admin_user.id, content="Hola profe, ¿me puedes cambiar al grupo de Salsa 1?")
            msg2 = models.Message(sender_id=admin_user.id, recipient_id=student_user.id, content="¡Claro! Dame un minuto y te matriculo.")
            db.add_all([msg1, msg2])
            db.commit()

    db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    seed_data(db)
    db.close()
    print("Database seeded with Phase 3 data (Bookings, Users & PWA)!")

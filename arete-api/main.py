from fastapi import FastAPI, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import schemas

# Create tables
# Base.metadata.create_all(bind=engine) # Comentado para acelerar arranque en Vercel

app = FastAPI(title="Arete Dance Academy API")

# Orígenes permitidos: desarrollo local + producción Vercel
ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "http://localhost:3000",
    "https://arete-ui.vercel.app",
    "https://arete-dance.vercel.app",
    "https://arete-dance-studio-x65l.vercel.app",
    "https://arete-dance-studio-x65l.vercel.app/", # Variante con barra final
]

# Configure CORS so the Angular frontend can communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/cms", response_model=list[schemas.CMSSectionResponse])
def get_all_cms_sections(db: Session = Depends(get_db)):
    sections = db.query(models.CMSSection).all()
    return sections

@app.get("/api/cms/{slug}", response_model=schemas.CMSSectionResponse)
def get_cms_section(slug: str, db: Session = Depends(get_db)):
    section = db.query(models.CMSSection).filter(models.CMSSection.slug == slug).first()
    if not section:
        raise HTTPException(status_code=404, detail="CMS Section not found")
    return section

@app.put("/api/cms/{slug}", response_model=schemas.CMSSectionResponse)
def update_cms_section(slug: str, section_data: schemas.CMSSectionUpdate, db: Session = Depends(get_db)):
    db_section = db.query(models.CMSSection).filter(models.CMSSection.slug == slug).first()
    if not db_section:
        raise HTTPException(status_code=404, detail="CMS Section not found")
    
    db_section.content = section_data.content
    db.commit()
    db.refresh(db_section)
    return db_section

# --- User/Auth Endpoints ---

@app.post("/api/auth/login", response_model=schemas.UserResponse)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or user.password_hash != credentials.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

@app.get("/api/users", response_model=list[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/api/users", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
         raise HTTPException(status_code=400, detail="Email already registered")
    new_user = models.User(email=user.email, name=user.name, password_hash=user.password, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# --- ClassSession Endpoints ---

@app.get("/api/classes/available", response_model=list[schemas.ClassSessionResponse])
def get_available_classes(db: Session = Depends(get_db)):
    return db.query(models.ClassSession).filter(models.ClassSession.available_spots > 0).all()

@app.get("/api/classes", response_model=list[schemas.ClassSessionResponse])
def get_classes(db: Session = Depends(get_db)):
    return db.query(models.ClassSession).all()

@app.post("/api/classes", response_model=schemas.ClassSessionResponse)
def create_class(session: schemas.ClassSessionCreate, db: Session = Depends(get_db)):
    # Usamos session.model_dump() o session.dict() dependiendo version pydantic (usamos model_dump() en v2)
    # Por seguridad y compatibilidad hacia atras, extraemos manual si es necesario, asumimos v2:
    new_class = models.ClassSession(name=session.name, start_time=session.start_time, total_spots=session.total_spots, available_spots=session.total_spots)
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

# --- Booking Endpoints ---

@app.post("/api/bookings", response_model=schemas.BookingResponse)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    session_db = db.query(models.ClassSession).filter(models.ClassSession.id == booking.class_session_id).first()
    if not session_db:
        raise HTTPException(status_code=404, detail="Class not found")
    if session_db.available_spots <= 0:
        raise HTTPException(status_code=400, detail="No spots available")
    
    # Comprobar que el usuario no esta duplicando la matricula
    existing_booking = db.query(models.Booking).filter(
        models.Booking.user_id == booking.user_id,
        models.Booking.class_session_id == booking.class_session_id
    ).first()
    if existing_booking:
        raise HTTPException(status_code=400, detail="Ya tienes plaza en esta clase")
        
    session_db.available_spots -= 1
    new_booking = models.Booking(user_id=booking.user_id, class_session_id=booking.class_session_id)
    
    try:
        db.add(new_booking)
        db.commit()
        db.refresh(new_booking)
        return new_booking
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=404, detail="Usuario inexistente o fallo de base de datos")

@app.delete("/api/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db)):
    class_db = db.query(models.ClassSession).filter(models.ClassSession.id == class_id).first()
    if not class_db:
        raise HTTPException(status_code=404, detail="Class not found")
    
    # Liberar o borrar reservas asociadas
    db.query(models.Booking).filter(models.Booking.class_session_id == class_id).delete()
    
    db.delete(class_db)
    db.commit()
    return {"message": "Clase borrada con éxito"}

@app.get("/api/bookings", response_model=list[schemas.BookingResponse])
def get_bookings(db: Session = Depends(get_db)):
    return db.query(models.Booking).all()

# --- ClassGroup and Enrollment Endpoints (FASE 5) ---

@app.get("/api/groups", response_model=list[schemas.ClassGroupResponse])
def get_groups(db: Session = Depends(get_db)):
    return db.query(models.ClassGroup).all()

@app.post("/api/groups", response_model=schemas.ClassGroupResponse)
def create_group(group: schemas.ClassGroupCreate, db: Session = Depends(get_db)):
    new_group = models.ClassGroup(name=group.name, schedule_description=group.schedule_description, max_students=group.max_students)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group

@app.post("/api/enrollments")
def create_enrollment(enrollment: schemas.EnrollmentCreate, db: Session = Depends(get_db)):
    group = db.query(models.ClassGroup).filter(models.ClassGroup.id == enrollment.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    current_count = db.query(models.Enrollment).filter(models.Enrollment.group_id == enrollment.group_id).count()
    if current_count >= group.max_students:
        raise HTTPException(status_code=400, detail="Group is full")
        
    existing = db.query(models.Enrollment).filter(models.Enrollment.user_id == enrollment.user_id, models.Enrollment.group_id == enrollment.group_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
        
    new_enrollment = models.Enrollment(user_id=enrollment.user_id, group_id=enrollment.group_id)
    db.add(new_enrollment)
    db.commit()
    return {"message": "Enrolled successfully"}

@app.get("/api/users/{user_id}/enrollments", response_model=list[schemas.ClassGroupResponse])
def get_user_enrollments(user_id: int, db: Session = Depends(get_db)):
    enrollments = db.query(models.Enrollment).filter(models.Enrollment.user_id == user_id).all()
    # Devolver los grupos directamente
    groups = [e.group for e in enrollments if e.group is not None]
    return groups

@app.delete("/api/enrollments/{enrollment_id}")
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    enrollment = db.query(models.Enrollment).filter(models.Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    db.delete(enrollment)
    db.commit()
    return {"message": "Unenrolled successfully"}

class ContactForm(BaseModel):
    name: str
    email: str
    phone: str
    message: str

@app.post("/api/contact")
async def contact(form_data: ContactForm):
    print(f"Received contact form submission: {form_data}")
    return {"message": "Mensaje recibido correctamente. ¡Te responderemos pronto!"}

# --- Chat Endpoints (Fase 6) ---
@app.get("/api/messages/{user1_id}/{user2_id}", response_model=list[schemas.MessageResponse])
def get_chat_history(user1_id: int, user2_id: int, db: Session = Depends(get_db)):
    msgs = db.query(models.Message).filter(
        ((models.Message.sender_id == user1_id) & (models.Message.recipient_id == user2_id)) |
        ((models.Message.sender_id == user2_id) & (models.Message.recipient_id == user1_id))
    ).order_by(models.Message.timestamp.asc()).all()
    return msgs

@app.post("/api/messages", response_model=schemas.MessageResponse)
def send_message(msg: schemas.MessageCreate, db: Session = Depends(get_db)):
    new_msg = models.Message(sender_id=msg.sender_id, recipient_id=msg.recipient_id, content=msg.content)
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

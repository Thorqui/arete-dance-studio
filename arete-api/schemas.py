from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime

class CMSSectionBase(BaseModel):
    slug: str
    content: Dict[str, Any]

class CMSSectionCreate(CMSSectionBase):
    pass

class CMSSectionUpdate(BaseModel):
    content: Dict[str, Any]

class CMSSectionResponse(CMSSectionBase):
    id: int

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    name: str
    role: Optional[str] = "student"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

# --- ClassSession Schemas ---
class ClassSessionBase(BaseModel):
    name: str
    start_time: datetime
    total_spots: int
    available_spots: int
    target_role: str = "general"

class ClassSessionCreate(ClassSessionBase):
    pass

class ClassSessionResponse(ClassSessionBase):
    id: int
    class Config:
        from_attributes = True

# --- Booking Schemas ---
class BookingBase(BaseModel):
    class_session_id: int

class BookingCreate(BookingBase):
    user_id: Optional[int] = None

class BookingResponse(BookingBase):
    id: int
    user_id: int
    status: str
    class Config:
        from_attributes = True

# --- ClassGroup & Enrollment Schemas ---
class ClassGroupBase(BaseModel):
    name: str
    schedule_description: str
    max_students: int

class ClassGroupCreate(ClassGroupBase):
    pass

class ClassGroupResponse(ClassGroupBase):
    id: int
    class Config:
        from_attributes = True

class EnrollmentBase(BaseModel):
    user_id: int
    group_id: int

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentResponse(EnrollmentBase):
    id: int
    class Config:
        from_attributes = True

# --- Message Schemas (Fase 6) ---
class MessageBase(BaseModel):
    recipient_id: int
    content: str
    
class MessageCreate(MessageBase):
    sender_id: int

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

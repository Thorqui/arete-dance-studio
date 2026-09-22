"""Explicit migration: creates only the new push table, leaving existing tables intact."""
from database import engine
from push_reminders import PushDevice

if __name__ == "__main__":
    PushDevice.__table__.create(bind=engine, checkfirst=True)
    print("Push reminder table ready.")

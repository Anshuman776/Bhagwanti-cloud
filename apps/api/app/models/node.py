import uuid
from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class Node(Base):
    __tablename__ = "nodes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=False)  # IPv4/IPv6 support
    ssh_port = Column(Integer, default=22, nullable=False)
    ssh_user = Column(String(50), default="root", nullable=False)
    ssh_private_key = Column(String, nullable=True)  # Private key connection string
    status = Column(String(20), default="offline", nullable=False)  # online, offline, testing, error
    last_ping = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

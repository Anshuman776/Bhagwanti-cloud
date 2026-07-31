from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class NodeBase(BaseModel):
    name: str
    ip_address: str
    ssh_port: int = 22
    ssh_user: str = "root"

class NodeCreate(NodeBase):
    ssh_private_key: Optional[str] = None

class NodeUpdate(BaseModel):
    name: Optional[str] = None
    ip_address: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_user: Optional[str] = None
    ssh_private_key: Optional[str] = None
    status: Optional[str] = None

class NodeResponse(NodeBase):
    id: str
    status: str
    last_ping: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

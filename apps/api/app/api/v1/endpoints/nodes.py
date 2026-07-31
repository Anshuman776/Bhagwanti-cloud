from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import io
import paramiko
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

from app.core.database import get_db
from app.models.node import Node
from app.schemas.node import NodeCreate, NodeResponse, NodeUpdate
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

def test_ssh_connection(ip: str, port: int, username: str, key_str: str) -> bool:
    """
    Establish SSH connection using paramiko and clean up.
    Returns True if authentication succeeds, otherwise False.
    """
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        key_file = io.StringIO(key_str)
        pkey = paramiko.RSAKey.from_private_key(key_file)
        client.connect(
            hostname=ip,
            port=port,
            username=username,
            pkey=pkey,
            timeout=5
        )
        return True
    except Exception as e:
        print(f"SSH test to {ip}:{port} failed: {e}")
        return False
    finally:
        client.close()

@router.post("/generate-keys")
def generate_ssh_keys(current_user: User = Depends(get_current_user)):
    """
    Generate a secure 2048-bit RSA key pair for target nodes.
    """
    try:
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.OpenSSH,
            encryption_algorithm=serialization.NoEncryption()
        ).decode("utf-8")

        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.OpenSSH,
            format=serialization.PublicFormat.OpenSSH
        ).decode("utf-8")
        
        return {
            "private_key": private_pem,
            "public_key": public_pem
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Key generation failed: {str(e)}"
        )

@router.get("", response_model=List[NodeResponse])
def get_nodes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all registered nodes.
    """
    return db.query(Node).all()

@router.post("", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
def create_node(
    node_in: NodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register a new target Debian server node.
    """
    node = Node(
        name=node_in.name,
        ip_address=node_in.ip_address,
        ssh_port=node_in.ssh_port,
        ssh_user=node_in.ssh_user,
        ssh_private_key=node_in.ssh_private_key,
        status="offline"
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return node

@router.get("/{node_id}", response_model=NodeResponse)
def get_node_by_id(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve a specific node's details.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.put("/{node_id}", response_model=NodeResponse)
def update_node(
    node_id: str,
    node_in: NodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a registered node.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    update_data = node_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(node, field, value)
        
    db.commit()
    db.refresh(node)
    return node

@router.delete("/{node_id}")
def delete_node(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deregister a server node from management.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    db.delete(node)
    db.commit()
    return {"message": "Node deleted successfully"}

@router.post("/{node_id}/test-connection")
def test_node_connection(
    node_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger active SSH connection verification to the node.
    """
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    if not node.ssh_private_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SSH Private Key is missing for this node connection."
        )
        
    is_success = test_ssh_connection(
        ip=node.ip_address,
        port=node.ssh_port,
        username=node.ssh_user,
        key_str=node.ssh_private_key
    )
    
    node.status = "online" if is_success else "error"
    db.commit()
    
    return {
        "status": node.status,
        "connected": is_success
    }

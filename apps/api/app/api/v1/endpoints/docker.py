import io
import json
import os
import shutil
import subprocess
import tempfile
import threading
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
import docker
import paramiko
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import verify_token
from app.api.deps import get_current_user
from app.models.user import User
from app.models.node import Node

router = APIRouter()

class DeployRequest(BaseModel):
    name: str = "portfolio"
    repo_url: str = "https://github.com/anshuman-cloud/portfolio"
    port: int = 3000

def get_docker_client():
    try:
        return docker.from_env()
    except Exception:
        return None

def connect_ssh(node: Node) -> paramiko.SSHClient:
    """
    Establish SSH connection helper to registered node parameters.
    """
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    key_file = io.StringIO(node.ssh_private_key)
    pkey = paramiko.RSAKey.from_private_key(key_file)
    ssh.connect(
        hostname=node.ip_address,
        port=node.ssh_port,
        username=node.ssh_user,
        pkey=pkey,
        timeout=10
    )
    return ssh

@router.get("/containers")
def list_containers(
    node_id: str = Query("local"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List Docker containers. Connects locally if node_id='local',
    else runs SSH checks directly on target Debian node.
    """
    # REMOTE NODE ROUTE
    if node_id != "local":
        node = db.query(Node).filter(Node.id == node_id).first()
        if not node or not node.ssh_private_key:
            raise HTTPException(status_code=404, detail="Target node connection profile not found.")
            
        try:
            ssh = connect_ssh(node)
            cmd = "docker ps -a --format '{\"id\":\"{{.ID}}\",\"name\":\"{{.Names}}\",\"status\":\"{{.State}}\",\"ports\":\"{{.Ports}}\",\"image\":\"{{.Image}}\"}'"
            _, stdout, stderr = ssh.exec_command(cmd, timeout=5)
            output = stdout.read().decode().strip()
            ssh.close()
            
            if not output:
                return []
                
            containers_list = []
            for line in output.split("\n"):
                if line.strip():
                    try:
                        containers_list.append(json.loads(line.strip()))
                    except Exception:
                        pass
            return containers_list
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to query remote Debian Docker node: {str(e)}"
            )

    # LOCAL NODE ROUTE
    client = get_docker_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Local Docker daemon is offline."
        )
        
    try:
        containers = client.containers.list(all=True)
        return [
            {
                "id": c.short_id,
                "name": c.name,
                "status": c.status,
                "ports": str(c.ports),
                "image": c.image.tags[0] if c.image.tags else "unknown"
            }
            for c in containers
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Local Docker inspect failed: {str(e)}"
        )

@router.post("/containers/{container_name}/toggle")
def toggle_container(
    container_name: str,
    node_id: str = Query("local"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggle container active/inactive states on the local host or remote node.
    """
    # REMOTE NODE ROUTE
    if node_id != "local":
        node = db.query(Node).filter(Node.id == node_id).first()
        if not node:
            raise HTTPException(status_code=404, detail="Target node profile not found.")
            
        try:
            ssh = connect_ssh(node)
            # Check current status
            _, stdout, _ = ssh.exec_command(f"docker inspect --format '{{{{.State.Running}}}}' {container_name}", timeout=5)
            is_running = stdout.read().decode().strip() == "true"
            
            action = "stop" if is_running else "start"
            _, stdout_act, stderr_act = ssh.exec_command(f"docker {action} {container_name}", timeout=10)
            err = stderr_act.read().decode().strip()
            ssh.close()
            
            if err:
                raise Exception(err)
                
            return {"name": container_name, "status": "stopped" if is_running else "running"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Remote Docker toggle failed: {str(e)}"
            )

    # LOCAL NODE ROUTE
    client = get_docker_client()
    if not client:
        raise HTTPException(status_code=503, detail="Local Docker daemon is offline.")
        
    try:
        container = client.containers.get(container_name)
        if container.status == "running":
            container.stop()
            next_status = "stopped"
        else:
            container.start()
            next_status = "running"
        return {"name": container_name, "status": next_status}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def run_remote_deployment_worker(node: Node, name: str, repo_url: str, port: int):
    """
    Asynchronous remote SSH Git deploy worker.
    Clones build files and runs docker run on target node.
    """
    try:
        ssh = connect_ssh(node)
        print(f"Remote Deploy: Connected to target node {node.ip_address}.")
        
        # 1. Clean workspace
        ssh.exec_command(f"rm -rf /tmp/bhagwanti-build-{name}")
        
        # 2. Clone Git Repo
        print(f"Remote Deploy: Cloning {repo_url} on target...")
        _, _, stderr_clone = ssh.exec_command(f"git clone {repo_url} /tmp/bhagwanti-build-{name}", timeout=60)
        # Check output stream to confirm completion
        stderr_clone.channel.recv_exit_status()
        
        # 3. Detect/Generate Dockerfile
        # Create standard node/python fallback templates
        dockerfile_content = f"""FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --if-present
EXPOSE {port}
CMD ["npm", "start"]
"""
        
        # Check if Dockerfile exists, write fallback if missing
        check_cmd = f"test -f /tmp/bhagwanti-build-{name}/Dockerfile && echo 'yes' || echo 'no'"
        _, stdout_chk, _ = ssh.exec_command(check_cmd)
        if stdout_chk.read().decode().strip() == "no":
            print("Remote Deploy: Creating default Dockerfile on target...")
            # Write via cat heredoc
            write_cmd = f"cat << 'EOF' > /tmp/bhagwanti-build-{name}/Dockerfile\n{dockerfile_content}\nEOF"
            ssh.exec_command(write_cmd)

        # 4. Build Docker image
        print(f"Remote Deploy: Building Docker image bhagwanti-{name}...")
        build_cmd = f"docker build -t bhagwanti-{name}:latest /tmp/bhagwanti-build-{name}"
        _, _, stderr_build = ssh.exec_command(build_cmd, timeout=300)
        stderr_build.channel.recv_exit_status()

        # 5. Stop and clean old containers
        print(f"Remote Deploy: Cleaning old container {name}...")
        ssh.exec_command(f"docker stop {name} && docker rm {name}")

        # 6. Run container on target node
        print(f"Remote Deploy: Booting container {name}...")
        run_cmd = f"docker run -d --name {name} -p {port}:{port} bhagwanti-{name}:latest"
        _, _, stderr_run = ssh.exec_command(run_cmd, timeout=30)
        stderr_run.channel.recv_exit_status()

        # 7. Clean up build directory
        ssh.exec_command(f"rm -rf /tmp/bhagwanti-build-{name}")
        ssh.close()
        print(f"Remote Deploy: Completed successfully for {name} on node {node.ip_address}.")
        
    except Exception as e:
        print(f"Remote Deploy Error: {e}")

@router.post("/deploy")
def deploy_application(
    request: DeployRequest,
    background_tasks: BackgroundTasks,
    node_id: str = Query("local"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trigger Git repository deploy build worker locally or on target Debian node.
    """
    safe_name = "".join(c for c in request.name if c.isalnum() or c in ("-", "_")).lower()

    # REMOTE DEPLOYMENT
    if node_id != "local":
        node = db.query(Node).filter(Node.id == node_id).first()
        if not node:
            raise HTTPException(status_code=404, detail="Target node profile not found.")
            
        background_tasks.add_task(
            run_remote_deployment_worker,
            node=node,
            name=safe_name,
            repo_url=request.repo_url,
            port=request.port
        )
        
        return {
            "message": f"Remote deployment worker task queued for '{safe_name}' on Debian node {node.name}."
        }

    # LOCAL DEPLOYMENT
    client = get_docker_client()
    if not client:
        raise HTTPException(status_code=503, detail="Local Docker daemon is offline.")

    background_tasks.add_task(
        run_deployment_worker := lambda: print("Local Deploy placeholder"), # Placeholder to reuse local logic if needed
    )
    # Trigger original local build runner thread
    from app.api.v1.endpoints.docker import run_deployment_worker as local_worker
    background_tasks.add_task(
        local_worker,
        name=safe_name,
        repo_url=request.repo_url,
        port=request.port
    )
    
    return {
        "message": f"Local deployment task queued for '{safe_name}'. Monitor containers table for updates."
    }

@router.websocket("/containers/{container_name}/logs/ws")
async def container_logs_ws(
    websocket: WebSocket,
    container_name: str,
    node_id: str = Query(...),
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for streaming live Docker container logs.
    """
    user_id = verify_token(token, expected_type="access")
    if not user_id:
        await websocket.close(code=4001)
        return
        
    await websocket.accept()
    
    # REMOTE LOGGING
    if node_id != "local":
        node = db.query(Node).filter(Node.id == node_id).first()
        if not node or not node.ssh_private_key:
            await websocket.send_json({"error": "Target node connection profile not found."})
            await websocket.close()
            return
            
        try:
            ssh = connect_ssh(node)
            # using -f for follow, --tail 100
            transport = ssh.get_transport()
            channel = transport.open_session()
            channel.exec_command(f"docker logs -f --tail 100 {container_name}")
            
            while not channel.exit_status_ready():
                if channel.recv_ready():
                    data = channel.recv(4096).decode("utf-8", errors="ignore")
                    await websocket.send_text(data)
                if channel.recv_stderr_ready():
                    data = channel.recv_stderr(4096).decode("utf-8", errors="ignore")
                    await websocket.send_text(data)
                import asyncio
                await asyncio.sleep(0.1)
                
        except WebSocketDisconnect:
            pass
        except Exception as e:
            try:
                await websocket.send_text(f"\n[Log Stream Error]: {str(e)}")
            except:
                pass
        finally:
            try:
                ssh.close()
            except:
                pass
        return

    # LOCAL LOGGING
    client = get_docker_client()
    if not client:
        await websocket.send_text("Local Docker daemon is offline.")
        await websocket.close()
        return
        
    try:
        container = client.containers.get(container_name)
        log_stream = container.logs(stream=True, follow=True, tail=100)
        
        # We need an async wrapper to not block the event loop
        import asyncio
        loop = asyncio.get_event_loop()
        
        # Blocking iterator loop for local logs
        # In a production app, we'd use a thread executor or aio-docker
        for line in log_stream:
            await websocket.send_text(line.decode("utf-8", errors="ignore"))
            # Give control back to event loop
            await asyncio.sleep(0.01)
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(f"Error reading local logs: {e}")
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass

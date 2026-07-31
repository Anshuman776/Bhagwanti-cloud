import asyncio
import io
import os
import subprocess
import threading
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session
import paramiko

from app.core.database import get_db
from app.models.node import Node
from app.core.security import verify_token

router = APIRouter()

def ssh_reader(channel, websocket: WebSocket, loop: asyncio.AbstractEventLoop):
    """
    Background worker thread to continuously read output from the Paramiko SSH
    PTY channel and forward it to the WebSocket.
    """
    try:
        while True:
            data = channel.recv(4096)
            if not data:
                break
            print(f"SSH Terminal received: {data[:100]}")
            # Forward to client over WebSocket
            asyncio.run_coroutine_threadsafe(
                websocket.send_text(data.decode("utf-8", errors="replace")),
                loop
            )
    except Exception as e:
        print(f"Terminal read error: {e}")
    finally:
        # Schedule closing of socket
        asyncio.run_coroutine_threadsafe(websocket.close(), loop)

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    node_id: str = Query(...),
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    # 1. Authenticate via token query parameter
    user_id = verify_token(token, expected_type="access")
    if not user_id:
        await websocket.close(code=4001)
        return

    # 2. Handle LOCAL host shell session out-of-the-box
    if node_id == "local":
        await websocket.accept()
        await websocket.send_text("\r\n[Bhagwanti Cloud] Launching local host shell session...\r\n")
        
        # Select shell process based on OS
        shell_cmd = "powershell.exe" if os.name == "nt" else "/bin/bash"
        
        try:
            proc = subprocess.Popen(
                [shell_cmd],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                bufsize=0
            )
        except Exception as e:
            await websocket.send_text(f"[Bhagwanti Cloud] Failed to start shell process: {str(e)}\r\n")
            await websocket.close()
            return

        loop = asyncio.get_running_loop()
        
        def local_reader():
            try:
                while proc.poll() is None:
                    # Read block from process stdout
                    data = proc.stdout.read(512)
                    if not data:
                        break
                    asyncio.run_coroutine_threadsafe(
                        websocket.send_text(data.decode("utf-8", errors="replace")),
                        loop
                    )
            except Exception as e:
                print(f"Local process read exception: {e}")
            finally:
                asyncio.run_coroutine_threadsafe(websocket.close(), loop)

        # Spawn reading thread
        reader_thread = threading.Thread(target=local_reader, daemon=True)
        reader_thread.start()

        # Pipe WebSocket entries to process stdin
        try:
            while True:
                data = await websocket.receive_text()
                if proc.poll() is not None:
                    break
                proc.stdin.write(data.encode("utf-8"))
                proc.stdin.flush()
        except WebSocketDisconnect:
            pass
        finally:
            if proc.poll() is None:
                proc.terminate()
            return

    # 3. Handle REMOTE host shell session (SSH)
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        await websocket.close(code=4004)
        return

    if not node.ssh_private_key:
        await websocket.close(code=4005)
        return

    await websocket.accept()

    # Connect to target Debian node via SSH
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        key_file = io.StringIO(node.ssh_private_key)
        pkey = paramiko.RSAKey.from_private_key(key_file)
        
        await websocket.send_text("\r\n[Bhagwanti Cloud] Connecting to remote server...\r\n")
        
        ssh.connect(
            hostname=node.ip_address,
            port=node.ssh_port,
            username=node.ssh_user,
            pkey=pkey,
            timeout=10
        )
        
        channel = ssh.invoke_shell(term="xterm", width=80, height=24)
        await websocket.send_text("[Bhagwanti Cloud] Secure SSH session established.\r\n\r\n")
        
    except Exception as e:
        await websocket.send_text(f"\r\n[Bhagwanti Cloud] Connection failed: {str(e)}\r\n")
        await websocket.close()
        ssh.close()
        return

    # Spin up background SSH reading thread
    loop = asyncio.get_running_loop()
    reader_thread = threading.Thread(
        target=ssh_reader,
        args=(channel, websocket, loop),
        daemon=True
    )
    reader_thread.start()

    # Forward WebSocket keys into SSH PTY stdin
    try:
        while True:
            data = await websocket.receive_text()
            if channel.closed:
                break
            channel.send(data)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Terminal write exception: {e}")
    finally:
        channel.close()
        ssh.close()

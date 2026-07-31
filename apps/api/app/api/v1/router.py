from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, nodes, terminal, monitoring, docker

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(nodes.router, prefix="/nodes", tags=["nodes"])
api_router.include_router(terminal.router, prefix="/terminal", tags=["terminal"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(docker.router, prefix="/docker", tags=["docker"])

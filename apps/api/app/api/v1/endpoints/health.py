from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.get("", response_model=Dict[str, str])
def health_check() -> Dict[str, str]:
    """
    Check API backend health status.
    """
    return {
        "status": "healthy",
        "service": "Bhagwanti Cloud Backend",
        "version": "0.1.0"
    }

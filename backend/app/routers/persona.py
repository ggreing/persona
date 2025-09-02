from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..core.persona_db import persona_db_service, PersonaDBService
from ..models.mongo_models import Persona

router = APIRouter()

# 의존성 주입을 위한 함수
def get_persona_service():
    return persona_db_service

@router.post("/personas", response_model=Persona)
async def create_persona(
    persona_data: Persona,
    service: PersonaDBService = Depends(get_persona_service)
):
    """
    새로운 페르소나를 생성하여 QdrantDB에 저장합니다.
    """
    try:
        await service.add_persona(persona_data)
        return persona_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"페르소나 생성 중 오류 발생: {e}")

@router.get("/personas", response_model=List[Persona])
async def list_personas(
    service: PersonaDBService = Depends(get_persona_service)
):
    """
    QdrantDB에 저장된 모든 페르소나 목록을 반환합니다.
    """
    try:
        return await service.get_all_personas()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"페르소나 목록 조회 중 오류 발생: {e}")

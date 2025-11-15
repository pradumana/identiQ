from fastapi import APIRouter

from app.api.v1.endpoints import auth, kyc, admin, ml, institution, document_generator

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(kyc.router, prefix="/kyc", tags=["kyc"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ml.router, prefix="/ml", tags=["ml"])
api_router.include_router(institution.router, prefix="/institution", tags=["institution"])
api_router.include_router(document_generator.router, prefix="/documents", tags=["document-generator"])


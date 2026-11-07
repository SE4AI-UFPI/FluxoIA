from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    CustomTokenObtainPairView,
    MeView,
    PerguntaEntrevistaViewSet,
    ProcessoViewSet,
    RegisterView,
    UserViewSet,
)

router = DefaultRouter()
router.register(r'usuarios', UserViewSet, basename='usuario')
router.register(r'processos', ProcessoViewSet, basename='processo')
router.register(r'perguntas-entrevista', PerguntaEntrevistaViewSet, basename='pergunta-entrevista')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('', include(router.urls)),
]

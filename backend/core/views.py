from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdminOrSelf
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)
from .services import user_service


class CustomTokenObtainPairView(TokenObtainPairView):
    """POST /api/auth/login/ -> Autentica com email + password e retorna tokens JWT + dados do usuário."""

    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(APIView):
    """POST /api/auth/register/ -> Controller HTTP de Auto-cadastro (Sign Up)."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resultado = user_service.registrar_usuario_com_tokens(dados=serializer.validated_data)

        return Response(
            {
                'user': UserSerializer(resultado['user']).data,
                'refresh': resultado['refresh'],
                'access': resultado['access'],
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    """GET / PATCH /api/auth/me/ -> Controller HTTP do perfil do usuário autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        usuario_atualizado = user_service.atualizar_usuario(
            usuario_alvo=request.user,
            dados=serializer.validated_data,
            usuario_solicitante=request.user,
        )
        return Response(UserSerializer(usuario_atualizado).data)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ -> Controller HTTP de troca de senha."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user_service.alterar_senha(
            usuario=request.user,
            nova_senha=serializer.validated_data['nova_senha'],
        )
        return Response({'detail': 'Senha alterada com sucesso.'}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """Controller HTTP para CRUD de usuários em /api/usuarios/."""

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSelf]

    def get_queryset(self):
        params = self.request.query_params
        return user_service.listar_usuarios(
            papel=params.get('papel'),
            secretaria=params.get('secretaria'),
            setor=params.get('setor'),
            is_active=params.get('is_active'),
            usuario_solicitante=self.request.user,
        )

    def perform_create(self, serializer):
        serializer.instance = user_service.criar_usuario(dados=serializer.validated_data)

    def perform_update(self, serializer):
        serializer.instance = user_service.atualizar_usuario(
            usuario_alvo=self.get_object(),
            dados=serializer.validated_data,
            usuario_solicitante=self.request.user,
        )

    def perform_destroy(self, instance):
        user_service.remover_usuario(usuario_alvo=instance)

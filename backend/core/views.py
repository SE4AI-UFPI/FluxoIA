from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import PapelUsuario, PerguntaEntrevista
from .permissions import IsAdminOrSelf
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    FeedbackFluxoIASerializer,
    PerguntaEntrevistaSerializer,
    ProcessoSerializer,
    RegisterSerializer,
    RevisaoGovernancaSerializer,
    UserSerializer,
    VersaoFluxoBPMNSerializer,
)
from .services import process_service, user_service


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
        serializer = UserSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
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


class ProcessoViewSet(viewsets.ModelViewSet):
    """Controller HTTP para processos, entrevista guiada, versões BPMN, feedback IA e governança."""

    serializer_class = ProcessoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        params = self.request.query_params
        return process_service.listar_processos(
            usuario=self.request.user,
            status=params.get('status'),
            setor=params.get('setor'),
            busca=params.get('search') or params.get('busca'),
        )

    def perform_create(self, serializer):
        serializer.instance = process_service.criar_processo(
            usuario=self.request.user,
            dados=serializer.validated_data,
        )

    def perform_update(self, serializer):
        serializer.instance = process_service.atualizar_processo(
            processo=self.get_object(),
            dados=serializer.validated_data,
        )

    @action(detail=True, methods=['post'], url_path='versoes-bpmn')
    def versoes_bpmn(self, request, pk=None):
        processo = self.get_object()
        serializer = VersaoFluxoBPMNSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        process_service.registrar_versao_bpmn(
            processo=processo,
            usuario=request.user,
            dados=serializer.validated_data,
        )
        processo_atualizado = self.get_queryset().get(pk=processo.pk)
        return Response(ProcessoSerializer(processo_atualizado).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submeter')
    def submeter(self, request, pk=None):
        processo = self.get_object()
        serializer = FeedbackFluxoIASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        process_service.submeter_processo(
            processo=processo,
            usuario=request.user,
            dados_feedback=serializer.validated_data,
        )
        processo_atualizado = self.get_queryset().get(pk=processo.pk)
        return Response(ProcessoSerializer(processo_atualizado).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='revisar')
    def revisar(self, request, pk=None):
        if request.user.papel not in (PapelUsuario.ADMIN, PapelUsuario.SUPERVISOR):
            return Response(
                {'detail': 'Apenas supervisores ou administradores podem revisar processos.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        processo = self.get_object()
        serializer = RevisaoGovernancaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        process_service.revisar_processo_governanca(
            processo=processo,
            revisor=request.user,
            dados_revisao=serializer.validated_data,
        )
        processo_atualizado = self.get_queryset().get(pk=processo.pk)
        return Response(ProcessoSerializer(processo_atualizado).data, status=status.HTTP_200_OK)


class PerguntaEntrevistaViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/perguntas-entrevista/ -> Lista de perguntas ativas da entrevista guiada."""

    serializer_class = PerguntaEntrevistaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return PerguntaEntrevista.objects.filter(ativa=True).order_by('ordem')



class PerguntaEntrevistaViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/perguntas-entrevista/ -> Lista de perguntas ativas da entrevista guiada."""

    serializer_class = PerguntaEntrevistaSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return PerguntaEntrevista.objects.filter(ativa=True).order_by('ordem')



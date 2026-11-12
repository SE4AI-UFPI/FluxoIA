from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import PapelUsuario, PerguntaEntrevista, Processo, StatusProcesso
from .permissions import IsAdminOrReadOnly, IsAdminOrSelf
from .serializers import (
    AjusteLayoutBPMNSerializer,
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
from .services import bpmn_ai_service, process_service, user_service
from .services.llm_client import LLMServiceError


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
            usuario=self.request.user,
        )

    def perform_destroy(self, instance):
        process_service.excluir_processo(
            processo=instance,
            usuario=self.request.user,
            motivo=self.request.data.get('motivo', ''),
        )

    @action(detail=False, methods=['get'], url_path='excluidos')
    def excluidos(self, request):
        if request.user.papel != PapelUsuario.ADMIN:
            raise PermissionDenied('Apenas administradores podem consultar exclusões de processos.')

        processos = Processo.objects.filter(status=StatusProcesso.EXCLUIDO).select_related(
            'criado_por',
            'exclusao__usuario',
            'entrevista',
        ).prefetch_related('versoes_bpmn__gerado_por', 'feedbacks_ia__autor', 'revisoes_governanca__revisor')
        return Response(self.get_serializer(processos, many=True).data)

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
        return Response(self.get_serializer(processo_atualizado).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='layout-bpmn')
    def layout_bpmn(self, request, pk=None):
        """PATCH /api/processos/{id}/layout-bpmn/ -> persiste ajuste visual sem nova versão funcional."""
        processo = self.get_object()
        serializer = AjusteLayoutBPMNSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        process_service.registrar_ajuste_layout_bpmn(
            processo=processo,
            usuario=request.user,
            bpmn_xml=serializer.validated_data['bpmn_xml'],
            motivo=serializer.validated_data.get('motivo_alteracao', ''),
        )
        processo_atualizado = self.get_queryset().get(pk=processo.pk)
        return Response(self.get_serializer(processo_atualizado).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='publicar')
    def publicar(self, request, pk=None):
        """POST /api/processos/{id}/publicar/ -> encaminha processo homologado para publicação."""
        processo = self.get_object()
        process_service.publicar_processo(
            processo=processo,
            usuario=request.user,
            parecer=(request.data.get('parecer') or '').strip(),
        )
        processo_atualizado = self.get_queryset().get(pk=processo.pk)
        return Response(self.get_serializer(processo_atualizado).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='gerar-bpmn-ia')
    def gerar_bpmn_ia(self, request, pk=None):
        processo = self.get_object()

        if processo.status not in process_service.STATUS_PRE_VALIDACAO:
            return Response(
                {
                    'detail': (
                        'A geração por IA só é permitida antes do envio para validação '
                        '(Rascunho, Entrevista, Modelagem, Avaliação ou Correção Solicitada).'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        respostas_payload = request.data.get('respostas')
        if isinstance(respostas_payload, dict) and respostas_payload:
            process_service.atualizar_processo(
                processo=processo,
                dados={'entrevista': {'respostas': respostas_payload}},
                usuario=request.user,
            )
            processo.refresh_from_db()

        try:
            bpmn_ai_service.gerar_fluxo_bpmn_com_ia(
                processo=processo,
                usuario=request.user,
            )
        except LLMServiceError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        processo_atualizado = self.get_queryset().get(pk=processo.pk)
        return Response(self.get_serializer(processo_atualizado).data, status=status.HTTP_201_CREATED)

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
        return Response(self.get_serializer(processo_atualizado).data, status=status.HTTP_200_OK)

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
        return Response(self.get_serializer(processo_atualizado).data, status=status.HTTP_200_OK)


class PerguntaEntrevistaViewSet(viewsets.ModelViewSet):
    """
    CRUD completo de Perguntas da Entrevista Guiada.
    - GET /api/perguntas-entrevista/: lista perguntas ativas (ou todas se admin passar ?todas=true).
    - POST, PUT, PATCH, DELETE: restrito a administradores (papel == 'admin').
    - POST /api/perguntas-entrevista/reordenar/: atualiza ordem das perguntas.
    """

    serializer_class = PerguntaEntrevistaSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        todas = self.request.query_params.get('todas', '').lower() in ('true', '1')
        if user and user.is_authenticated and user.papel == PapelUsuario.ADMIN and todas:
            return PerguntaEntrevista.objects.all().order_by('ordem')
        return PerguntaEntrevista.objects.filter(ativa=True).order_by('ordem')

    def destroy(self, request, *args, **kwargs):
        """
        Por padrão, realiza exclusão lógica (desativação).
        Se passado ?force=true, realiza exclusão física.
        """
        instance = self.get_object()
        force = request.query_params.get('force', '').lower() in ('true', '1')
        if force:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        instance.ativa = False
        instance.save(update_fields=['ativa', 'atualizado_em'])
        return Response(
            {'detail': f'Pergunta "{instance.titulo}" desativada com sucesso.'},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], url_path='reordenar')
    def reordenar(self, request):
        """
        Reordena as perguntas com base na lista de IDs enviada.
        Payload esperado: {"ordem_ids": ["uuid-1", "uuid-2", ...]}
        """
        ordem_ids = request.data.get('ordem_ids', [])
        if not isinstance(ordem_ids, list) or not ordem_ids:
            return Response(
                {'detail': 'Envie uma lista com os IDs das perguntas no campo "ordem_ids".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for idx, pid in enumerate(ordem_ids, start=1):
                PerguntaEntrevista.objects.filter(id=pid).update(ordem=idx)

        perguntas = PerguntaEntrevista.objects.all().order_by('ordem')
        return Response(self.get_serializer(perguntas, many=True).data, status=status.HTTP_200_OK)


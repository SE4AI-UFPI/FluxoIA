from django.db.models import QuerySet
from rest_framework_simplejwt.tokens import RefreshToken
from core.models import PapelUsuario, User


def listar_usuarios(
    *,
    papel: str | None = None,
    secretaria: str | None = None,
    setor: str | None = None,
    is_active: str | None = None,
) -> QuerySet[User]:
    """Lista usuários do sistema aplicando filtros opcionais."""
    qs = User.objects.all()

    if papel:
        qs = qs.filter(papel=papel)

    if secretaria:
        qs = qs.filter(secretaria__icontains=secretaria)

    if setor:
        qs = qs.filter(setor__icontains=setor)

    if is_active is not None:
        ativo = is_active.lower() in ('true', '1', 'yes')
        qs = qs.filter(is_active=ativo)

    return qs


def criar_usuario(*, dados: dict) -> User:
    """Cria um novo usuário criptografando a senha."""
    dados_limpos = dict(dados)
    password = dados_limpos.pop('password')
    return User.objects.create_user(password=password, **dados_limpos)


def registrar_usuario_com_tokens(*, dados: dict) -> dict:
    """Realiza o auto-cadastro (Sign Up) e já emite os tokens JWT de acesso."""
    user = criar_usuario(dados=dados)
    refresh = RefreshToken.for_user(user)
    return {
        'user': user,
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def atualizar_usuario(*, usuario_alvo: User, dados: dict, usuario_solicitante: User) -> User:
    """
    Atualiza os dados de um usuário.
    Se quem está editando não for ADMIN, impede alteração de 'papel' e 'is_active'.
    """
    dados_limpos = dict(dados)

    if usuario_solicitante.papel != PapelUsuario.ADMIN:
        dados_limpos.pop('papel', None)
        dados_limpos.pop('is_active', None)

    password = dados_limpos.pop('password', None)

    for campo, valor in dados_limpos.items():
        setattr(usuario_alvo, campo, valor)

    if password:
        usuario_alvo.set_password(password)

    usuario_alvo.save()
    return usuario_alvo


def alterar_senha(*, usuario: User, nova_senha: str) -> None:
    """Altera a senha do usuário autenticado."""
    usuario.set_password(nova_senha)
    usuario.save(update_fields=['password', 'atualizado_em'])


def remover_usuario(*, usuario_alvo: User) -> None:
    """Remove um usuário do banco de dados."""
    usuario_alvo.delete()

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class PapelUsuario(models.TextChoices):
    SERVIDOR = 'servidor', 'Servidor'
    VALIDADOR = 'validador', 'Chefe do Setor (Validador)'
    ADMIN = 'admin', 'Administrador'


class UserManager(BaseUserManager):
    def create_user(self, email: str, nome: str, password: str | None = None, **extra_fields):
        if not email:
            raise ValueError('O e-mail é obrigatório.')
        if not nome:
            raise ValueError('O nome é obrigatório.')

        email = self.normalize_email(email)
        extra_fields.setdefault('papel', PapelUsuario.SERVIDOR)

        user = self.model(email=email, nome=nome.strip(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, nome: str, password: str | None = None, **extra_fields):
        extra_fields['papel'] = PapelUsuario.ADMIN
        extra_fields.setdefault('is_active', True)
        return self.create_user(email=email, nome=nome, password=password, **extra_fields)


class User(AbstractBaseUser):
    """
    Modelo de usuário do FluxoIA alinhado aos atores e restrições de LGPD do M2.
    Não armazena CPF nem telefone pessoal (minimização de dados - R5).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField('e-mail', unique=True)
    nome = models.CharField('nome completo', max_length=150)
    papel = models.CharField(
        'papel no sistema',
        max_length=20,
        choices=PapelUsuario.choices,
        default=PapelUsuario.SERVIDOR,
    )
    secretaria = models.CharField(
        'órgão ou secretaria',
        max_length=120,
        blank=True,
        default='',
        help_text='Ex.: SDU Leste, SECTI, SEMPLAN',
    )
    setor = models.CharField(
        'setor ou coordenação',
        max_length=120,
        blank=True,
        default='',
        help_text='Ex.: SDU: Protocolo, SDU: CEU - AAD',
    )
    cargo = models.CharField(
        'cargo ou função',
        max_length=120,
        blank=True,
        default='',
        help_text='Ex.: Analista, Coordenadora, Chefe de Divisão',
    )
    matricula = models.CharField(
        'matrícula funcional',
        max_length=50,
        blank=True,
        null=True,
        unique=True,
    )

    is_active = models.BooleanField('ativo', default=True)
    criado_em = models.DateTimeField('criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('atualizado em', auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nome']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'usuário'
        verbose_name_plural = 'usuários'
        ordering = ['nome']

    def __str__(self) -> str:
        return f'{self.nome} ({self.email})'

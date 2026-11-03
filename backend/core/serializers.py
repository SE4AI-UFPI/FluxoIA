from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import PapelUsuario, User


class UserSerializer(serializers.ModelSerializer):
    """DTO de leitura e validação de usuários."""

    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        style={'input_type': 'password'},
    )

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'nome',
            'papel',
            'secretaria',
            'setor',
            'cargo',
            'matricula',
            'is_active',
            'criado_em',
            'atualizado_em',
            'password',
        ]
        read_only_fields = ['id', 'criado_em', 'atualizado_em']

    def validate_matricula(self, value):
        return None if value == '' else value

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError({'password': 'A senha é obrigatória na criação do usuário.'})
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    """DTO para validação do auto-cadastro (Sign Up)."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
    )
    papel = serializers.ChoiceField(
        choices=[
            (PapelUsuario.SERVIDOR, 'Servidor'),
            (PapelUsuario.VALIDADOR, 'Chefe do Setor (Validador)'),
        ],
        default=PapelUsuario.SERVIDOR,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'nome',
            'password',
            'papel',
            'secretaria',
            'setor',
            'cargo',
            'matricula',
        ]
        read_only_fields = ['id']

    def validate_matricula(self, value):
        return None if value == '' else value


class ChangePasswordSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True, required=True)
    nova_senha = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    def validate_senha_atual(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('A senha atual está incorreta.')
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['nome'] = user.nome
        token['papel'] = user.papel
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data

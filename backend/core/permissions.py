from rest_framework.permissions import BasePermission
from .models import PapelUsuario


class IsAdminOrSelf(BasePermission):
    """
    Permite que administradores (papel == 'admin') gerenciem qualquer usuário,
    e que o próprio usuário visualize ou edite seus próprios dados.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if view.action == 'create':
            return request.user.papel == PapelUsuario.ADMIN
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.papel == PapelUsuario.ADMIN:
            return True
        if view.action == 'destroy':
            return False
        return obj.id == request.user.id

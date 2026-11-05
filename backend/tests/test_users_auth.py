import pytest
from rest_framework.test import APIClient
from core.models import PapelUsuario, User


@pytest.mark.django_db
class TestUsersAndAuth:
    def setup_method(self):
        self.client = APIClient()

    def test_register_and_login_flow(self):
        # 1. Auto-cadastro (Sign Up)
        payload = {
            'email': 'servidor@sdu.pi.gov.br',
            'nome': 'Carlos Servidor',
            'password': 'SenhaForte@123',
            'papel': PapelUsuario.SERVIDOR,
            'secretaria': 'SDU Leste',
            'setor': 'SDU: Protocolo',
            'cargo': 'Atendente de Protocolo',
            'matricula': 'MAT-1001',
        }
        res = self.client.post('/api/auth/register/', payload, format='json')
        assert res.status_code == 201
        assert 'access' in res.data
        assert 'refresh' in res.data
        assert res.data['user']['email'] == 'servidor@sdu.pi.gov.br'
        assert res.data['user']['papel'] == 'servidor'

        # 2. Login via /api/auth/login/
        login_res = self.client.post(
            '/api/auth/login/',
            {'email': 'servidor@sdu.pi.gov.br', 'password': 'SenhaForte@123'},
            format='json',
        )
        assert login_res.status_code == 200
        assert login_res.data['user']['nome'] == 'Carlos Servidor'
        token = login_res.data['access']

        # 3. Consulta e atualização de perfil em /api/auth/me/
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        me_res = self.client.get('/api/auth/me/')
        assert me_res.status_code == 200
        assert me_res.data['setor'] == 'SDU: Protocolo'

        # Usuário comum não consegue promover a si mesmo para admin
        patch_res = self.client.patch(
            '/api/auth/me/',
            {'cargo': 'Analista Técnico', 'papel': 'admin'},
            format='json',
        )
        assert patch_res.status_code == 200
        assert patch_res.data['cargo'] == 'Analista Técnico'
        assert patch_res.data['papel'] == 'servidor'

    def test_admin_crud_usuarios(self):
        admin = User.objects.create_superuser(
            email='admin@secti.pi.gov.br',
            nome='Admin SECTI',
            password='AdminPassword@123',
        )
        login_res = self.client.post(
            '/api/auth/login/',
            {'email': admin.email, 'password': 'AdminPassword@123'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        # Create (Admin cadastra Chefe do Setor / Validador)
        create_res = self.client.post(
            '/api/usuarios/',
            {
                'email': 'chefe.ceu@sdu.pi.gov.br',
                'nome': 'Coordenação CEU',
                'password': 'Validador@123',
                'papel': PapelUsuario.VALIDADOR,
                'secretaria': 'SDU Leste',
                'setor': 'SDU: CEU',
                'cargo': 'Coordenadora',
            },
            format='json',
        )
        assert create_res.status_code == 201
        user_id = create_res.data['id']
        assert create_res.data['papel'] == 'validador'

        # List + Filtro por papel
        list_res = self.client.get('/api/usuarios/?papel=validador')
        assert list_res.status_code == 200
        assert len(list_res.data) == 1
        assert list_res.data[0]['email'] == 'chefe.ceu@sdu.pi.gov.br'

        # Update
        upd_res = self.client.patch(
            f'/api/usuarios/{user_id}/',
            {'setor': 'SDU: CEU - DAP'},
            format='json',
        )
        assert upd_res.status_code == 200
        assert upd_res.data['setor'] == 'SDU: CEU - DAP'

        # Delete
        del_res = self.client.delete(f'/api/usuarios/{user_id}/')
        assert del_res.status_code == 204
        assert not User.objects.filter(id=user_id).exists()

    def test_admin_creates_supervisor_with_scoped_permissions(self):
        admin = User.objects.create_superuser(
            email='admin@secti.pi.gov.br',
            nome='Admin SECTI',
            password='AdminPassword@123',
        )
        self.client.force_authenticate(user=admin)

        response = self.client.post(
            '/api/usuarios/',
            {
                'email': 'supervisora@sdu.pi.gov.br',
                'nome': 'Supervisora do Setor',
                'password': 'SenhaForte@123',
                'papel': PapelUsuario.SUPERVISOR,
                'cpf': '529.982.247-25',
                'secretaria': 'SDU Leste',
                'setor': 'Protocolo',
                'setores_vinculados': ['Protocolo', 'Licenciamento'],
                'permissoes': [
                    'aprovar_fluxos',
                    'acessar_dashboard',
                    'gerar_editar_diagramas_institucionais',
                    'exportar_artefatos',
                ],
                'is_active': True,
            },
            format='json',
        )

        assert response.status_code == 201, response.data
        assert response.data['papel'] == PapelUsuario.SUPERVISOR
        assert response.data['cpf'] == '52998224725'
        assert response.data['setores_vinculados'] == ['Protocolo', 'Licenciamento']
        assert response.data['permissoes'] == [
            'aprovar_fluxos',
            'acessar_dashboard',
            'gerar_editar_diagramas_institucionais',
            'exportar_artefatos',
        ]

        invalid_permission = self.client.patch(
            f"/api/usuarios/{response.data['id']}/",
            {'permissoes': ['executar_atividades']},
            format='json',
        )
        assert invalid_permission.status_code == 400

    def test_non_admin_cannot_create_or_delete_other_users(self):
        u1 = User.objects.create_user(
            email='u1@sdu.pi.gov.br',
            nome='Servidor 1',
            password='Password@123',
            papel=PapelUsuario.SERVIDOR,
        )
        u2 = User.objects.create_user(
            email='u2@sdu.pi.gov.br',
            nome='Servidor 2',
            password='Password@123',
            papel=PapelUsuario.SERVIDOR,
        )
        login_res = self.client.post(
            '/api/auth/login/',
            {'email': u1.email, 'password': 'Password@123'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_res.data['access']}")

        list_res = self.client.get('/api/usuarios/')
        assert list_res.status_code == 200
        assert [user['id'] for user in list_res.data] == [str(u1.id)]

        # Servidor comum não pode criar usuários via /api/usuarios/
        res_create = self.client.post(
            '/api/usuarios/',
            {
                'email': 'novo@sdu.pi.gov.br',
                'nome': 'Novo',
                'password': 'Password@123',
            },
            format='json',
        )
        assert res_create.status_code == 403

        # Servidor comum não pode editar nem deletar outro usuário
        res_patch = self.client.patch(f'/api/usuarios/{u2.id}/', {'nome': 'Hack'}, format='json')
        assert res_patch.status_code == 404

        self_patch = self.client.patch(
            f'/api/usuarios/{u1.id}/',
            {'setor': 'Outro setor', 'permissoes': ['aprovar_fluxos']},
            format='json',
        )
        assert self_patch.status_code == 200
        assert self_patch.data['setor'] == ''
        assert self_patch.data['permissoes'] == []

        res_del = self.client.delete(f'/api/usuarios/{u1.id}/')
        assert res_del.status_code == 403

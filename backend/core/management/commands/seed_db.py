import os
import uuid
from django.core.management.base import BaseCommand
from core.models import (
    EntrevistaProcesso,
    PapelUsuario,
    PerguntaEntrevista,
    Processo,
    StatusProcesso,
    User,
)


class Command(BaseCommand):
    help = "Popula o banco com os dados iniciais do FluxoIA (Usuários RBAC, Perguntas da Entrevista e Processos de Exemplo)"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Iniciando seed de dados do FluxoIA..."))

        # 1. Usuários RBAC
        usuarios = [
            {
                "email": "admin@secti.pi.gov.br",
                "nome": "Admin SECTI",
                "papel": PapelUsuario.ADMIN,
                "secretaria": "SECTI",
                "setor": "Governança Digital",
                "cargo": "Administrador da Plataforma",
                "matricula": "ADM-001",
            },
            {
                "email": "supervisor@sdu.pi.gov.br",
                "nome": "Araci Parente",
                "papel": PapelUsuario.SUPERVISOR,
                "secretaria": "SDU Leste",
                "setor": "SDU: Protocolo",
                "setores_vinculados": ["SDU: Protocolo", "SDU: Licenciamento"],
                "cargo": "Supervisora de Setor",
                "matricula": "SUP-001",
            },
            {
                "email": "coordenador@sdu.pi.gov.br",
                "nome": "Mariana Costa",
                "papel": PapelUsuario.COORDENADOR,
                "secretaria": "SDU Leste",
                "setor": "SDU: CEU - DAP",
                "cargo": "Coordenadora Operacional",
                "matricula": "COORD-001",
            },
            {
                "email": "operacional@sdu.pi.gov.br",
                "nome": "Carlos Silva",
                "papel": PapelUsuario.OPERACIONAL,
                "secretaria": "SDU Leste",
                "setor": "SDU: Protocolo",
                "cargo": "Analista Operacional",
                "matricula": "OP-001",
            },
        ]

        for dados in usuarios:
            user, criado = User.objects.get_or_create(
                email=dados["email"],
                defaults=dados,
            )
            if not criado:
                self.stdout.write(
                    self.style.WARNING(
                        f"[SKIP] {dados['email']} já existe — perfil, dados e senha preservados."
                    )
                )
                continue

            senha_seed = os.getenv("SEED_USER_PASSWORD", "").strip()
            if senha_seed:
                user.set_password(senha_seed)
                user.save(update_fields=["password"])
                self.stdout.write(self.style.SUCCESS(f"[OK] {dados['email']} criado com senha de SEED_USER_PASSWORD."))
            else:
                user.set_unusable_password()
                user.save(update_fields=["password"])
                self.stdout.write(
                    self.style.WARNING(
                        f"[OK] {dados['email']} criado sem senha utilizável. "
                        f"Defina-a com: python manage.py changepassword {dados['email']}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] {len(usuarios)} usuários RBAC verificados (criação idempotente, sem sobrescrita)."
            )
        )

        # 2. Perguntas da Entrevista Guiada
        perguntas = [
            {
                "chave": "trigger",
                "ordem": 1,
                "titulo": "Início do Processo",
                "enunciado": "O que dá início ao processo? Quem é o solicitante inicial (é um requerente externo como cidadão/empresa, ou é uma unidade interna da Secretaria/órgão)?",
                "obrigatoria": True,
                "ativa": True,
            },
            {
                "chave": "activities",
                "ordem": 2,
                "titulo": "Atividades Principais",
                "enunciado": "Quais atividades principais são executadas ao longo do processo, desde o recebimento até a conclusão final?",
                "obrigatoria": True,
                "ativa": True,
            },
            {
                "chave": "areasInvolved",
                "ordem": 3,
                "titulo": "Áreas e Unidades Envolvidas",
                "enunciado": "Quais áreas, diretorias ou unidades participam deste processo e em qual momento cada uma atua?",
                "obrigatoria": True,
                "ativa": True,
            },
            {
                "chave": "sequence",
                "ordem": 4,
                "titulo": "Sequência da Tramitação",
                "enunciado": "Qual é a ordem sequencial em que as atividades tramitam entre os setores?",
                "obrigatoria": True,
                "ativa": True,
            },
            {
                "chave": "responsibles",
                "ordem": 5,
                "titulo": "Responsáveis por Etapa",
                "enunciado": "Quem é o responsável por executar cada etapa (ex: solicitante/requerente, atendente do protocolo, analista técnico, fiscal, coordenação ou comissão)?",
                "obrigatoria": True,
                "ativa": True,
            },
            {
                "chave": "approvals",
                "ordem": 6,
                "titulo": "Aprovações e Vistorias",
                "enunciado": "Existe alguma etapa formal de aprovação, visto, vistoria técnica, despacho de chefia ou parecer jurídico?",
                "obrigatoria": False,
                "ativa": True,
            },
            {
                "chave": "rules",
                "ordem": 7,
                "titulo": "Regras de Negócio",
                "enunciado": "Existem regras de negócio, exigências legais ou critérios regimentais obrigatórios para o deferimento?",
                "obrigatoria": False,
                "ativa": True,
            },
            {
                "chave": "fees",
                "ordem": 8,
                "titulo": "Taxas e Custos",
                "enunciado": "Este processo envolve cobrança de taxas públicas, emolumentos ou guias de recolhimento? Se sim, quais são e em que momento são emitidas/pagas? Se for gratuito ou processo interno, basta indicar que não há taxas.",
                "obrigatoria": False,
                "ativa": True,
            },
            {
                "chave": "exceptions",
                "ordem": 9,
                "titulo": "Pendências, Exceções e Prazos",
                "enunciado": "O que acontece em caso de inconformidade, pendência de documentos ou autuação/multa? Há prazo limite (ex: 30 ou 90 dias) para saneamento antes do cancelamento/encerramento do processo?",
                "obrigatoria": False,
                "ativa": True,
            },
            {
                "chave": "documents",
                "ordem": 10,
                "titulo": "Documentação e Anexos",
                "enunciado": "Quais documentos, formulários, certidões ou peças instrutórias são exigidos para autuar ou instruir o processo (incluindo exigências condicionais, se houver)?",
                "obrigatoria": False,
                "ativa": True,
            },
            {
                "chave": "systems",
                "ordem": 11,
                "titulo": "Sistemas Utilizados",
                "enunciado": "Quais sistemas e plataformas são utilizados durante a tramitação (ex: Plataforma SEI, Construa Fácil, Processo Físico, ou outros)?",
                "obrigatoria": False,
                "ativa": True,
            },
            {
                "chave": "completion",
                "ordem": 12,
                "titulo": "Encerramento e Entrega",
                "enunciado": "Quando o processo é considerado concluído e o que é entregue ou registrado ao final (ex: emissão de certidão/licença, deferimento, publicação ou arquivamento)?",
                "obrigatoria": False,
                "ativa": True,
            },
        ]

        for p in perguntas:
            PerguntaEntrevista.objects.update_or_create(chave=p["chave"], defaults=p)

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(perguntas)} Perguntas da entrevista guiada cadastradas."))

        # 3. Processos de Exemplo
        operacional = User.objects.filter(email="operacional@sdu.pi.gov.br").first()
        coordenador = User.objects.filter(email="coordenador@sdu.pi.gov.br").first()
        supervisor = User.objects.filter(email="supervisor@sdu.pi.gov.br").first()

        processos_seed = [
            {
                "codigo": "BPMN-SDU-2026-00001",
                "nome": "Licenciamento de Obras e Reformas",
                "secretaria": "SDU Leste",
                "setor": "SDU: Protocolo",
                "objetivo": "Tramitar e analisar solicitações de alvará e licenças urbanísticas.",
                "descricao": "Mapeamento do fluxo de entrada de processos físicos e digitais na SDU Leste.",
                "legislacao": "Código de Obras Municipal e Lei de Zoneamento.",
                "etapa_atual": 4,
                "status": StatusProcesso.APROVADO,
                "versao_atual": "1.0",
                "criado_por": operacional or supervisor,
                "aprovado_por": supervisor,
                "respostas": {
                    "trigger": "Requerimento presencial no protocolo ou protocolo digital.",
                    "activities": "1. Triagem e conferência documental; 2. Vistoria fiscal; 3. Parecer técnico e despacho decisório.",
                    "areasInvolved": "SDU: Protocolo, SDU: Licenciamento, Secretaria de Finanças",
                    "sequence": "Protocolo -> Vistoria Técnica -> Despacho Decisório -> Emissão de Alvará",
                    "responsibles": "Atendente de Protocolo, Engenheiro/Fiscal, Diretor de Licenciamento",
                    "approvals": "Sim, deferimento final do Diretor de Licenciamento.",
                    "rules": "Prazo máximo de 15 dias úteis para emissão do parecer fiscal.",
                    "exceptions": "Documentação incompleta gera notificação com prazo de 10 dias para saneamento.",
                    "documents": "Requerimento padrão, certidão de registro do imóvel e ART/RRT.",
                    "systems": "Sistema SEI e Plataforma Gov.pi",
                    "completion": "Entrega do alvará impresso ou envio de PDF assinado digitalmente.",
                },
            },
            {
                "codigo": "BPMN-SDU-2026-00002",
                "nome": "Aquisição Direta por Dispensa de Licitação",
                "secretaria": "SDU Leste",
                "setor": "SDU: CEU - DAP",
                "objetivo": "Realizar compras de pequenos valores e serviços de urgência.",
                "descricao": "Fluxo operacional para suprimento emergencial de insumos setoriais.",
                "legislacao": "Lei Federal nº 14.133/2021 (Nova Lei de Licitações).",
                "etapa_atual": 4,
                "status": StatusProcesso.AGUARDANDO_VALIDACAO,
                "versao_atual": "1.0",
                "criado_por": coordenador or operacional or supervisor,
                "respostas": {
                    "trigger": "Abertura de documento de oficialização de demanda (DOD).",
                    "activities": "1. Estudo técnico preliminar; 2. Coleta de três cotações de mercado; 3. Análise jurídica e empenho.",
                    "areasInvolved": "SDU: CEU - DAP, Gerência de Compras e Assessoria Jurídica",
                    "sequence": "DOD -> Pesquisa de Preços -> Parecer Jurídico -> Empenho",
                    "responsibles": "Demandante do setor, Analista de Compras e Procurador",
                    "approvals": "Aprovação do Ordenador de Despesas e Secretário Municipal.",
                    "rules": "Valor total abaixo do limite do art. 75, II da Lei 14.133/2021.",
                    "exceptions": "Cotações insuficientes exigem justificativa fundamentada de preços públicos.",
                    "documents": "DOD, Termo de Referência, mapa comparativo de preços e nota de empenho.",
                    "systems": "Sistema Integrado de Gestão Financeira e SEI",
                    "completion": "Publicação do aviso de dispensa no Diário Oficial e emissão da Ordem de Fornecimento.",
                },
            },
            {
                "codigo": "BPMN-SDU-2026-00003",
                "nome": "Atendimento ao Cidadão e Ouvidoria",
                "secretaria": "SDU Leste",
                "setor": "SDU: Protocolo",
                "objetivo": "Receber, classificar e responder manifestações de cidadãos.",
                "descricao": "Canal de registro de denúncias, elogios e solicitações de serviços urbanos.",
                "legislacao": "Lei de Acesso à Informação e Código de Defesa do Usuário do Serviço Público.",
                "etapa_atual": 4,
                "status": StatusProcesso.AJUSTES_SOLICITADOS,
                "versao_atual": "1.0",
                "criado_por": operacional or supervisor,
                "respostas": {
                    "trigger": "Registro da manifestação pelo cidadão no canal de Ouvidoria.",
                    "activities": "1. Classificação do teor da demanda; 2. Encaminhamento ao setor competente; 3. Resposta conclusiva ao cidadão.",
                    "areasInvolved": "SDU: Protocolo e Ouvidoria Setorial",
                    "sequence": "Registro da Demanda -> Classificação -> Encaminhamento Interno -> Resposta Final",
                    "responsibles": "Ouvidor e Coordenador do Setor Demandado",
                    "approvals": "Validação da resposta pela chefia do setor demandado.",
                    "rules": "Prazo de 20 dias para resposta inicial prorrogável por mais 10 dias.",
                    "exceptions": "Demandas anônimas sem elementos mínimos de apuração são arquivadas.",
                    "documents": "Formulário de ouvidoria e despacho de resposta setorial.",
                    "systems": "Plataforma Fala.BR / Ouvidoria Municipal",
                    "completion": "Envio da resposta conclusiva por e-mail ou notificação no portal.",
                },
            },
        ]

        for dados in processos_seed:
            respostas = dados.pop("respostas")
            processo, _ = Processo.objects.update_or_create(codigo=dados["codigo"], defaults=dados)
            EntrevistaProcesso.objects.update_or_create(
                processo=processo,
                defaults={"pergunta_atual_idx": 10, "respostas": respostas},
            )

        self.stdout.write(self.style.SUCCESS(f"[OK] {len(processos_seed)} Processos com entrevistas sincronizados."))
        self.stdout.write(self.style.SUCCESS("Banco de dados populado com sucesso!"))

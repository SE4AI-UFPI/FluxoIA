from datetime import datetime
from django.core.management.base import BaseCommand
from django.db.models import Avg, Count

from core.models import (
    DecisaoGovernanca,
    FeedbackFluxoIA,
    LogValidacaoRespostaEntrevista,
    OrigemVersaoBPMN,
    Processo,
    RevisaoGovernanca,
    StatusProcesso,
    VersaoFluxoBPMN,
)

CODIGOS_SEED = {
    "BPMN-SDU-2026-00001",
    "BPMN-SDU-2026-00002",
    "BPMN-SDU-2026-00003",
}


class Command(BaseCommand):
    help = (
        "Calcula e imprime todas as métricas consolidadas do Piloto Controlado (Fase IV - F4.DO1) "
        "a partir dos registros reais do banco de dados."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--incluir-seed",
            action="store_true",
            help="Inclui também os 3 processos de demonstração criados pelo seed_db.",
        )
        parser.add_argument(
            "--desde",
            type=str,
            default=None,
            help="Filtra processos criados a partir da data informada (formato YYYY-MM-DD).",
        )

    def handle(self, *args, **options):
        incluir_seed: bool = options["incluir_seed"]
        desde_str: str | None = options["desde"]

        qs_processos = Processo.objects.exclude(status=StatusProcesso.EXCLUIDO)

        if desde_str:
            try:
                dt_inicio = datetime.strptime(desde_str, "%Y-%m-%d")
                qs_processos = qs_processos.filter(criado_em__date__gte=dt_inicio.date())
            except ValueError:
                self.stderr.write(
                    self.style.ERROR(f"Formato de data inválido em --desde: '{desde_str}'. Use YYYY-MM-DD.")
                )
                return

        if not incluir_seed:
            qs_sem_seed = qs_processos.exclude(codigo__in=CODIGOS_SEED)
            if qs_sem_seed.exists():
                qs_processos = qs_sem_seed
            else:
                self.stdout.write(
                    self.style.WARNING(
                        "[Aviso] Nenhum processo novo (além do seed_db) foi encontrado ainda. "
                        "Exibindo métricas com os dados do seed para demonstração.\n"
                    )
                )

        processos = list(
            qs_processos.select_related("criado_por", "aprovado_por").prefetch_related(
                "versoes_bpmn", "feedbacks_ia", "revisoes_governanca"
            )
        )
        processo_ids = [p.id for p in processos]

        self.stdout.write(self.style.MIGRATE_HEADING("=" * 80))
        self.stdout.write(self.style.MIGRATE_HEADING("  RELATÓRIO DE MÉTRICAS DO PILOTO CONTROLADO — FLUXOIA (FASE IV)"))
        self.stdout.write(self.style.MIGRATE_HEADING("=" * 80))

        if not processos:
            self.stdout.write(self.style.WARNING("Nenhum processo encontrado para os filtros informados."))
            return

        # ----------------------------------------------------------------------
        # 1. Métricas de Sistema e Modelo (VersaoFluxoBPMN)
        # ----------------------------------------------------------------------
        versoes = list(VersaoFluxoBPMN.objects.filter(processo_id__in=processo_ids))
        versoes_ia = [
            v for v in versoes if v.origem in (OrigemVersaoBPMN.IA, OrigemVersaoBPMN.REGENERACAO_IA)
        ]

        latencias: list[float] = []
        tokens_totais: list[int] = []
        xmls_validos = 0

        for v in versoes_ia:
            if v.bpmn_xml and "<bpmn:definitions" in v.bpmn_xml or "<definitions" in (v.bpmn_xml or ""):
                xmls_validos += 1
            meta = (v.estrutura_json or {}).get("meta_ia") or {}
            lat = meta.get("latencia_segundos")
            if isinstance(lat, (int, float)) and lat >= 0:
                latencias.append(float(lat))
            usage = meta.get("usage") or {}
            tot_tok = usage.get("total_tokens")
            if isinstance(tot_tok, int) and tot_tok > 0:
                tokens_totais.append(tot_tok)

        media_latencia = sum(latencias) / len(latencias) if latencias else None
        min_latencia = min(latencias) if latencias else None
        max_latencia = max(latencias) if latencias else None
        media_tokens = sum(tokens_totais) / len(tokens_totais) if tokens_totais else None
        taxa_xml_valido = (xmls_validos / len(versoes_ia) * 100) if versoes_ia else 100.0

        # ----------------------------------------------------------------------
        # 2. Métricas de Percepção do Modelo e Uso (FeedbackFluxoIA)
        # ----------------------------------------------------------------------
        feedbacks = list(FeedbackFluxoIA.objects.filter(processo_id__in=processo_ids))
        total_fb = len(feedbacks)
        if total_fb > 0:
            media_precisao = sum(f.nota_precisao_geral for f in feedbacks) / total_fb
            media_clareza = sum(f.clareza_entrevista for f in feedbacks) / total_fb
            taxa_representa = sum(1 for f in feedbacks if f.representa_processo) / total_fb * 100
            dist_edicao = {}
            for f in feedbacks:
                dist_edicao[f.nivel_edicao_necessario] = dist_edicao.get(f.nivel_edicao_necessario, 0) + 1
        else:
            media_precisao = None
            media_clareza = None
            taxa_representa = None
            dist_edicao = {}

        # ----------------------------------------------------------------------
        # 3. Métricas de Valor / Tempo e Governança (Processo & RevisaoGovernanca)
        # ----------------------------------------------------------------------
        tempos_submissao_min: list[float] = []
        tempos_homologacao_min: list[float] = []

        status_counts: dict[str, int] = {}
        concluidos_homologacao = 0
        submetidos_governanca = 0

        for p in processos:
            status_counts[p.status] = status_counts.get(p.status, 0) + 1
            if p.status in (StatusProcesso.APROVADO, StatusProcesso.PUBLICADO):
                concluidos_homologacao += 1
            if p.status in (
                StatusProcesso.AGUARDANDO_VALIDACAO,
                StatusProcesso.AJUSTES_SOLICITADOS,
                StatusProcesso.APROVADO,
                StatusProcesso.PUBLICADO,
            ):
                submetidos_governanca += 1

            if p.submetido_em and p.criado_em:
                diff_sub = (p.submetido_em - p.criado_em).total_seconds() / 60.0
                if diff_sub >= 0:
                    tempos_submissao_min.append(diff_sub)

            if p.aprovado_em and p.criado_em:
                diff_apr = (p.aprovado_em - p.criado_em).total_seconds() / 60.0
                if diff_apr >= 0:
                    tempos_homologacao_min.append(diff_apr)

        media_tempo_sub = (
            sum(tempos_submissao_min) / len(tempos_submissao_min) if tempos_submissao_min else None
        )
        media_tempo_apr = (
            sum(tempos_homologacao_min) / len(tempos_homologacao_min) if tempos_homologacao_min else None
        )

        revisoes = list(RevisaoGovernanca.objects.filter(processo_id__in=processo_ids))
        rev_aprovadas = sum(1 for r in revisoes if r.decisao == DecisaoGovernanca.APROVADO)
        rev_ajustes = sum(1 for r in revisoes if r.decisao == DecisaoGovernanca.AJUSTES_SOLICITADOS)
        rev_rejeitadas = sum(1 for r in revisoes if r.decisao == DecisaoGovernanca.REJEITADO)

        taxa_conclusao = (concluidos_homologacao / len(processos)) * 100 if processos else 0.0
        taxa_submissao = (submetidos_governanca / len(processos)) * 100 if processos else 0.0

        # ----------------------------------------------------------------------
        # 4. Métricas do Validador Semântico da Entrevista (LogValidacaoRespostaEntrevista)
        # ----------------------------------------------------------------------
        qs_logs_val = LogValidacaoRespostaEntrevista.objects.all()
        if desde_str:
            qs_logs_val = qs_logs_val.filter(criado_em__date__gte=dt_inicio.date())
        logs_val = list(qs_logs_val.select_related("usuario", "processo"))
        total_logs_val = len(logs_val)
        logs_validos = sum(1 for lg in logs_val if lg.status == "valida")
        logs_vagos = sum(1 for lg in logs_val if lg.status == "vaga")
        logs_invalidos = sum(1 for lg in logs_val if lg.status == "invalida")
        logs_via_ia = [lg for lg in logs_val if lg.origem == "ia_llm"]
        media_lat_val_ia = (
            sum(lg.latencia_segundos for lg in logs_via_ia) / len(logs_via_ia)
            if logs_via_ia
            else None
        )

        # ----------------------------------------------------------------------
        # Impressão Formatada
        # ----------------------------------------------------------------------
        self.stdout.write(f"\n1. VISÃO GERAL DO VOLUME DO PILOTO")
        self.stdout.write(f"   • Processos avaliados: {len(processos)}")
        self.stdout.write(f"   • Distribuição por status: {status_counts}")
        self.stdout.write(
            f"   • Versões BPMN salvas: {len(versoes)} (Gerações IA: {len(versoes_ia)} | Edições manuais: {len(versoes) - len(versoes_ia)})"
        )
        self.stdout.write(
            f"   • Pareceres do Supervisor: {len(revisoes)} (Aprovações: {rev_aprovadas} | Pedidos de ajuste: {rev_ajustes} | Rejeições: {rev_rejeitadas})"
        )
        self.stdout.write(f"   • Avaliações de Feedback (Etapa 4): {total_fb}")
        self.stdout.write(
            f"   • Validações de Respostas da Entrevista: {total_logs_val} "
            f"(Válidas: {logs_validos} | Vagas/Sugestão: {logs_vagos} | Inválidas/Bloqueadas: {logs_invalidos})"
        )

        self.stdout.write(f"\n2. INDICADORES CONSOLIDADOS (PARA TABELA DA SEÇÃO 3 DO F4.DO1)")
        self.stdout.write("   --------------------------------------------------------------------------")

        # Sistema
        if media_latencia is not None:
            lat_str = f"{media_latencia:.2f} s (mín: {min_latencia:.2f} s | máx: {max_latencia:.2f} s)"
        else:
            lat_str = "Sem registro em meta_ia.latencia_segundos (consulte painel LiteLLM :4000/ui)"
        tok_str = f"{media_tokens:.0f} tokens/geração" if media_tokens is not None else "N/D"
        self.stdout.write(f"   [SISTEMA]  Latência de geração IA : {lat_str}")
        self.stdout.write(f"   [SISTEMA]  Consumo médio de tokens: {tok_str}")

        # Modelo
        prec_str = f"{media_precisao:.2f} / 5.0" if media_precisao is not None else "Sem feedbacks registrados"
        repr_str = f"{taxa_representa:.1f}%" if taxa_representa is not None else "N/D"
        self.stdout.write(f"   [MODELO]   Diagramas XML válidos  : {taxa_xml_valido:.1f}% ({xmls_validos}/{len(versoes_ia)})")
        self.stdout.write(f"   [MODELO]   Nota média de Acurácia : {prec_str}")
        self.stdout.write(f"   [MODELO]   Representa o processo  : {repr_str}")
        if dist_edicao:
            self.stdout.write(f"   [MODELO]   Nível de edição manual : {dist_edicao}")

        # Valor para o demandante
        sub_str = f"{media_tempo_sub:.1f} min" if media_tempo_sub is not None else "N/D"
        apr_str = f"{media_tempo_apr:.1f} min" if media_tempo_apr is not None else "N/D"
        self.stdout.write(f"   [VALOR]    Tempo médio até envio  : {sub_str} (Operacional: criação -> submissão)")
        self.stdout.write(f"   [VALOR]    Tempo até homologação  : {apr_str} (Ponta a ponta: criação -> aprovação)")

        # Uso e confiança
        clar_str = f"{media_clareza:.2f} / 5.0" if media_clareza is not None else "Sem feedbacks registrados"
        self.stdout.write(f"   [USO/CONF] Clareza da entrevista  : {clar_str}")
        self.stdout.write(
            f"   [USO/CONF] Taxa de submissão      : {taxa_submissao:.1f}% ({submetidos_governanca}/{len(processos)} chegaram ao Supervisor)"
        )
        self.stdout.write(
            f"   [USO/CONF] Taxa de homologação    : {taxa_conclusao:.1f}% ({concluidos_homologacao}/{len(processos)} aprovados/publicados)"
        )
        self.stdout.write("   --------------------------------------------------------------------------")

        self.stdout.write(f"\n3. DETALHAMENTO POR PROCESSO (EVIDÊNCIAS DO PILOTO)")
        for p in processos:
            v_list = list(p.versoes_bpmn.all())
            fb_list = list(p.feedbacks_ia.all())
            rev_list = list(p.revisoes_governanca.all())

            lats_proc = [
                (v.estrutura_json or {}).get("meta_ia", {}).get("latencia_segundos")
                for v in v_list
                if isinstance((v.estrutura_json or {}).get("meta_ia", {}).get("latencia_segundos"), (int, float))
            ]
            lat_p_str = f"{sum(lats_proc)/len(lats_proc):.1f}s" if lats_proc else "N/D"

            t_sub_p = (
                f"{(p.submetido_em - p.criado_em).total_seconds() / 60.0:.1f} min"
                if (p.submetido_em and p.criado_em)
                else "N/D"
            )
            t_apr_p = (
                f"{(p.aprovado_em - p.criado_em).total_seconds() / 60.0:.1f} min"
                if (p.aprovado_em and p.criado_em)
                else "N/D"
            )
            fb_p = fb_list[0] if fb_list else None
            fb_str = (
                f"Acurácia={fb_p.nota_precisao_geral}/5, Clareza={fb_p.clareza_entrevista}/5, Edição={fb_p.nivel_edicao_necessario}"
                if fb_p
                else "Sem feedback"
            )

            self.stdout.write(
                f"   • [{p.codigo or 'S/C'}] {p.nome}\n"
                f"     Autor: {p.criado_por.email} | Status: {p.status} | Versões: {len(v_list)} | Pareceres: {len(rev_list)}\n"
                f"     Tempo Envio: {t_sub_p} | Tempo Homologação: {t_apr_p} | Latência IA: {lat_p_str}\n"
                f"     Avaliação: {fb_str}"
            )
            if fb_p and fb_p.observacoes:
                self.stdout.write(f"     Comentário Operacional: \"{fb_p.observacoes}\"")
            for r in rev_list:
                self.stdout.write(
                    f"     Parecer Supervisor ({r.decisao}): \"{r.parecer}\" — por {r.revisor.email}"
                )

        intervencoes = [lg for lg in logs_val if lg.status in ("vaga", "invalida")]
        if intervencoes:
            self.stdout.write(f"\n4. INTERVENÇÕES DA IA NA ENTREVISTA (RESPOSTAS VAGAS OU INVÁLIDAS)")
            if media_lat_val_ia is not None:
                self.stdout.write(f"   Latência média das validações via LLM: {media_lat_val_ia:.2f} s")
            for lg in intervencoes:
                autor_email = lg.usuario.email if lg.usuario else "Anônimo"
                self.stdout.write(
                    f"   • [{lg.status.upper()}] Pergunta: {lg.titulo_pergunta} ({lg.chave_pergunta}) | Origem: {lg.origem}\n"
                    f"     Processo: {lg.processo_nome or 'N/D'} | Usuário: {autor_email}\n"
                    f"     Resposta tentada: \"{lg.resposta_enviada}\"\n"
                    f"     Feedback da IA: \"{lg.mensagem_feedback}\" | Sugestão: \"{lg.sugestao_melhoria}\""
                )

        self.stdout.write(self.style.MIGRATE_HEADING("=" * 80))

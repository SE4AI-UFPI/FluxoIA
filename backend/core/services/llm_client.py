from dataclasses import dataclass, field
import json
import re
from typing import Any

from django.conf import settings


class LLMServiceError(Exception):
    """Exceção de domínio disparada quando o provedor de IA falha ou não está configurado."""


@dataclass
class LLMCompletionResult:
    content: str
    model: str
    provider: str
    usage: dict[str, Any] = field(default_factory=dict)


class LLMClient:
    """
    Gateway desacoplado de comunicação com LLMs.
    Permite alternar entre LiteLLM (SDK ou Proxy), DeepSeek, OpenAI, Gemini ou LLM local (Ollama/vLLM)
    apenas via variáveis de ambiente, sem acoplar o restante do sistema a uma SDK específica.
    """

    def __init__(
        self,
        *,
        provider: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: int | None = None,
    ):
        self.provider = (provider or getattr(settings, 'LLM_PROVIDER', 'litellm')).strip().lower()
        self.model = (model or getattr(settings, 'LLM_MODEL', 'gemini/gemini-2.0-flash')).strip()
        self.base_url = (base_url if base_url is not None else getattr(settings, 'LLM_BASE_URL', '')).strip()
        self.api_key = (api_key if api_key is not None else getattr(settings, 'LLM_API_KEY', '')).strip()
        self.timeout = timeout or int(getattr(settings, 'LLM_TIMEOUT', 60))

    def _validar_configuracao(self) -> None:
        """Falha cedo com mensagem acionável quando não há credencial nem endpoint local."""
        provedores_com_chave = {'litellm', 'openai_compatible', 'openai', 'deepseek'}
        if self.provider in provedores_com_chave and not self.api_key and not self.base_url:
            raise LLMServiceError(
                'Provedor de IA sem credencial. Crie o arquivo backend/.env (a partir de '
                'backend/.env.example) com LLM_API_KEY e, se necessário, LLM_BASE_URL, e '
                'reinicie o servidor Django — as variáveis só são lidas na inicialização. '
                'Para uso local com Ollama, use LLM_PROVIDER=openai_compatible e '
                'LLM_BASE_URL=http://localhost:11434/v1.'
            )

    def gerar_completacao(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        usuario_identificador: str | None = None,
    ) -> LLMCompletionResult:
        self._validar_configuracao()

        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ]

        if self.provider == 'litellm':
            return self._chamar_via_litellm(
                messages=messages,
                temperature=temperature,
                usuario_identificador=usuario_identificador,
            )

        if self.provider in ('openai_compatible', 'openai', 'deepseek', 'local', 'ollama'):
            return self._chamar_via_openai_compatible(
                messages=messages,
                temperature=temperature,
                usuario_identificador=usuario_identificador,
            )

        raise LLMServiceError(f"Provedor de IA '{self.provider}' não suportado.")
    def gerar_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        usuario_identificador: str | None = None,
    ) -> tuple[dict[str, Any], LLMCompletionResult]:
        resultado = self.gerar_completacao(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            usuario_identificador=usuario_identificador,
        )
        dados = extrair_json_da_resposta(resultado.content)
        return dados, resultado

    def _chamar_via_litellm(
        self,
        *,
        messages: list[dict[str, str]],
        temperature: float,
        usuario_identificador: str | None = None,
    ) -> LLMCompletionResult:
        try:
            import litellm
        except ImportError as exc:
            raise LLMServiceError(
                'Pacote litellm não está instalado no ambiente. '
                'Instale com "pip install -r requirements.txt" ou use LLM_PROVIDER=openai_compatible.'
            ) from exc

        kwargs: dict[str, Any] = {
            'model': self.model,
            'messages': messages,
            'temperature': temperature,
            'timeout': self.timeout,
        }
        if self.api_key:
            kwargs['api_key'] = self.api_key
        if self.base_url:
            kwargs['api_base'] = self.base_url
        if usuario_identificador:
            kwargs['user'] = usuario_identificador

        try:
            response = litellm.completion(**kwargs)
            content = response.choices[0].message.content or ''
            usage_obj = getattr(response, 'usage', None)
            usage = {
                'prompt_tokens': getattr(usage_obj, 'prompt_tokens', 0) if usage_obj else 0,
                'completion_tokens': getattr(usage_obj, 'completion_tokens', 0) if usage_obj else 0,
                'total_tokens': getattr(usage_obj, 'total_tokens', 0) if usage_obj else 0,
            }
            return LLMCompletionResult(
                content=content,
                model=getattr(response, 'model', self.model) or self.model,
                provider='litellm',
                usage=usage,
            )
        except Exception as exc:
            raise LLMServiceError(
                f'Não foi possível obter resposta do provedor de IA ({self.model}): {exc}'
            ) from exc

    def _chamar_via_openai_compatible(
        self,
        *,
        messages: list[dict[str, str]],
        temperature: float,
        usuario_identificador: str | None = None,
    ) -> LLMCompletionResult:
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise LLMServiceError('Pacote openai não está instalado no ambiente.') from exc

        client_kwargs: dict[str, Any] = {
            'api_key': self.api_key or 'local-no-key',
            'timeout': self.timeout,
        }
        if self.base_url:
            client_kwargs['base_url'] = self.base_url

        try:
            client = OpenAI(**client_kwargs)
            req_kwargs: dict[str, Any] = {
                'model': self.model,
                'messages': messages,
                'temperature': temperature,
            }
            if usuario_identificador:
                req_kwargs['user'] = usuario_identificador

            response = client.chat.completions.create(**req_kwargs)
            content = response.choices[0].message.content or ''
            usage_obj = getattr(response, 'usage', None)
            usage = {
                'prompt_tokens': getattr(usage_obj, 'prompt_tokens', 0) if usage_obj else 0,
                'completion_tokens': getattr(usage_obj, 'completion_tokens', 0) if usage_obj else 0,
                'total_tokens': getattr(usage_obj, 'total_tokens', 0) if usage_obj else 0,
            }
            return LLMCompletionResult(
                content=content,
                model=getattr(response, 'model', self.model) or self.model,
                provider=self.provider,
                usage=usage,
            )
        except Exception as exc:
            raise LLMServiceError(
                f'Não foi possível obter resposta do servidor compatível com OpenAI ({self.model}): {exc}'
            ) from exc


def extrair_json_da_resposta(texto: str) -> dict[str, Any]:
    """Extrai o objeto JSON principal de uma resposta da LLM (mesmo se vier cercado por blocos markdown)."""
    limpo = texto.strip()
    bloco = re.search(r'```(?:json)?\s*(\{.*\})\s*```', limpo, flags=re.DOTALL)
    if bloco:
        limpo = bloco.group(1).strip()
    else:
        inicio = limpo.find('{')
        fim = limpo.rfind('}')
        if inicio != -1 and fim != -1 and fim > inicio:
            limpo = limpo[inicio : fim + 1]

    try:
        parsed = json.loads(limpo)
    except json.JSONDecodeError as exc:
        raise LLMServiceError('A resposta do modelo de IA não retornou um JSON válido.') from exc

    if not isinstance(parsed, dict):
        raise LLMServiceError('A resposta estruturada da IA deve ser um objeto JSON.')
    return parsed

"""Cliente leve para enviar logs ao Grafana Loki via HTTP push API.

Os logs são enviados em modo *best-effort*: se o Loki estiver indisponível, a
exceção é silenciada para nunca derrubar a aplicação por causa de logging. Todo
evento também é escrito no stdout do container (via logging padrão), de modo que
`docker service logs` continua funcionando como fallback.

Formato do payload conforme a Loki Push API (`POST /loki/api/v1/push`):
https://grafana.com/docs/loki/latest/reference/loki-http-api/#ingest-logs
"""
import logging
import time

import httpx

from app.config import get_settings

logger = logging.getLogger("cineview")

# Label usada para filtrar este serviço no Loki: {service="fastapi"}.
SERVICE_LABEL = "fastapi"

_LEVELS = {
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
}


def _now_ns() -> str:
    """Timestamp atual em nanossegundos (string), como o Loki exige."""
    return str(time.time_ns())


def _push_url() -> str:
    return f"{get_settings().loki_url.rstrip('/')}/loki/api/v1/push"


def _build_payload(message: str, level: str) -> dict:
    return {
        "streams": [
            {
                "stream": {"service": SERVICE_LABEL, "level": level},
                "values": [[_now_ns(), message]],
            }
        ]
    }


def _emit_stdout(message: str, level: str) -> None:
    logger.log(_LEVELS.get(level, logging.INFO), message)


def log_event(message: str, level: str = "info") -> None:
    """Registra um evento no stdout e tenta enviá-lo ao Loki (síncrono).

    Usado em contextos não-assíncronos (inicialização, erros de banco).
    """
    _emit_stdout(message, level)
    try:
        httpx.post(_push_url(), json=_build_payload(message, level), timeout=2.0)
    except Exception:  # noqa: BLE001 - logging nunca pode quebrar a aplicação
        pass


async def alog_event(message: str, level: str = "info") -> None:
    """Versão assíncrona, para uso no middleware sem bloquear a resposta."""
    _emit_stdout(message, level)
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(_push_url(), json=_build_payload(message, level))
    except Exception:  # noqa: BLE001 - logging nunca pode quebrar a aplicação
        pass

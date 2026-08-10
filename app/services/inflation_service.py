"""Inflation adjustment backed by INDEC's national CPI historical series."""

import asyncio
import csv
import io
from datetime import date, datetime, timedelta, timezone
from urllib.request import Request, urlopen


INDEC_IPC_URL = "https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv"
_CACHE_TTL = timedelta(hours=12)
_ipc_cache: dict[int, float] | None = None
_cache_updated_at: datetime | None = None


def _fetch_national_ipc() -> dict[int, float]:
    """Download INDEC's CSV and keep only the national general-level CPI."""
    request = Request(INDEC_IPC_URL, headers={"User-Agent": "JuntaCuentas/1.0"})
    with urlopen(request, timeout=15) as response:  # noqa: S310 - fixed official HTTPS URL
        payload = response.read()
    try:
        csv_text = payload.decode("utf-8-sig")
    except UnicodeDecodeError:
        # The historical series currently uses the encoding common in INDEC's CSVs.
        csv_text = payload.decode("cp1252")

    indices: dict[int, float] = {}
    for row in csv.DictReader(io.StringIO(csv_text), delimiter=";"):
        if row.get("Codigo", "").strip() != "0":
            continue
        if row.get("Region", "").strip().casefold() != "nacional":
            continue
        try:
            period = int(row["Periodo"])
            index = float(row["Indice_IPC"].replace(".", "").replace(",", "."))
        except (KeyError, TypeError, ValueError):
            continue
        indices[period] = index

    if not indices:
        raise ValueError("INDEC did not return national CPI data")
    return indices


async def _get_national_ipc() -> dict[int, float]:
    global _ipc_cache, _cache_updated_at

    now = datetime.now(timezone.utc)
    if _ipc_cache is not None and _cache_updated_at and now - _cache_updated_at < _CACHE_TTL:
        return _ipc_cache

    indices = await asyncio.to_thread(_fetch_national_ipc)
    _ipc_cache = indices
    _cache_updated_at = now
    return indices


def _period(value: date) -> int:
    return value.year * 100 + value.month


async def adjust_for_inflation(
    amount: float,
    expense_date: date,
    reference_date: date | None = None,
) -> dict:
    """Adjust an amount only when INDEC publishes both required CPI periods.

    An unavailable series never fabricates an increase: the original amount is
    returned unchanged and the caller receives a reason for the UI.
    """
    reference = reference_date or date.today()
    original = round(amount, 2)

    try:
        indices = await _get_national_ipc()
    except Exception:  # Network outages must not prevent using the group.
        return {
            "original": original,
            "adjusted": original,
            "factor": 1.0,
            "reference_date": reference,
            "inflation_applied": False,
            "reason": "No se pudo consultar el IPC nacional del INDEC.",
        }

    expense_period = _period(expense_date)
    available_reference_periods = [period for period in indices if period <= _period(reference)]
    reference_period = max(available_reference_periods, default=None)
    source_index = indices.get(expense_period)

    if source_index is None or reference_period is None:
        return {
            "original": original,
            "adjusted": original,
            "factor": 1.0,
            "reference_date": reference,
            "inflation_applied": False,
            "reason": "INDEC no publica un IPC nacional para una de las fechas del gasto.",
        }

    reference_index = indices[reference_period]
    if reference_index <= source_index:
        return {
            "original": original,
            "adjusted": original,
            "factor": 1.0,
            "reference_date": reference,
            "inflation_applied": False,
            "reason": "No hay un IPC INDEC posterior para aplicar al gasto.",
        }

    factor = reference_index / source_index
    return {
        "original": original,
        "adjusted": round(amount * factor, 2),
        "factor": factor,
        "reference_date": date(reference_period // 100, reference_period % 100, 1),
        "inflation_applied": True,
        "reason": "Actualizado con el IPC nacional publicado por INDEC.",
    }

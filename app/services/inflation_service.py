"""
Inflation adjustment service.

MVP: hardcoded factor = 1.15 (mock).
V2: this file will connect to the INDEC API — endpoints stay untouched.
"""

from datetime import date


async def adjust_for_inflation(
    amount: float,
    expense_date: date,
    reference_date: date | None = None,
) -> dict:
    """Return the inflation-adjusted amount for a given expense.

    Parameters
    ----------
    amount:
        Original expense amount.
    expense_date:
        Date when the expense was incurred.
    reference_date:
        Date to adjust to.  Defaults to today.

    Returns
    -------
    dict with keys: original, adjusted, factor, reference_date.
    """
    factor = 1.15  # MVP mock — replace with INDEC lookup in V2
    reference = reference_date or date.today()
    return {
        "original": round(amount, 2),
        "adjusted": round(amount * factor, 2),
        "factor": factor,
        "reference_date": reference,
    }

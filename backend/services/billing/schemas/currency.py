"""
MindFlow Billing Service - Currency Schemas and Utilities
"""

from typing import Dict

from pydantic import BaseModel


class CurrencyInfo(BaseModel):
    """Currency information."""
    code: str
    name: str
    symbol: str


SUPPORTED_CURRENCIES: Dict[str, CurrencyInfo] = {
    "INR": CurrencyInfo(code="INR", name="Indian Rupees", symbol="\u20b9"),
    "USD": CurrencyInfo(code="USD", name="US Dollars", symbol="$"),
}

VALID_CURRENCY_CODES = set(SUPPORTED_CURRENCIES.keys())


def get_currency_symbol(currency: str) -> str:
    """
    Return the display symbol for a currency code.

    Args:
        currency: ISO 4217 currency code (INR or USD).

    Returns:
        Currency symbol string.

    Raises:
        ValueError: If currency code is not supported.
    """
    info = SUPPORTED_CURRENCIES.get(currency)
    if not info:
        raise ValueError(f"Unsupported currency: {currency}. Supported: {', '.join(VALID_CURRENCY_CODES)}")
    return info.symbol


def format_currency(amount, currency: str) -> str:
    """
    Format an amount with currency symbol and proper formatting.

    Args:
        amount: Decimal or numeric amount.
        currency: ISO 4217 currency code.

    Returns:
        Formatted string like '₹ 1,248.40' or '$ 500.00'.
    """
    symbol = get_currency_symbol(currency)
    return f"{symbol} {amount:,.2f}"

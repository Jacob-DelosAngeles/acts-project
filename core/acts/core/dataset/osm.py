"""Module containing OSM dataset loading functions."""

from __future__ import annotations

import pathlib
import re
import unicodedata

import pandas as pd

from acts.core import logging


__all__ = [
    # Function exports
    "load_osm",
]

logger = logging.get_logger(__name__)


def load_osm(name: str) -> pd.DataFrame:
    """Loads a parquet file from our datasets."""
    filename = f"{_slugify(name)}.parquet"
    filedir = pathlib.Path(__file__).parent.resolve()
    filepath = filedir.joinpath("parquets", filename)

    logger.running(f"Fetching {filepath!r}")
    output = pd.read_parquet(filepath)
    logger.success(f"Fetching {filepath!r}")

    return output


def _slugify(value: str, *, allow_unicode: bool = False) -> str:
    """Converts a string into a filename-safe version.

    Taken from github.com/django/django/blob/master/django/utils/text.py

    Convert to ASCII if `allow_unicode` is `False`. Convert spaces or
    repeated dashes to single dashes. Remove characters that aren't
    alphanumerics, underscores, or hyphens. Convert to lowercase. Also
    strip leading and trailing whitespace, dashes, and underscores.
    """
    value = str(value)
    if allow_unicode:
        value = unicodedata.normalize("NFKC", value)
    else:
        value = unicodedata.normalize("NFKD", value)
        value = value.encode("ascii", "ignore").decode("ascii")

    value = re.sub(r"[^\w\s-]", "", value.lower())
    return re.sub(r"[-\s]+", "-", value).strip("-_")

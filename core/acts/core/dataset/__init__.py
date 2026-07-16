"""acts.core.dataset package."""

from __future__ import annotations

from typing import Callable

import pandas as pd

from acts.core.dataset.osm import load_osm as OSM
from acts.core.dataset.survey import divide


# fmt: off
__all__ = [
    # Function exports
    "load",
    "divide",

    # Constant exports
    "OSM",
]
# fmt: on


def load(
    nameorfile: str,
    *,
    dtype: Callable = OSM,
    **kwargs,
) -> pd.DataFrame:
    if dtype not in [OSM]:
        raise ValueError(f"Unknown dataset type: {dtype!r}")
    return dtype(nameorfile, **kwargs)

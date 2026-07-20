"""Run the full chain of discrete-choice models over a survey dataset.

Shared by the HTTP API (`api/main.py`) and the bundled desktop engine
(`acts_engine.py`) so both paths produce identical results from the same
code rather than drifting apart.
"""

from __future__ import annotations

import pandas as pd

from acts import model
from acts.core import logging


logger = logging.get_logger(__name__)


# Keys are the names the desktop app's Outputs page expects.
MODEL_FUNCTIONS = {
    "travel": model.TravelDecisionMLogit,
    "activity": model.ActivityChoiceMLogit,
    "dest": model.DestinationChoiceMLogit,
    "mode": model.ModeChoiceMLogit,
}


def summarize(mlogit, correlation: pd.DataFrame | None) -> dict:
    """Convert a fitted model's summary tables into JSON-serializable data.

    A model that could not be fit at all (e.g. a constant dependent
    variable) has no summary; report it as empty rather than failing.
    """
    summary = mlogit.summary()
    if summary is None:
        return {"overview": [], "analysis": [], "correlation": []}

    overview = pd.read_html(
        summary.tables[0].as_html(), header=0, index_col=0
    )[0]
    analysis = pd.read_html(
        summary.tables[1].as_html(), header=0, index_col=0
    )[0]

    return {
        "overview": overview.reset_index().to_dict(orient="records"),
        "analysis": analysis.reset_index().to_dict(orient="records"),
        "correlation": (
            correlation.reset_index().to_dict(orient="records")
            if correlation is not None else []
        ),
    }


def run_all(df: pd.DataFrame) -> dict:
    """Fit all four models and return their summaries keyed by model name.

    Each model is fit independently: one failing (e.g. a degenerate column
    in the survey) returns its error alongside the models that succeeded
    instead of sinking the whole run.
    """
    results = {}

    for name, fit in MODEL_FUNCTIONS.items():
        try:
            mlogit, correlation = fit(df, output_correlation=True)
            results[name] = summarize(mlogit, correlation)
        except Exception as error:  # noqa: BLE001 - report, don't crash
            logger.error("Model %s failed: %s", name, error)
            results[name] = {
                "error": str(error),
                "overview": [],
                "analysis": [],
                "correlation": [],
            }

    return results

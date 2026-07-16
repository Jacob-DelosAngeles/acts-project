"""Module containing the utility functions for modeling."""

from __future__ import annotations

import pandas as pd

from acts.core.dataset.survey import divide
from acts.core.model.base import MultinomialLogisticRegression


def travel_choice_mlogit(df: pd.DataFrame) -> pd.DataFrame:
    return _base_choice_function(df, "ZONE")


def activity_choice_mlogit(df: pd.DataFrame) -> pd.DataFrame:
    return _base_choice_function(df, "ACTIVITY")


def destination_choice_mlogit(df: pd.DataFrame) -> pd.DataFrame:
    return _base_choice_function(df, "DES")


def mode_choice_mlogit(df: pd.DataFrame, *, verbose: bool = False) -> pd.DataFrame:
    return _base_choice_function(
        df,
        "MODEFM",
        dep_vars=[
            "DESTFM",
            "ACT",
            "TRVFREQ",
            "AGEB",
            "MEMB",
            "OVEHB",
            "NVEHB",
            "OCCUB",
            "MINCOMEB",
            "TRAVTIMEFM",
        ],
        verbose=verbose,
    )


def _base_choice_function(
    df: pd.DataFrame,
    indep_var: str,
    *,
    verbose: bool = False,
    dep_vars: list[str] | None = None,
) -> pd.DataFrame:
    x, y = divide(df, indep_var=indep_var, dep_vars=dep_vars)

    mlogit_model = MultinomialLogisticRegression(y, x, fit_intercept=True)
    mlogit_result = mlogit_model.fit()

    if verbose:
        print(mlogit_result.summary())

    return mlogit_result

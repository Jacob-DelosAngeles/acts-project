"""Module containing survey-related data loading functions."""

from __future__ import annotations

import pandas as pd


__all__ = [
    # Function exports
    "divide",
]


def divide(df: str, **kwargs) -> pd.DataFrame:
    """Load and return the sample coded dataset (classification)."""

    # Normalize values
    if kwargs.get("normalize", False):
        df = (df - df.min()) / (df.max() - df.min())

    # Convert all columns to lowercase
    df.columns = map(str.lower, df.columns)

    independent_column = kwargs.get("indep_var", "mode").lower()

    dependent_colums = list(df.columns)
    dependent_colums = kwargs.get("dep_vars", dependent_colums) or dependent_colums
    dependent_colums = [c.lower() for c in dependent_colums]

    if independent_column in dependent_colums:
        dependent_colums.remove(independent_column)

    x = df[dependent_colums]
    y = df[independent_column]

    return x, y

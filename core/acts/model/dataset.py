"""Module containing survey-related data loading functions."""

from __future__ import annotations

import time

from statsmodels.stats.outliers_influence import variance_inflation_factor
import numpy as np
import pandas as pd
import joblib


__all__ = [
    # Function exports
    "divide",
    "apply_collinearity_filter",
]


def apply_collinearity_filter(X, vif_threshold: float = 10.0):
    for i in X.columns:
        if X[i].nunique() == 1:
            X = X.drop(columns=i)

    columns = list(X.columns)
    vifs = joblib.Parallel(n_jobs=-1, verbose=0)(
        joblib.delayed(variance_inflation_factor)(
            X[columns].values, i
        ) for i in range(X[columns].shape[1])
    )

    columns = [
        column for column, vif in zip(columns, vifs)
        if vif < vif_threshold
    ]

    return X[columns]


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

    if "const" in dependent_colums:
        dependent_colums.remove("const")

    X = df[dependent_colums]
    y = df[independent_column]

    return X, y

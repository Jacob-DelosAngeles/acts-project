"""acts.core.model package."""

from __future__ import annotations

import numpy as np
import pandas as pd

from acts.core.model import util
from acts.core.model.base import MultinomialLogisticRegression
from acts.core.model.base import LogisticRegression

from acts.core.dataset.survey import divide


def TravelDecisionMLogit(df: pd.DataFrame, threshold: float = 0.05):
    """Travel Generation/Travel Decision MLogit Model.

    Returns:
        significant_vars: A list of column names representing the
            significant variables in the input DataFrame.
        output_df: Modified DataFrame containing all the rows where
            an agent went to travel (TRAVEL value == 1).
    """
    # Filter only travelling datasets
    output_filter = df["travel"] == 1
    output_df = df.copy(deep=True)[output_filter]
    output_df = output_df.drop(["travel"], axis=1)

    if output_filter.all():
        travel_significant_vars = [c for c in df.columns if c != "travel"]
        return travel_significant_vars, output_df

    mlogit, *_ = MLogit(df, "travel")
    return mlogit.get_significant_vars(threshold=threshold), output_df


def ActivityChoiceMLogit(df: pd.DataFrame, threshold: float = 0.05):
    """Activity Choice MLogit Model.

    Returns:
        significant_vars: A list of column names representing the
            significant variables in the input DataFrame.
        df: Return input dataframe.
    """
    x, y = divide(df, indep_var="act")
    return LogisticRegression(multi_class="multinomial", solver="newton-cg", random_state=0, max_iter=1_000_000)


def DestinationChoiceMLogit(dfs: list[pd.DataFrame], threshold: float = 0.05):
    """Destination Choice MLogit Model.

    Returns:
        significant_vars: A list of column names representing the
            significant variables in the input DataFrame.
        dfs: Return input dataframe.
    """
    output = {}
    for choice, df in dfs.items():
        # mlogit = MLogit(df, "destfm")
        print(df)
        # output[choice] = (
        #     mlogit.get_significant_vars(threshold=threshold),
        #     df,
        # )

    return output


def MLogit(
    df: pd.DataFrame,
    indep_var: str,
    *dep_vars: tuple(str),
    significant_vars: list[str] | None = None,
) -> pd.DataFrame:
    x, y = divide(df, indep_var=indep_var, dep_vars=list(dep_vars))

    try:
        mlogit_model = MultinomialLogisticRegression(y, x, fit_intercept=True)
        return mlogit_model.fit()

    except np.linalg.LinAlgError:
        logit_model = LogisticRegression(y, x, fit_intercept=True)
        return logit_model.fit()


def Logit(
    df: pd.DataFrame,
    indep_var: str,
    *dep_vars: tuple(str),
) -> pd.DataFrame:
    x, y = divide(df, indep_var=indep_var, dep_vars=list(dep_vars))

    logit_model = LogisticRegression(y, x, fit_intercept=True)
    return logit_model.fit()

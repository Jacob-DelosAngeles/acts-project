"""acts.core.model package."""

from __future__ import annotations

import numpy as np
import pandas as pd

from acts.model.base import MultinomialLogisticRegression
from acts.model.base import LogisticRegression
from acts.model.base import NoneResult

from acts.model import dataset

MAX_ITERATIONS = 100


def TravelDecisionMLogit(
    df: pd.DataFrame,
    pvalue_threshold: float = 0.05,
    vif_threshold: float = 10.0,
    output_correlation: bool = False,
):
    return _DynamicBaseMLogit(
        df, "travel", pvalue_threshold, vif_threshold,
        output_correlation=output_correlation,
    )


def ActivityChoiceMLogit(
    df: pd.DataFrame,
    pvalue_threshold: float = 0.05,
    vif_threshold: float = 10.0,
    output_correlation: bool = False,
):
    return _DynamicBaseMLogit(
        df, "act", pvalue_threshold, vif_threshold,
        output_correlation=output_correlation,
    )


def ModeChoiceMLogit(
    df: pd.DataFrame,
    pvalue_threshold: float = 0.05,
    vif_threshold: float = 10.0,
    output_correlation: bool = False,
):
    try:
        return _DynamicBaseMLogit(
            df, "modelm", pvalue_threshold, vif_threshold,
            output_correlation=output_correlation,
        )
    except Exception:
        return _DynamicBaseMLogit(
            df, "modefm", pvalue_threshold, vif_threshold,
            output_correlation=output_correlation,
        )


def DestinationChoiceMLogit(
    df: pd.DataFrame,
    pvalue_threshold: float = 0.05,
    vif_threshold: float = 10.0,
    output_correlation: bool = False,
):
    try:
        return _DynamicBaseMLogit(
            df, "destfd", pvalue_threshold, vif_threshold,
            output_correlation=output_correlation,
        )
    except Exception:
        return _DynamicBaseMLogit(
            df, "destfm", pvalue_threshold, vif_threshold,
            output_correlation=output_correlation,
        )

def loop(mlogit,pvalue_threshold,df,indep_var):
    # print('========= OLD ============',mlogit.summary())
    mlogit_sfvars = mlogit.get_significant_vars(threshold=pvalue_threshold)
    X, y = dataset.divide(df, indep_var=indep_var, dep_vars=mlogit_sfvars)
    # print(mlogit_sfvars)
    nmlogit = _BaseMLogit(X, y)
    # print('========= NEW ============',nmlogit.summary())
    return nmlogit


def p_values_need_loop(con):
    for i in con['P>|z|']:
        try:
            if float(i) > 0.05:
                return True
        except:
            pass
    return False

def _DynamicBaseMLogit(
    df: pd.DataFrame,
    indep_var: str,
    pvalue_threshold: float,
    vif_threshold: float,
    output_correlation: bool = False,
):
    X, y = dataset.divide(df, indep_var=indep_var)

    # Logistic Regression needs at least two unique values (binary)
    if y.nunique() <= 1:
        print("Number of unique feature values is equal to 1")
        return NoneResult(), None

    X = dataset.apply_collinearity_filter(X, vif_threshold=vif_threshold)

    mlogit = _BaseMLogit(X, y)
    # mlogit_sfvars = mlogit.get_significant_vars(threshold=pvalue_threshold)
    # print(mlogit.summary())
    # X, y = dataset.divide(df, indep_var=indep_var, dep_vars=mlogit_sfvars)
    # mlogit = _BaseMLogit(X, y)
    # print(mlogit.summary())
    #
    # mlogit_sfvars = mlogit.get_significant_vars(threshold=pvalue_threshold)
    # print(mlogit_sfvars)
    # X, y = dataset.divide(df, indep_var=indep_var, dep_vars=mlogit_sfvars)
    # mlogit = _BaseMLogit(X, y)
    # print(mlogit.summary())
    #
    # mlogit_sfvars = mlogit.get_significant_vars(threshold=pvalue_threshold)
    # print(mlogit_sfvars)
    # X, y = dataset.divide(df, indep_var=indep_var, dep_vars=mlogit_sfvars)
    # mlogit = _BaseMLogit(X, y)
    # print(mlogit.summary())

    con = pd.read_html(mlogit.summary().tables[1].as_html(), header=0, index_col=0)[0]
    to_loop = p_values_need_loop(con)

    iterations = 1
    while to_loop:
        mlogit = loop(mlogit,pvalue_threshold,df,indep_var)
        con = pd.read_html(mlogit.summary().tables[1].as_html(), header=0, index_col=0)[0]
        to_loop = p_values_need_loop(con)
        iterations += 1
        print('=============', iterations)
        if iterations == MAX_ITERATIONS:
            break

    if not output_correlation:
        return mlogit

    # Process and return correlation
    ordered_column = [y.name] + list(X.columns)
    X[y.name] = y
    X.columns = ordered_column

    # print(mlogit.summary())
    return mlogit, X.corr()


def _BaseMLogit(X: np.array, y: np.array) -> LogisticRegression:
    _MLogitClass = {
        True: MultinomialLogisticRegression,
        False: LogisticRegression,
    }[len(np.unique(y)) > 2]

    mlogit = _MLogitClass(y, X, fit_intercept=True)
    mlogit = mlogit.fit()

    return mlogit

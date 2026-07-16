"""Module containing the base model for the whole project."""

from __future__ import annotations

from statsmodels.api import add_constant
from statsmodels.base.model import LikelihoodModel
from statsmodels.discrete.discrete_model import (
    BinaryResultsWrapper as _BinaryResultsWrapper,
)
from statsmodels.discrete.discrete_model import BinaryModel
from statsmodels.discrete.discrete_model import Logit
from statsmodels.discrete.discrete_model import LogitResults
from statsmodels.discrete.discrete_model import MNLogit
from statsmodels.discrete.discrete_model import MultinomialResults
from statsmodels.discrete.discrete_model import (
    MultinomialResultsWrapper as _MultinomialResultsWrapper,
)
import numpy as np


class MultinomialLogisticRegression(MNLogit):
    def __init__(
        self,
        endog,
        exog,
        check_rank=True,
        fit_intercept=False,
        **kwargs,
    ):
        if fit_intercept:
            exog = add_constant(exog)
        super().__init__(endog, exog, check_rank=True, **kwargs)

    def fit(
        self,
        start_params=None,
        method="ncg",
        maxiter=35,
        full_output=True,
        disp=True,
        callback=None,
        **kwargs,
    ):
        if start_params is None:
            start_params = np.zeros((self.K * (self.J - 1)))
        else:
            start_params = np.asarray(start_params)

        def callback(x):  # Placeholder until check_perfect_pred
            return None

        # Skip calling super to handle results from LikelihoodModel
        mnfit = LikelihoodModel.fit(
            self,
            start_params=start_params,
            method=method,
            maxiter=maxiter,
            full_output=full_output,
            disp=disp,
            callback=callback,
            **kwargs,
        )

        mnfit.params = mnfit.params.reshape(self.K, -1, order="F")
        mnfit = MultinomialResults(self, mnfit)
        return MultinomialResultsWrapper(mnfit)


class MultinomialResultsWrapper(_MultinomialResultsWrapper):
    def get_significant_vars(self, threshold: float):
        """Return all the variables that has less than 5% p-value."""
        pvalues = self.pvalues.applymap(lambda x: True if x < threshold else False)
        output = {}
        for column in pvalues.columns:
            output[column] = list(pvalues[pvalues[column]].index)
        return output


class LogisticRegression(Logit):
    def __init__(
        self,
        endog,
        exog,
        check_rank=True,
        fit_intercept=False,
        **kwargs,
    ):
        if fit_intercept:
            exog = add_constant(exog)
        super().__init__(endog, exog, check_rank=True, **kwargs)

    def fit(
        self,
        start_params=None,
        method="ncg",
        maxiter=35,
        full_output=True,
        disp=True,
        callback=None,
        **kwargs,
    ):

        bnryfit = BinaryModel.fit(
            self,
            start_params=start_params,
            method=method,
            maxiter=maxiter,
            full_output=full_output,
            disp=disp,
            callback=callback,
            **kwargs,
        )

        discretefit = LogitResults(self, bnryfit)
        return BinaryResultsWrapper(discretefit)


class BinaryResultsWrapper(_BinaryResultsWrapper):
    def get_significant_vars(self, threshold: float):
        """Return all the variables that has less than 5% p-value."""
        pvalues = self.pvalues.applymap(lambda x: True if x < threshold else False)
        output = {}
        for column in pvalues.columns:
            output[column] = list(pvalues[pvalues[column]].index)
        return output

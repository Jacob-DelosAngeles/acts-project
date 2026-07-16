<div align="center" dir="auto">
  <img src="external/images/logo.png" alt="Project ACTS Logo">
</div>

![Python](https://img.shields.io/badge/Python-3.7%20%7C%203.8%20%7C%203.9%20%7C%203.10-blue)
[![PyPI version](https://badge.fury.io/py/acts.core.svg)](https://badge.fury.io/py/acts.core)

## What is it?

**ACTS Core** is Project ACTS' core Python library. It will contain the modeling necessary for the research project as well as its core functions. These includes tabular-input file processing, bounded OSM dataset fetching, etc.

## Where to get it?

The source code is currently hosted in GitHub: [https://github.com/project-acts/acts-core](https://github.com/project-acts/acts-core)

Installation of the latest version is available at the Python Package Index (PyPI)

```shell
$ pip install acts.core
```

## Dependencies

- [Pandas - is a fast, powerful, flexible and easy to use open source data analysis and manipulation tool.](https://pandas.pydata.org/)
- [PyArrow - is a set of technologies that enable big data systems to store, process and move data fast.](https://arrow.apache.org/docs/python/)
- [scikit-learn - is a Python module for machine learning built on top of SciPy.](https://scikit-learn.org/stable/getting_started.html)

## Installation from sources

To install `acts.core` from source, locate and go in the **acts-core** directory (same one where you found this file after cloning the git repository), execute:

```shell
$ pip install .
```

or for installing in [development mode](https://pip.pypa.io/en/latest/cli/pip_install/#install-editable):

```shell
$ pip install -e .
```

## Contribution guidelines

If you want to contribute to **acts-core**, be sure to review the [contribution guidelines](CONTRIBUTING.md). By participating, you are expected to uphold this guidelines.

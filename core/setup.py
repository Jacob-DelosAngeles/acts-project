"""ACTS Core is the Core Backend Python Library for Project ACTS."""

from __future__ import annotations

import setuptools
import os


PACKAGE_ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
DOCLINES = __doc__.split("\n")


def get_requirements() -> list[str]:
    """Merge the base library deps with the top-level (Lambda/S3) extras.

    requirements/base.txt carries what acts.core/acts.model actually import
    (pandas, numpy, etc). Top-level requirements.txt only listed the AWS
    Lambda extras (boto3, s3fs, lxml) and was missing pandas entirely, so
    `pip install -e .` alone left the package unimportable.
    """
    package_list = []
    for filename in ("requirements/base.txt", "requirements.txt"):
        filepath = os.path.join(PACKAGE_ROOT_DIR, filename)
        with open(filepath, "r") as fp:
            package_list += [line.rstrip() for line in fp.readlines()]

    return sorted(set(filter(None, package_list)))


def get_version() -> str:
    version = {}
    version_file = os.path.join(
        PACKAGE_ROOT_DIR,
        "acts",
        "version.py",
    )
    with open(os.path.join(version_file)) as fp:
        exec(fp.read(), version)

    return version["__version__"]


setuptools.setup(
    name="acts",
    description=DOCLINES[0],
    author="Arbyn Argabioso",
    version=get_version(),
    install_requires=get_requirements(),
    include_package_data=True,
    packages=setuptools.find_packages(),
    python_requires=">=3.7",
)

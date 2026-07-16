"""Module containing generic utility functions."""

from __future__ import annotations

import uuid as uuidlib


__all__ = [
    # Constant exports
    "ACTS_NAMESPACE",
    # Function exports
    "generate_random_id",
    "generate_id",
]


ACTS_NAMESPACE = uuidlib.UUID("bd795e2b-6f74-4266-8d5a-40429e5fe7cb")


def generate_random_id(*, hex: bool = False) -> str:
    uuid = uuidlib.uuid4()
    if hex:
        return uuid.hex
    return str(uuid)


def generate_id(input_string: str, *, hex: bool = False) -> str:
    uuid = uuidlib.uuid5(ACTS_NAMESPACE, input_string)
    if hex:
        return uuid.hex
    return str(uuid)

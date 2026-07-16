"""Test containing importability of the library."""


def test__acts_core__import():
    import acts.core as acts  # noqa: F401
    assert dir().count("acts") == 1

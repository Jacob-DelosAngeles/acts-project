"""Tests for acts.core.version."""

from acts.core import version


class TestVersion:
    def test__version__value(self):
        assert str(version._MAJOR_VERSION) in version.__version__
        assert str(version._MINOR_VERSION) in version.__version__
        assert str(version._PATCH_VERSION) in version.__version__

        assert "." in version.__version__

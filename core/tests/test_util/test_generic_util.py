"""Tests for acts.core.util.generic_util."""

from acts.core import util


class TestGenericUtil:
    def test__generate_random_id__correct_return(self):
        id_records = []

        for i in range(10):
            current_id = util.generate_random_id()

            assert current_id not in id_records
            assert isinstance(current_id, str)

            id_records.append(current_id)

    def test__generate_random_id__hex_return(self):
        assert "-" not in util.generate_random_id(hex=True)

    def test__generate_id__correct_return(self):
        assert util.generate_id("12") == "e0d8180e-28aa-574f-8f79-d9afbc126f91"
        assert util.generate_id("ab") == "7d1620cc-5152-5720-a77f-8fdebf44db26"

    def test__generate_id__hex_return(self):
        assert util.generate_id("12", hex=True) == (
            "e0d8180e28aa574f8f79d9afbc126f91"
        )
        assert util.generate_id("ab", hex=True) == (
            "7d1620cc51525720a77f8fdebf44db26"
        )

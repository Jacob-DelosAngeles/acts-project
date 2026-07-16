"""Tests for acts.core.dataset."""

import numpy as np

from acts.core import dataset


class TestDataset:
    def test__load__quezon_city(self):
        df = dataset.load("Quezon City")

        way_267 = df.loc[df["way"] == 267]
        way_1052579105 = df.loc[df["way"] == 1052579105]

        assert len(way_267) == 6

        assert self.close_to_any(14.650115, way_267.lon)
        assert self.close_to_any(14.650262, way_267.lon)
        assert self.close_to_any(14.650287, way_267.lon)
        assert self.close_to_any(14.650296, way_267.lon)
        assert self.close_to_any(14.650269, way_267.lon)
        assert self.close_to_any(14.650154, way_267.lon)

        assert self.close_to_any(121.051952, way_267.lat)
        assert self.close_to_any(121.052091, way_267.lat)
        assert self.close_to_any(121.052130, way_267.lat)
        assert self.close_to_any(121.052167, way_267.lat)
        assert self.close_to_any(121.052432, way_267.lat)
        assert self.close_to_any(121.053577, way_267.lat)

        assert len(way_1052579105) == 4

        assert self.close_to_any(14.612344, way_1052579105.lon)
        assert self.close_to_any(14.612435, way_1052579105.lon)
        assert self.close_to_any(14.614302, way_1052579105.lon)
        assert self.close_to_any(14.616023, way_1052579105.lon)

        assert self.close_to_any(121.061068, way_1052579105.lat)
        assert self.close_to_any(121.061020, way_1052579105.lat)
        assert self.close_to_any(121.060160, way_1052579105.lat)
        assert self.close_to_any(121.059361, way_1052579105.lat)

    def test__slugify__allow_unicode(self):
        assert dataset.osm._slugify(
            "Quezon City", allow_unicode=True
        ) == "quezon-city"

    def close_to_any(self, a, b, **kwargs):
        return np.any(np.isclose(a, b, **kwargs))

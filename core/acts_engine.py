"""Standalone model engine for the ACTS desktop app.

Reads a survey CSV and writes the fitted model summaries to stdout as JSON,
in exactly the shape the app's Outputs page expects (the same shape the
HTTP API returns, since both call `acts.runner.run_all`).

PyInstaller bundles this into a self-contained executable so the desktop
app can fit models on the user's own CPU -- no Python install, no network,
and the survey data never leaves the machine.

Usage:
    acts-engine <survey.csv> [-o results.json]

Diagnostics go to stderr so stdout stays pure JSON for the caller.
"""

from __future__ import annotations

import argparse
import json
import multiprocessing
import os
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="acts-engine",
        description="Fit the ACTS discrete-choice models over a survey CSV.",
    )
    parser.add_argument("csv", help="Path to the survey CSV file.")
    parser.add_argument(
        "-o",
        "--output",
        help="Write JSON here instead of stdout.",
    )
    args = parser.parse_args(argv)

    # Run the VIF filter in-process. joblib's default (n_jobs=-1) forks a
    # worker per core, and in a PyInstaller-frozen build each fork re-executes
    # this executable — so parallelism here risks a spawn storm for no real
    # gain on a job this size. Respect an explicit override if one is set.
    os.environ.setdefault("ACTS_VIF_N_JOBS", "1")

    # Imported here, not at module scope, so --help stays instant instead of
    # paying the multi-second pandas/statsmodels import cost.
    import pandas as pd

    from acts import runner

    try:
        df = pd.read_csv(args.csv)
    except Exception as error:  # noqa: BLE001 - surface as JSON, not a stack
        json.dump({"error": f"Could not read {args.csv}: {error}"}, sys.stdout)
        return 2

    payload = {
        "results": runner.run_all(df),
        "status": {"code": 200, "message": "OK"},
    }

    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            json.dump(payload, handle)
    else:
        json.dump(payload, sys.stdout)

    return 0


if __name__ == "__main__":
    # Required before anything may spawn processes: in a frozen build a child
    # process re-runs this executable, and without this guard it would re-run
    # main() instead of behaving as a worker.
    multiprocessing.freeze_support()
    sys.exit(main())

from __future__ import annotations

from collections import defaultdict
import base64
import io
import json as jsonlib
import os
import urllib.parse
import time

import boto3
import pandas as pd


s3 = boto3.client("s3")


def lambda_handler(event, context):
    print("Received event:")
    print(jsonlib.dumps(event))

    # Get the object from the event and process
    bucket = os.environ["ACTS_OUTPUT_FILES_BUCKET"]
    raw = urllib.parse.unquote_plus(
        event["pathParameters"]["filename"],
        encoding="utf-8"
    )

    # # ### TEST
    # bucket = "acts-output-files"
    # raw = urllib.parse.unquote_plus("3c8dac68-47c2-47d2-9c3d-ffe5aff5b4c3%2FBefore+COVID+Input+File.csv")

    result = {
        "travel": reformat_summary(*load_summary(bucket, raw, "travel")),
        "activity": reformat_summary(*load_summary(bucket, raw, "activity")),
        "dest": reformat_summary(*load_summary(bucket, raw, "dest")),
        "mode": reformat_summary(*load_summary(bucket, raw, "mode")),
    }

    print("Model result:")
    print(jsonlib.dumps(event))

    return {
        "statusCode": 200,
        "headers": None,
        "body": jsonlib.dumps(result),
        "isBase64Encoded": True,
    }


def load_summary(bucket: str, key: str, prefix: str | None = None):
    starttime = time.perf_counter()
    if prefix is not None:
        prefix = f"{prefix}-"

    df1 = pd.read_parquet(f"s3://{bucket}/{key}.{prefix}overview.parquet")
    df2 = pd.read_parquet(f"s3://{bucket}/{key}.{prefix}analysis.parquet")
    print(time.perf_counter() - starttime)

    return df1, df2


def reformat_summary(df1: pd.DataFrame, df2: pd.DataFrame) -> dict:
    df2.index.name = ""

    df1 = df1.reset_index()
    df2 = df2.reset_index()

    result = {}
    if not df1.empty:
        result = {
            0: {
                "cells": {j: column for j, column in enumerate(df1.columns)}
            }
        }

        for i, row in df1.iterrows():
            result[i + 1] = {
                "cells": {
                    j: value
                    for j, (idx, value) in enumerate(row.items())
                }
            }

        last_index = sorted(list(result.keys()))[-1] + 1
        result["len"] = len(df1) + 1
        result[last_index] = {}
    else:
        last_index = 0

    if not df2.empty:
        result["len"] += len(df2) + 1
        result[last_index + 1] = {
            "cells": {j: column for j, column in enumerate(df2.columns)}
        }

        for i, row in df2.iterrows():
            result[last_index + i + 2] = {
                "cells": {
                    j: value
                    for j, (idx, value) in enumerate(row.items())
                }
            }

    return result


if __name__ == "__main__":
    lambda_handler({}, {})

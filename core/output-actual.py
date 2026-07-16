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
    # raw = urllib.parse.unquote_plus("5665646f-3b59-4b83-b01f-f9c8376930fd%2Ftest3.csv")

    result = {
        "Travel Model": reformat_summary(*load_summary(bucket, raw, "travel")),
        "Travel Correlation": reformat_corr(load_corr(bucket, raw, "travel")),
        "Activity Model": reformat_summary(*load_summary(bucket, raw, "activity")),
        "Activity Correlation": reformat_corr(load_corr(bucket, raw, "activity")),
        "Destination Model": reformat_summary(*load_summary(bucket, raw, "dest")),
        "Destination Correlation": reformat_corr(load_corr(bucket, raw, "dest")),
        "Mode Model": reformat_summary(*load_summary(bucket, raw, "mode")),
        "Mode Correlation": reformat_corr(load_corr(bucket, raw, "mode")),
    }

    print("Model output result:")
    print(jsonlib.dumps(result))

    return {
        "statusCode": 200,
        "headers": None,
        "body": jsonlib.dumps(result),
        "isBase64Encoded": True,
    }


def load_summary(bucket: str, key: str, prefix: str | None = None):
    if prefix is not None:
        prefix = f"{prefix}-"

    retry_count = 0
    starttime = time.perf_counter()
    while True:
        try:
            df1 = pd.read_parquet(f"s3://{bucket}/{key}.{prefix}overview.parquet")
            break
        except Exception:
            if retry_count < 10:
                print("Model output overview file not found, retrying ...")
                retry_count += 1
                time.sleep(2)
            else:
                raise error
    print(time.perf_counter() - starttime)

    retry_count = 0
    starttime = time.perf_counter()
    while True:
        try:
            df2 = pd.read_parquet(f"s3://{bucket}/{key}.{prefix}analysis.parquet")
            break
        except Exception:
            if retry_count < 10:
                print("Model output analysis file not found, retrying ...")
                retry_count += 1
                time.sleep(2)
            else:
                raise error
    print(time.perf_counter() - starttime)

    return df1, df2


def load_corr(bucket: str, key: str, prefix: str | None = None):
    if prefix is not None:
        prefix = f"{prefix}-"

    retry_count = 0
    starttime = time.perf_counter()
    while True:
        try:
            df = pd.read_parquet(f"s3://{bucket}/{key}.{prefix}correlation.parquet")
            break
        except Exception:
            if retry_count < 10:
                print("Correlation Matrix file not found, retrying ...")
                retry_count += 1
                time.sleep(2)
            else:
                raise error
    print(time.perf_counter() - starttime)

    return df


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
        result["len"] = 0
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

    result["len"] += 1
    return result


def reformat_corr(df: pd.DataFrame) -> dict:
    df.index.name = ""
    df = df.reset_index()

    result = {}
    if not df.empty:
        result = {
            0: {
                "cells": {j: column for j, column in enumerate(df.columns)}
            }
        }

        for i, row in df.iterrows():
            result[i + 1] = {
                "cells": {
                    j: value
                    for j, (idx, value) in enumerate(row.items())
                }
            }

        result["len"] = len(df) + 1
    else:
        result["len"] = 0

    return result


if __name__ == "__main__":
    lambda_handler({}, {})

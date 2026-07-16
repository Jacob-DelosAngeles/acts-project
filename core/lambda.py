from __future__ import annotations

import io
import json as jsonlib
import os
import urllib.parse

import boto3
import numpy as np
import pandas as pd

import acts


s3 = boto3.client("s3")


def lambda_handler(event, context):
    print("Received event:")
    print(jsonlib.dumps(event))

    # Get the object from the event and process
    bucket = os.environ["ACTS_PROCESSED_INPUT_FILES_BUCKET"]
    raw = urllib.parse.unquote_plus(
        event["pathParameters"]["filename"],
        encoding="utf-8"
    )
    key = f"{raw}.parquet"

    # ### TEST
    # bucket = "acts-processed-input-files"
    # raw = urllib.parse.unquote_plus("91f42152-366d-46e5-a25d-2f57b5aa3ab4%2Ftest.csv")
    # key = f"{raw}.parquet"

    object = s3.get_object(Bucket=bucket, Key=key)
    byteio = io.BytesIO(object["Body"].read())
    df = pd.read_parquet(byteio, engine="pyarrow")

    # df = pd.read_csv('base input.csv')

    travel_mlogit, travel_correlation = acts.model.TravelDecisionMLogit(df, output_correlation=True)
    activity_mlogit, activity_correlation = acts.model.ActivityChoiceMLogit(df, output_correlation=True)
    dest_mlogit, dest_correlation = acts.model.DestinationChoiceMLogit(df, output_correlation=True)
    mode_mlogit, mode_correlation = acts.model.ModeChoiceMLogit(df, output_correlation=True)

    bucket = os.environ["ACTS_OUTPUT_FILES_BUCKET"]
    # bucket = "acts-output-files"

    save_summary(travel_mlogit, travel_correlation, bucket, raw, prefix="travel")
    save_summary(activity_mlogit, activity_correlation, bucket, raw, prefix="activity")
    save_summary(dest_mlogit, dest_correlation, bucket, raw, prefix="dest")
    save_summary(mode_mlogit, mode_correlation, bucket, raw, prefix="mode")

    return {
        "statusCode": 200,
        "headers": None,
        "body": jsonlib.dumps({}),
        "isBase64Encoded": True,
    }


def save_summary(mlogit, correlation, bucket: str, key: str, prefix: str | None = None):
    if prefix is not None:
        prefix = f"{prefix}-"


    # print(mlogit)
    summary = mlogit.summary()
    # print(summary)
    if summary is None:
        df1 = pd.DataFrame()
        df2 = pd.DataFrame()
        correlation = pd.DataFrame()
    else:
        df1 = pd.read_html(summary.tables[0].as_html(), header=0, index_col=0)[0]
        df2 = pd.read_html(summary.tables[1].as_html(), header=0, index_col=0)[0]

    # print(df1)
    # print(df2)
    df1.to_parquet(f"s3://{bucket}/{key}.{prefix}overview.parquet")
    df2.to_parquet(f"s3://{bucket}/{key}.{prefix}analysis.parquet")

    correlation.to_parquet(f"s3://{bucket}/{key}.{prefix}correlation.parquet")


if __name__ == "__main__":
    lambda_handler({}, {})

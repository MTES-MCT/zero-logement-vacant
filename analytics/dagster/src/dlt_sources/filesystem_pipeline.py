# flake8: noqa
import os
from typing import Iterator

import dlt
from dlt.sources import TDataItems
from dlt.sources.filesystem import FileItemDict, filesystem, readers, read_csv


# where the test files are, those examples work with (url)
TESTS_BUCKET_URL = "https://cellar-c2.services.clever-cloud.com/zlv-production/"


def read_ff_csv_with_duckdb() -> None:
    pipeline = dlt.pipeline(
        pipeline_name="standard_filesystem",
        destination="filesystem",
        dataset_name="lake",
    )

    # load all the CSV data, excluding headers
    met_files = readers(
        bucket_url=TESTS_BUCKET_URL, file_glob="ff/*/raw.csv"
    ).read_csv_duckdb(chunk_size=1000, header=True)

    load_info = pipeline.run(met_files)

    print(load_info)
    print(pipeline.last_trace.last_normalize_info)


if __name__ == "__main__":
    read_ff_csv_with_duckdb()

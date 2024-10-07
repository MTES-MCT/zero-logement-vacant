import os
import posixpath
from typing import Iterator

import dlt
from dlt.sources import TDataItems

try:
    from .filesystem import FileItemDict, filesystem, readers, read_csv  # type: ignore
except ImportError:
    from filesystem import (
        FileItemDict,
        filesystem,
        readers,
        read_csv,
    )


TESTS_BUCKET_URL = posixpath.abspath("../tests/filesystem/samples/")


def read_csv_with_duckdb() -> None:
    pipeline = dlt.pipeline(
        pipeline_name="standard_filesystem",
        destination='duckdb',
        dataset_name="met_data_duckdb",
    )

    # load all the CSV data, excluding headers
    met_files = readers(
        bucket_url=TESTS_BUCKET_URL, file_glob="met_csv/A801/*.csv"
    ).read_csv_duckdb(chunk_size=1000, header=True)

    load_info = pipeline.run(met_files)

    print(load_info)
    print(pipeline.last_trace.last_normalize_info)


if __name__ == "__main__":
    read_csv_with_duckdb()
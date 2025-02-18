from setuptools import find_packages, setup

setup(
    name="zlv_dbt",
    version="0.0.1",
    packages=find_packages(),
    install_requires=[
        "dagster",
        "dagster-cloud",
        "dagster-dbt",
    ],
    extras_require={
        "dev": [
            "dagster-webserver",
        ]
    },
)

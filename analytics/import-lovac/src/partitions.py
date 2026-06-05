from dagster import StaticPartitionsDefinition

# Metropolitan + overseas departments
DEPARTMENT_CODES = [
    *(f"{i:02d}" for i in range(1, 96) if i != 20),  # 01-95 (no 20, split into 2A/2B)
    "2A",
    "2B",
    "971",
    "972",
    "973",
    "974",
    "976",
]

departments_partitions = StaticPartitionsDefinition(DEPARTMENT_CODES)

from pydantic import BaseModel
from typing import List, Dict, Any


class DataCleanerResponse(BaseModel):
    message: str
    original_rows: int
    cleaned_rows: int
    duplicates_removed: int
    missing_values_filled: int

    total_columns: int
    column_names: List[str]
    data_types: Dict[str, str]

    missing_value_report: Dict[str, int]

    statistics: Dict[str, Any]

    filename: str

    preview: List[Dict[str, Any]]
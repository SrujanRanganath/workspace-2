import os
import pandas as pd
from utils.file_security import resolve_contained_path, validate_output_filename


OUTPUT_FOLDER = "cleaned_files"

os.makedirs(
    OUTPUT_FOLDER,
    exist_ok=True
)


MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB maximum upload size


def clean_data(file):
    """
    Clean uploaded CSV or Excel file with strict file size and containment checks.
    """
    import io
    validate_output_filename(file.filename)

    # Read bounded content with size enforcement
    chunk_size = 64 * 1024
    total_bytes = bytearray()
    while True:
        chunk = file.file.read(chunk_size)
        if not chunk:
            break
        total_bytes.extend(chunk)
        if len(total_bytes) > MAX_UPLOAD_SIZE:
            raise ValueError("File size exceeds maximum permitted limit of 10MB.")

    if not total_bytes:
        raise ValueError("Uploaded file is empty.")

    file_bytes_stream = io.BytesIO(total_bytes)

    try:
        if file.filename.lower().endswith(".csv"):
            df = pd.read_csv(file_bytes_stream)
            extension = ".csv"
        elif file.filename.lower().endswith(".xlsx"):
            df = pd.read_excel(file_bytes_stream)
            extension = ".xlsx"
        else:
            raise ValueError("Only CSV and Excel files are supported.")
    except ValueError as ve:
        raise ve
    except Exception as exc:
        raise ValueError(f"Unable to read uploaded file: {str(exc)}")

    # Strip whitespace from column names
    df.columns = df.columns.astype(str).str.strip()

    # Remove empty columns
    df = df.loc[
        :,
        ~df.columns.str.contains(
            r"^Unnamed",
            case=False
        )
    ]
    df = df.dropna(how="all", axis=1)

    original_rows = len(df)

    duplicates_removed = int(
        df.duplicated().sum()
    )

    df = df.drop_duplicates()

    # Missing Value Report
    missing_value_report = {
        column.strip().lower().replace(" ", "_"): int(count)
        for column, count in df.isnull().sum().items()
    }

    missing_values_filled = sum(
        missing_value_report.values()
    )

    df = df.fillna("N/A")

    # Clean column names
    df.columns = [
        column.strip().lower().replace(" ", "_")
        for column in df.columns
    ]

    cleaned_rows = len(df)

    total_columns = len(df.columns)

    column_names = list(df.columns)

    data_types = {
        column: str(dtype)
        for column, dtype in df.dtypes.items()
    }

    # Statistics
    statistics = {}

    numeric_columns = df.select_dtypes(
        include=["number"]
    )

    for column in numeric_columns.columns:

        statistics[column] = {
            "mean": round(float(df[column].mean()), 2),
            "median": round(float(df[column].median()), 2),
            "min": float(df[column].min()),
            "max": float(df[column].max()),
            "std": round(float(df[column].std()), 2)
        }

    preview = df.head(5).to_dict(
        orient="records"
    )

    filename = (
        os.path.splitext(file.filename)[0]
        + "_cleaned"
        + extension
    )

    filepath = resolve_contained_path(OUTPUT_FOLDER, filename)

    if extension == ".csv":
        df.to_csv(
            str(filepath),
            index=False
        )

    else:
        df.to_excel(
            str(filepath),
            index=False
        )

    return {
        "message": "Data cleaned successfully.",
        "original_rows": original_rows,
        "cleaned_rows": cleaned_rows,
        "duplicates_removed": duplicates_removed,
        "missing_values_filled": missing_values_filled,
        "total_columns": total_columns,
        "column_names": column_names,
        "data_types": data_types,
        "missing_value_report": missing_value_report,
        "statistics": statistics,
        "filename": filename,
        "preview": preview
    }

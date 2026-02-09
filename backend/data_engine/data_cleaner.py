"""
Data Cleaner block - handles missing values, outliers, and data quality issues.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from utils.logger import logger


def execute_data_cleaner_block(block, context) -> Dict[str, Any]:
    """
    Execute data cleaning operations on the dataset.

    Supported strategies for missing values:
    - drop_rows: Remove rows with any missing values
    - drop_cols: Remove columns with missing values above threshold
    - impute_mean: Fill numeric missing values with column mean
    - impute_median: Fill numeric missing values with column median
    - impute_mode: Fill missing values with most frequent value
    - impute_constant: Fill missing values with a constant
    - forward_fill: Forward fill (for time series)
    - backward_fill: Backward fill (for time series)
    """

    df = context.get("df")
    if df is None:
        raise ValueError("No dataset found. Add a Dataset block first.")

    # Get cleaning parameters
    params = block.params or {}
    strategy = params.get("strategy", "impute_median")
    missing_threshold = params.get("missing_threshold", 0.5)  # For drop_cols
    constant_value = params.get("constant_value", 0)
    columns_to_clean = params.get("columns", None)  # None means all columns
    handle_outliers = params.get("handle_outliers", False)
    outlier_method = params.get("outlier_method", "iqr")  # iqr or zscore
    outlier_threshold = params.get("outlier_threshold", 1.5)  # IQR multiplier or z-score

    original_shape = df.shape
    original_missing = df.isnull().sum().sum()

    logger.info(f"Data Cleaning: strategy={strategy}, original shape={original_shape}")
    logger.info(f"Missing values before cleaning: {original_missing}")

    # Track cleaning stats
    cleaning_stats = {
        "original_rows": original_shape[0],
        "original_cols": original_shape[1],
        "original_missing": int(original_missing),
        "strategy": strategy,
        "actions_taken": []
    }

    # Determine which columns to clean
    if columns_to_clean:
        cols_to_process = [c for c in columns_to_clean if c in df.columns]
    else:
        cols_to_process = df.columns.tolist()

    # Get numeric and categorical columns
    numeric_cols = df[cols_to_process].select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df[cols_to_process].select_dtypes(exclude=[np.number]).columns.tolist()

    # Apply cleaning strategy
    if strategy == "drop_rows":
        rows_before = len(df)
        df = df.dropna(subset=cols_to_process)
        rows_dropped = rows_before - len(df)
        cleaning_stats["actions_taken"].append(f"Dropped {rows_dropped} rows with missing values")
        logger.info(f"Dropped {rows_dropped} rows with missing values")

    elif strategy == "drop_cols":
        cols_before = len(df.columns)
        # Calculate missing ratio for each column
        missing_ratio = df[cols_to_process].isnull().sum() / len(df)
        cols_to_drop = missing_ratio[missing_ratio > missing_threshold].index.tolist()
        if cols_to_drop:
            df = df.drop(columns=cols_to_drop)
            cleaning_stats["actions_taken"].append(
                f"Dropped {len(cols_to_drop)} columns with >{missing_threshold*100:.0f}% missing: {cols_to_drop}"
            )
            logger.info(f"Dropped columns: {cols_to_drop}")

    elif strategy == "impute_mean":
        for col in numeric_cols:
            if df[col].isnull().any():
                mean_val = df[col].mean()
                df[col] = df[col].fillna(mean_val)
                cleaning_stats["actions_taken"].append(f"Filled {col} with mean={mean_val:.4f}")
        # For categorical, use mode
        for col in categorical_cols:
            if df[col].isnull().any():
                mode_val = df[col].mode()[0] if len(df[col].mode()) > 0 else "Unknown"
                df[col] = df[col].fillna(mode_val)
                cleaning_stats["actions_taken"].append(f"Filled {col} with mode={mode_val}")
        logger.info(f"Imputed missing values with mean (numeric) and mode (categorical)")

    elif strategy == "impute_median":
        for col in numeric_cols:
            if df[col].isnull().any():
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val)
                cleaning_stats["actions_taken"].append(f"Filled {col} with median={median_val:.4f}")
        # For categorical, use mode
        for col in categorical_cols:
            if df[col].isnull().any():
                mode_val = df[col].mode()[0] if len(df[col].mode()) > 0 else "Unknown"
                df[col] = df[col].fillna(mode_val)
                cleaning_stats["actions_taken"].append(f"Filled {col} with mode={mode_val}")
        logger.info(f"Imputed missing values with median (numeric) and mode (categorical)")

    elif strategy == "impute_mode":
        for col in cols_to_process:
            if df[col].isnull().any():
                mode_val = df[col].mode()[0] if len(df[col].mode()) > 0 else (0 if col in numeric_cols else "Unknown")
                df[col] = df[col].fillna(mode_val)
                cleaning_stats["actions_taken"].append(f"Filled {col} with mode={mode_val}")
        logger.info(f"Imputed missing values with mode")

    elif strategy == "impute_constant":
        for col in cols_to_process:
            if df[col].isnull().any():
                df[col] = df[col].fillna(constant_value)
        cleaning_stats["actions_taken"].append(f"Filled all missing values with constant={constant_value}")
        logger.info(f"Imputed missing values with constant: {constant_value}")

    elif strategy == "forward_fill":
        df[cols_to_process] = df[cols_to_process].ffill()
        cleaning_stats["actions_taken"].append("Applied forward fill")
        logger.info("Applied forward fill for missing values")

    elif strategy == "backward_fill":
        df[cols_to_process] = df[cols_to_process].bfill()
        cleaning_stats["actions_taken"].append("Applied backward fill")
        logger.info("Applied backward fill for missing values")

    # Handle outliers if requested
    if handle_outliers and numeric_cols:
        outliers_removed = 0

        if outlier_method == "iqr":
            for col in numeric_cols:
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - outlier_threshold * IQR
                upper_bound = Q3 + outlier_threshold * IQR

                outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
                outliers_in_col = outlier_mask.sum()
                if outliers_in_col > 0:
                    # Cap outliers instead of removing
                    df.loc[df[col] < lower_bound, col] = lower_bound
                    df.loc[df[col] > upper_bound, col] = upper_bound
                    outliers_removed += outliers_in_col

        elif outlier_method == "zscore":
            for col in numeric_cols:
                z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
                outlier_mask = z_scores > outlier_threshold
                outliers_in_col = outlier_mask.sum()
                if outliers_in_col > 0:
                    # Cap outliers at threshold
                    mean_val = df[col].mean()
                    std_val = df[col].std()
                    lower_bound = mean_val - outlier_threshold * std_val
                    upper_bound = mean_val + outlier_threshold * std_val
                    df.loc[df[col] < lower_bound, col] = lower_bound
                    df.loc[df[col] > upper_bound, col] = upper_bound
                    outliers_removed += outliers_in_col

        if outliers_removed > 0:
            cleaning_stats["actions_taken"].append(
                f"Capped {outliers_removed} outliers using {outlier_method} method"
            )
            logger.info(f"Capped {outliers_removed} outliers using {outlier_method}")

    # Calculate final stats
    final_missing = df.isnull().sum().sum()
    cleaning_stats["final_rows"] = len(df)
    cleaning_stats["final_cols"] = len(df.columns)
    cleaning_stats["final_missing"] = int(final_missing)
    cleaning_stats["missing_removed"] = int(original_missing - final_missing)

    logger.info(f"Data Cleaning complete: {original_shape} -> {df.shape}")
    logger.info(f"Missing values after cleaning: {final_missing}")

    # Update context
    context["df"] = df
    context["cleaning_stats"] = cleaning_stats
    context["data_cleaned"] = True

    return context


def analyze_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyze data quality and return recommendations for cleaning.
    Called by EDA or when dataset is loaded.
    """
    analysis = {
        "total_rows": len(df),
        "total_cols": len(df.columns),
        "missing_summary": {},
        "column_types": {},
        "recommendations": []
    }

    # Missing value analysis
    for col in df.columns:
        missing_count = df[col].isnull().sum()
        missing_pct = (missing_count / len(df)) * 100

        if missing_count > 0:
            analysis["missing_summary"][col] = {
                "count": int(missing_count),
                "percentage": round(missing_pct, 2)
            }

    # Column type analysis
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()

    analysis["column_types"] = {
        "numeric": numeric_cols,
        "categorical": categorical_cols,
        "total_numeric": len(numeric_cols),
        "total_categorical": len(categorical_cols)
    }

    # Generate recommendations
    total_missing = df.isnull().sum().sum()
    if total_missing > 0:
        missing_pct = (total_missing / (len(df) * len(df.columns))) * 100

        if missing_pct < 5:
            analysis["recommendations"].append({
                "issue": "Low missing data",
                "suggestion": "Use median imputation for numeric columns",
                "strategy": "impute_median"
            })
        elif missing_pct < 20:
            analysis["recommendations"].append({
                "issue": "Moderate missing data",
                "suggestion": "Consider dropping rows with missing values or use imputation",
                "strategy": "impute_median"
            })
        else:
            analysis["recommendations"].append({
                "issue": "High missing data",
                "suggestion": "Drop columns with >50% missing, then impute remaining",
                "strategy": "drop_cols"
            })

        # Check for columns with very high missing
        for col, info in analysis["missing_summary"].items():
            if info["percentage"] > 50:
                analysis["recommendations"].append({
                    "issue": f"Column '{col}' has {info['percentage']:.1f}% missing",
                    "suggestion": f"Consider dropping column '{col}'",
                    "strategy": "drop_cols"
                })

    # Outlier detection hint for numeric columns
    if numeric_cols:
        for col in numeric_cols[:5]:  # Check first 5 numeric columns
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            outliers = ((df[col] < Q1 - 1.5 * IQR) | (df[col] > Q3 + 1.5 * IQR)).sum()
            if outliers > len(df) * 0.05:  # More than 5% outliers
                analysis["recommendations"].append({
                    "issue": f"Column '{col}' has {outliers} potential outliers",
                    "suggestion": "Consider enabling outlier handling",
                    "strategy": "handle_outliers"
                })

    return analysis

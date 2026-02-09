"""
Merge Dataset block executor.
Combines multiple datasets into a single dataset.
"""
import pandas as pd
from utils.logger import logger


def execute_merge_block(block, context):
    """Merge multiple datasets based on strategy."""
    strategy = block.params.get("strategy", "concat")
    join_key = block.params.get("join_key", None)

    datasets = context.get("datasets", {})

    # Determine which datasets to merge based on inputs
    input_ids = block.inputs if hasattr(block, "inputs") else []
    if not input_ids:
        raise ValueError(
            "Merge block must be connected to at least one dataset block"
        )

    # Collect dataframes from connected dataset blocks
    dfs_to_merge = []
    targets = []
    for input_id in input_ids:
        if input_id in datasets:
            dfs_to_merge.append(datasets[input_id]["df"])
            targets.append(datasets[input_id]["target"])
        else:
            logger.warning(f"Merge block: input '{input_id}' not found in datasets dict")

    if len(dfs_to_merge) < 2:
        raise ValueError(
            f"Merge block requires at least 2 connected datasets, found {len(dfs_to_merge)}. "
            f"Connect multiple Dataset blocks to this Merge block."
        )

    # Validate that all datasets use the same target column name
    unique_targets = set(targets)
    if len(unique_targets) > 1:
        raise ValueError(
            f"All datasets must use the same target column. Found: {unique_targets}"
        )

    target = targets[0]

    if strategy == "concat":
        # Vertical concatenation (stack rows)
        col_sets = [set(df.columns) for df in dfs_to_merge]
        all_same = len(set(frozenset(s) for s in col_sets)) == 1

        if not all_same:
            # Find common columns
            common_cols = col_sets[0]
            for cs in col_sets[1:]:
                common_cols = common_cols & cs

            if target not in common_cols:
                raise ValueError(
                    f"Target column '{target}' not present in all datasets"
                )

            logger.warning(
                f"Datasets have different columns. Using intersection of "
                f"{len(common_cols)} common columns."
            )
            dfs_to_merge = [df[list(common_cols)] for df in dfs_to_merge]

        merged_df = pd.concat(dfs_to_merge, ignore_index=True)
        logger.info(
            f"Concatenated {len(dfs_to_merge)} datasets: "
            f"{merged_df.shape[0]} total rows, {merged_df.shape[1]} columns"
        )

    elif strategy == "join":
        if not join_key:
            raise ValueError(
                "Join strategy requires a 'join_key' column parameter"
            )

        merged_df = dfs_to_merge[0]
        for i, df in enumerate(dfs_to_merge[1:], start=1):
            merged_df = pd.merge(
                merged_df, df,
                on=join_key,
                how="inner",
                suffixes=("", f"_{i}")
            )

        logger.info(
            f"Joined {len(dfs_to_merge)} datasets on '{join_key}': "
            f"{merged_df.shape[0]} rows, {merged_df.shape[1]} columns"
        )

    else:
        raise ValueError(
            f"Unknown merge strategy: '{strategy}'. Use 'concat' or 'join'."
        )

    # Set the merged result into context
    X = merged_df.drop(columns=[target])
    y = merged_df[target]

    context["df"] = merged_df
    context["X"] = X
    context["y"] = y
    context["target"] = target
    context["feature_names"] = X.columns.tolist()
    context["target_name"] = target

    logger.info(f"Merge complete: {X.shape[0]} rows, {X.shape[1]} features")

    return context

"""
Custom Block Manager -- CRUD operations for user-defined pipeline blocks.
Stores block definitions as JSON for persistence across sessions.
"""
import json
import os
import uuid
from datetime import datetime
from utils.logger import logger

BLOCKS_FILE = os.path.join(os.path.dirname(__file__), "custom_blocks.json")


class CustomBlockManager:
    """Manages custom block definitions stored in a JSON file."""

    def __init__(self):
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(BLOCKS_FILE):
            with open(BLOCKS_FILE, "w") as f:
                json.dump([], f)

    def load_blocks(self):
        """Return all saved custom block definitions."""
        try:
            with open(BLOCKS_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def save_block(self, block_def: dict) -> dict:
        """Save a new custom block definition. Returns the saved block with id."""
        blocks = self.load_blocks()

        block_def["id"] = str(uuid.uuid4())[:8]
        block_def["created_at"] = datetime.now().isoformat()

        # Ensure type_key is snake_case and unique
        type_key = block_def.get("type_key", block_def.get("name", "custom"))
        type_key = type_key.lower().replace(" ", "_").replace("-", "_")
        # Avoid collisions with built-in types
        builtin = {"dataset", "dataset_merge", "split", "feature_pipeline",
                    "model", "voting_ensemble", "trainer", "metrics"}
        if type_key in builtin:
            type_key = f"custom_{type_key}"
        # Avoid collisions with existing custom blocks
        existing_keys = {b["type_key"] for b in blocks}
        base_key = type_key
        counter = 2
        while type_key in existing_keys:
            type_key = f"{base_key}_{counter}"
            counter += 1

        block_def["type_key"] = type_key

        blocks.append(block_def)
        self._write(blocks)
        logger.info(f"Saved custom block: {block_def['name']} ({type_key})")
        return block_def

    def delete_block(self, block_id: str) -> bool:
        """Delete a custom block by id. Returns True if deleted."""
        blocks = self.load_blocks()
        filtered = [b for b in blocks if b["id"] != block_id]
        if len(filtered) == len(blocks):
            return False
        self._write(filtered)
        logger.info(f"Deleted custom block: {block_id}")
        return True

    def get_block(self, block_id: str) -> dict | None:
        """Look up a custom block by id."""
        for b in self.load_blocks():
            if b["id"] == block_id:
                return b
        return None

    def get_block_by_type(self, type_key: str) -> dict | None:
        """Look up a custom block by its type_key."""
        for b in self.load_blocks():
            if b["type_key"] == type_key:
                return b
        return None

    def _write(self, blocks: list):
        with open(BLOCKS_FILE, "w") as f:
            json.dump(blocks, f, indent=2)


# Singleton instance
manager = CustomBlockManager()

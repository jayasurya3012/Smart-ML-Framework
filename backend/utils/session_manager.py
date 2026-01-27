import json
import os
import uuid
from datetime import datetime
from typing import List, Optional
from schemas.session import Session, SessionData


class SessionManager:
    def __init__(self, storage_dir: str):
        self.storage_dir = storage_dir
        self.sessions_file = os.path.join(storage_dir, "sessions.json")
        os.makedirs(storage_dir, exist_ok=True)
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        if not os.path.exists(self.sessions_file):
            self._save_all([])

    def _load_all(self) -> List[dict]:
        try:
            with open(self.sessions_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _save_all(self, sessions: List[dict]):
        with open(self.sessions_file, "w") as f:
            json.dump(sessions, f, indent=2)

    def create(self, name: Optional[str], data: SessionData) -> Session:
        sessions = self._load_all()

        session_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()

        if not name:
            # Generate a default name
            session_count = len(sessions) + 1
            name = f"Pipeline {session_count}"

        session = Session(
            id=session_id,
            name=name,
            created_at=now,
            updated_at=now,
            data=data
        )

        sessions.append(session.model_dump())
        self._save_all(sessions)

        return session

    def get(self, session_id: str) -> Optional[Session]:
        sessions = self._load_all()
        for s in sessions:
            if s["id"] == session_id:
                return Session(**s)
        return None

    def get_all(self) -> List[Session]:
        sessions = self._load_all()
        return [Session(**s) for s in sessions]

    def update(self, session_id: str, name: Optional[str] = None, data: Optional[SessionData] = None) -> Optional[Session]:
        sessions = self._load_all()

        for i, s in enumerate(sessions):
            if s["id"] == session_id:
                if name is not None:
                    s["name"] = name
                if data is not None:
                    s["data"] = data.model_dump()
                s["updated_at"] = datetime.now().isoformat()
                sessions[i] = s
                self._save_all(sessions)
                return Session(**s)

        return None

    def delete(self, session_id: str) -> bool:
        sessions = self._load_all()
        original_len = len(sessions)
        sessions = [s for s in sessions if s["id"] != session_id]

        if len(sessions) < original_len:
            self._save_all(sessions)
            return True
        return False

    def get_latest(self) -> Optional[Session]:
        sessions = self._load_all()
        if not sessions:
            return None

        # Sort by updated_at descending
        sessions.sort(key=lambda s: s["updated_at"], reverse=True)
        return Session(**sessions[0])

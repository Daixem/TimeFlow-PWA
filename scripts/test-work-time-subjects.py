"""Isolated SQLite validation for migration 0005.

The harness uses only an in-memory database. It never connects to D1 and never
touches production or pre-production resources.
"""

from __future__ import annotations

import json
from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]
NOW = "2026-09-26T12:00:00.000Z"


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def script(db: sqlite3.Connection, name: str) -> None:
    db.executescript((ROOT / "drizzle" / name).read_text(encoding="utf-8"))


def work_state(start: str, revision: int, working: bool) -> str:
    return json.dumps(
        {
            "isWorking": working,
            "workStart": start,
            "workStartRevision": revision,
            "pauseAccumulatedMs": 0,
            "automaticPauseMinutes": 0,
        },
        separators=(",", ":"),
    )


def insert_legacy_current(db: sqlite3.Connection, user_id: str, start: str) -> None:
    db.execute(
        """INSERT INTO timeflow_work_time_current (
             user_id, state_json, revision, last_actor_user_id, last_event_type,
             last_source, effective_timestamp, server_updated_at, created_at
           ) VALUES (?, ?, 1, ?, 'CLOCK_IN', 'user_action', ?, ?, ?)""",
        (user_id, work_state(start, 1, True), user_id, start, start, start),
    )


def run() -> None:
    db = sqlite3.connect(":memory:", isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    script(db, "0001_timeflow_team_access.sql")
    script(db, "0003_timeflow_work_time_journal.sql")
    script(db, "0004_timeflow_work_time_sessions.sql")

    insert_legacy_current(db, "user-a", "2026-09-25T08:00:00.000Z")
    db.execute(
        """UPDATE timeflow_work_time_current
           SET state_json = ?, revision = 2, last_event_type = 'CLOCK_OUT',
               server_updated_at = ? WHERE user_id = 'user-a'""",
        (work_state("2026-09-25T08:00:00.000Z", 1, False), "2026-09-25T16:00:00.000Z"),
    )
    insert_legacy_current(db, "user-b", "2026-09-26T09:00:00.000Z")

    before = {
        "current": db.execute("SELECT count(*) FROM timeflow_work_time_current").fetchone()[0],
        "journal": db.execute("SELECT count(*) FROM timeflow_work_time_journal").fetchone()[0],
        "sessions": db.execute("SELECT count(*) FROM timeflow_work_time_sessions").fetchone()[0],
    }
    check(before == {"current": 2, "journal": 3, "sessions": 1}, "legacy fixture invalid")

    script(db, "0005_timeflow_work_time_subjects.sql")

    after = {
        "current": db.execute("SELECT count(*) FROM timeflow_work_time_current").fetchone()[0],
        "journal": db.execute("SELECT count(*) FROM timeflow_work_time_journal").fetchone()[0],
        "sessions": db.execute("SELECT count(*) FROM timeflow_work_time_sessions").fetchone()[0],
    }
    check(after == before, "0005 changed work-time row counts")
    check(db.execute("SELECT count(*) FROM timeflow_organizations").fetchone()[0] == 0, "migration invented an organization")
    check(db.execute("SELECT count(*) FROM timeflow_work_time_subjects").fetchone()[0] == 2, "private subjects were not backfilled once")
    check(
        db.execute("SELECT count(*) FROM timeflow_work_time_subjects WHERE scope_type != 'private' OR organization_id IS NOT NULL").fetchone()[0] == 0,
        "legacy data was not classified as private",
    )
    check(
        db.execute("SELECT count(*) FROM timeflow_work_time_current WHERE subject_id IS NULL OR scope_type != 'private' OR organization_id IS NOT NULL").fetchone()[0] == 0,
        "current rows lost their private subject",
    )
    check(
        db.execute("SELECT count(*) FROM timeflow_work_time_journal WHERE subject_id IS NULL OR scope_type != 'private' OR organization_id IS NOT NULL").fetchone()[0] == 0,
        "journal rows lost their private subject",
    )
    check(
        db.execute("SELECT count(*) FROM timeflow_work_time_sessions WHERE subject_id IS NULL OR scope_type != 'private' OR organization_id IS NOT NULL").fetchone()[0] == 0,
        "session rows lost their private subject",
    )

    db.execute("INSERT INTO timeflow_organizations VALUES ('org-a', 'Org A', 'admin-a', ?)", (NOW,))
    db.execute("INSERT INTO timeflow_organizations VALUES ('org-b', 'Org B', 'admin-b', ?)", (NOW,))
    db.execute(
        """INSERT INTO timeflow_work_time_subjects (
             id, user_id, scope_type, organization_id, employment_started_at,
             employment_ended_at, private_deletion_requested_at, delete_after,
             created_at, updated_at
           ) VALUES ('subject-org-a', 'user-a', 'organization', 'org-a', ?, NULL, NULL, NULL, ?, ?)""",
        ("2026-01-01T00:00:00.000Z", NOW, NOW),
    )
    db.execute(
        """INSERT INTO timeflow_work_time_subjects (
             id, user_id, scope_type, organization_id, employment_started_at,
             employment_ended_at, private_deletion_requested_at, delete_after,
             created_at, updated_at
           ) VALUES ('subject-org-b', 'user-a', 'organization', 'org-b', ?, NULL, NULL, NULL, ?, ?)""",
        ("2026-02-01T00:00:00.000Z", NOW, NOW),
    )

    start = "2026-09-26T08:00:00.000Z"
    db.execute(
        """INSERT INTO timeflow_work_time_current (
             subject_id, user_id, scope_type, organization_id, state_json,
             revision, last_actor_user_id, last_event_type, last_source,
             effective_timestamp, server_updated_at, created_at
           ) VALUES ('subject-org-a', 'user-a', 'organization', 'org-a', ?, 1,
             'user-a', 'CLOCK_IN', 'user_action', ?, ?, ?)""",
        (work_state(start, 1, True), start, start, start),
    )
    event = db.execute(
        "SELECT * FROM timeflow_work_time_journal WHERE subject_id = 'subject-org-a'"
    ).fetchone()
    check(event and event["organization_id"] == "org-a" and event["user_id"] == "user-a", "team journal lost tenant identity")

    db.execute(
        """UPDATE timeflow_work_time_current
           SET state_json = ?, revision = 2, last_event_type = 'CLOCK_OUT',
               server_updated_at = ? WHERE subject_id = 'subject-org-a'""",
        (work_state(start, 1, False), "2026-09-26T16:00:00.000Z"),
    )
    session = db.execute(
        "SELECT * FROM timeflow_work_time_sessions WHERE subject_id = 'subject-org-a'"
    ).fetchone()
    check(
        session
        and session["organization_id"] == "org-a"
        and session["net_minutes"] in (479, 480),
        "team session lost tenant identity",
    )

    try:
        db.execute(
            """INSERT INTO timeflow_work_time_subjects (
                 id, user_id, scope_type, organization_id, employment_started_at,
                 created_at, updated_at
               ) VALUES ('duplicate-active', 'user-a', 'organization', 'org-a', ?, ?, ?)""",
            ("2026-03-01T00:00:00.000Z", NOW, NOW),
        )
        raise AssertionError("duplicate active organization subject was accepted")
    except sqlite3.IntegrityError:
        pass

    db.execute(
        "UPDATE timeflow_work_time_subjects SET employment_ended_at = ?, updated_at = ? WHERE id = 'subject-org-a'",
        ("2026-09-30T23:59:59.000Z", NOW),
    )
    db.execute(
        """INSERT INTO timeflow_work_time_subjects (
             id, user_id, scope_type, organization_id, employment_started_at,
             created_at, updated_at
           ) VALUES ('subject-org-a-return', 'user-a', 'organization', 'org-a', ?, ?, ?)""",
        ("2027-01-01T00:00:00.000Z", NOW, NOW),
    )

    try:
        db.execute(
            """INSERT INTO timeflow_work_time_current (
                 subject_id, user_id, scope_type, organization_id, state_json,
                 revision, last_actor_user_id, last_event_type, last_source,
                 effective_timestamp, server_updated_at, created_at
               ) VALUES ('subject-org-b', 'user-a', 'organization', 'org-a', ?, 1,
                 'user-a', 'CLOCK_IN', 'user_action', ?, ?, ?)""",
            (work_state(start, 1, True), start, start, start),
        )
        raise AssertionError("cross-tenant subject mismatch was accepted")
    except sqlite3.IntegrityError:
        pass

    journal_id = db.execute("SELECT id FROM timeflow_work_time_journal LIMIT 1").fetchone()[0]
    for statement in (
        "UPDATE timeflow_work_time_journal SET source = 'tampered' WHERE id = ?",
        "DELETE FROM timeflow_work_time_journal WHERE id = ?",
    ):
        try:
            db.execute(statement, (journal_id,))
            raise AssertionError("append-only journal mutation succeeded after 0005")
        except sqlite3.DatabaseError:
            pass

    print("Migration 0005 preserves existing rows as private: PASS")
    print("Migration 0005 creates no default organization: PASS")
    print("Private and organization subjects remain separate: PASS")
    print("One user can belong to separate organization scopes: PASS")
    print("Duplicate active employment is blocked: PASS")
    print("Return after employment end creates a new subject: PASS")
    print("Cross-tenant subject mismatch is blocked: PASS")
    print("Journal and sessions retain organization identity: PASS")
    print("Append-only journal remains protected: PASS")


if __name__ == "__main__":
    run()

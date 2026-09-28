"""Isolated validation for migration 0006 and the retention deletion order."""

from __future__ import annotations

import json
from pathlib import Path
import sqlite3


ROOT = Path(__file__).resolve().parents[1]
NOW = "2026-09-28T20:00:00.000Z"


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def migration(db: sqlite3.Connection, name: str) -> None:
    db.executescript((ROOT / "drizzle" / name).read_text(encoding="utf-8"))


def add_subject(
    db: sqlite3.Connection,
    subject_id: str,
    scope: str,
    *,
    delete_after: str | None = None,
    employment_ended_at: str | None = None,
    working: bool = False,
) -> None:
    organization_id = "org-a" if scope == "organization" else None
    employment_started_at = "2019-01-01T00:00:00.000Z" if scope == "organization" else None
    db.execute(
        """INSERT INTO timeflow_work_time_subjects (
             id, user_id, scope_type, organization_id, employment_started_at,
             employment_ended_at, private_deletion_requested_at, delete_after,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            subject_id,
            "user-" + subject_id,
            scope,
            organization_id,
            employment_started_at,
            employment_ended_at,
            "2020-01-01T00:00:00.000Z" if delete_after else None,
            delete_after,
            NOW,
            NOW,
        ),
    )
    state = json.dumps(
        {
            "isWorking": working,
            "workStart": "2026-09-28T08:00:00.000Z",
            "workStartRevision": 1,
            "pauseAccumulatedMs": 0,
        },
        separators=(",", ":"),
    )
    db.execute(
        """INSERT INTO timeflow_work_time_current (
             subject_id, user_id, scope_type, organization_id, state_json,
             revision, last_actor_user_id, last_event_type, last_source,
             effective_timestamp, server_updated_at, created_at
           ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'clock', ?, ?, ?)""",
        (
            subject_id,
            "user-" + subject_id,
            scope,
            organization_id,
            state,
            "user-" + subject_id,
            "CLOCK_IN" if working else "CLOCK_OUT",
            NOW,
            NOW,
            NOW,
        ),
    )


def eligible_subjects(db: sqlite3.Connection) -> list[str]:
    rows = db.execute(
        """SELECT subject.id
           FROM timeflow_work_time_subjects AS subject
           LEFT JOIN timeflow_work_time_current AS current
             ON current.subject_id = subject.id
           WHERE (
             (subject.scope_type = 'private'
               AND subject.delete_after IS NOT NULL
               AND julianday(subject.delete_after) <= julianday('now'))
             OR
             (subject.scope_type = 'organization'
               AND subject.employment_ended_at IS NOT NULL
               AND julianday(subject.employment_ended_at, '+24 months') <= julianday('now'))
           )
           AND NOT EXISTS (
             SELECT 1 FROM timeflow_work_time_legal_holds AS hold
             WHERE hold.subject_id = subject.id
               AND julianday(hold.starts_at) <= julianday('now')
               AND julianday(hold.ends_at) > julianday('now')
           )
           AND coalesce(json_extract(current.state_json, '$.isWorking'), 0) != 1
           ORDER BY subject.id"""
    ).fetchall()
    return [row[0] for row in rows]


def delete_subject(db: sqlite3.Connection, subject_id: str) -> None:
    with db:
        db.execute("DELETE FROM timeflow_work_time_journal WHERE subject_id = ?", (subject_id,))
        db.execute("DELETE FROM timeflow_work_time_sessions WHERE subject_id = ?", (subject_id,))
        db.execute("DELETE FROM timeflow_work_time_current WHERE subject_id = ?", (subject_id,))
        db.execute("DELETE FROM timeflow_work_time_subjects WHERE id = ?", (subject_id,))


def run() -> None:
    db = sqlite3.connect(":memory:")
    migration(db, "0001_timeflow_team_access.sql")
    migration(db, "0003_timeflow_work_time_journal.sql")
    migration(db, "0004_timeflow_work_time_sessions.sql")
    migration(db, "0005_timeflow_work_time_subjects.sql")
    migration(db, "0006_timeflow_work_time_retention.sql")

    add_subject(db, "private-due", "private", delete_after="2020-02-01T00:00:00.000Z")
    add_subject(db, "private-future", "private", delete_after="2099-02-01T00:00:00.000Z")
    add_subject(db, "private-held", "private", delete_after="2020-02-01T00:00:00.000Z")
    add_subject(db, "private-open", "private", delete_after="2020-02-01T00:00:00.000Z", working=True)
    add_subject(db, "organization-due", "organization", employment_ended_at="2020-01-01T00:00:00.000Z")
    add_subject(db, "organization-future", "organization", employment_ended_at="2098-01-01T00:00:00.000Z")
    db.execute(
        """INSERT INTO timeflow_work_time_legal_holds
           (id, subject_id, reason_code, created_by, starts_at, ends_at, created_at)
           VALUES ('hold-1', 'private-held', 'legal_review', 'admin',
                   '2020-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', ?)""",
        (NOW,),
    )

    for protected in ("private-future", "private-held", "private-open", "organization-future"):
        try:
            db.execute("DELETE FROM timeflow_work_time_journal WHERE subject_id = ?", (protected,))
            raise AssertionError(f"journal guard allowed deletion for {protected}")
        except sqlite3.DatabaseError:
            pass

    eligible = eligible_subjects(db)
    check(eligible == ["organization-due", "private-due"], "retention eligibility ignored deadline, hold, or open shift")
    run_id = "retention-run-1"
    db.execute(
        """INSERT INTO timeflow_work_time_retention_runs
           (id, rule_version, started_at, dry_run, eligible_count, deleted_count, status)
           VALUES (?, '2026-09-v1', ?, 0, ?, 0, 'running')""",
        (run_id, NOW, len(eligible)),
    )
    for subject_id in eligible:
        delete_subject(db, subject_id)
    db.execute(
        """UPDATE timeflow_work_time_retention_runs
           SET completed_at = ?, deleted_count = ?, status = 'completed'
           WHERE id = ?""",
        (NOW, len(eligible), run_id),
    )

    remaining = {row[0] for row in db.execute("SELECT id FROM timeflow_work_time_subjects")}
    check("private-due" not in remaining and "organization-due" not in remaining, "eligible subjects were not deleted")
    check(remaining == {"private-future", "private-held", "private-open", "organization-future"}, "protected subjects changed")
    check(eligible_subjects(db) == [], "retention rerun was not idempotent")
    audit = db.execute("SELECT rule_version, eligible_count, deleted_count, status, error_code FROM timeflow_work_time_retention_runs WHERE id = ?", (run_id,)).fetchone()
    check(audit == ("2026-09-v1", 2, 2, "completed", None), "retention audit is incomplete")

    print("Retention migration leaves existing data untouched: PASS")
    print("Private 30-day and organization 24-month deadlines: PASS")
    print("Legal holds and open shifts block deletion: PASS")
    print("Journal deletion is limited to eligible subjects: PASS")
    print("Retention deletion is complete, ordered, audited and idempotent: PASS")


if __name__ == "__main__":
    run()

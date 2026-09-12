"""Isolated SQLite validation for the proposed Phase-7 D1 work-time journal.

This is intentionally a schema/test harness only. It neither imports the
production D1 binding nor connects to any TimeFlow service. The SQL mirrors the
proposed current-state + trigger-written append-only journal design.
"""

from __future__ import annotations

import json
from pathlib import Path
import sqlite3
import sys
from dataclasses import dataclass


SERVER_TIME = "2026-09-10T12:00:00.000Z"
EVENT_TYPES = {
    "CLOCK_IN", "CLOCK_OUT", "PAUSE_START", "PAUSE_END", "TIME_CORRECTION",
    "ADMIN_CORRECTION", "MANUAL_ENTRY", "SYNC_IMPORT",
}


class CheckFailure(AssertionError):
    pass


def check(condition: bool, message: str) -> None:
    if not condition:
        raise CheckFailure(message)


def payload(label: str) -> str:
    return json.dumps({"state": label}, separators=(",", ":"))


def make_database() -> sqlite3.Connection:
    db = sqlite3.connect(":memory:", isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys = ON")
    migration = Path(__file__).resolve().parents[1] / "drizzle" / "0003_timeflow_work_time_journal.sql"
    db.executescript(migration.read_text(encoding="utf-8"))
    return db


@dataclass(frozen=True)
class Identity:
    user_id: str
    is_admin: bool = False


def current_row(db: sqlite3.Connection, user_id: str):
    return db.execute(
        "SELECT * FROM timeflow_work_time_current WHERE user_id = ?", (user_id,)
    ).fetchone()


def journal_rows(db: sqlite3.Connection, user_id: str):
    return db.execute(
        "SELECT * FROM timeflow_work_time_journal WHERE user_id = ? ORDER BY revision", (user_id,)
    ).fetchall()


def write_work_time(db: sqlite3.Connection, identity: Identity, request: dict) -> dict:
    """Models the later Worker handler's authorization and write boundary.

    actor_user_id, revision and server timestamps are intentionally derived here,
    never taken from request-controlled fields. The transaction is explicit so a
    failed trigger insert rolls back the current-state statement as well.
    """
    expected = request.get("expectedRevision")
    if isinstance(expected, bool) or not isinstance(expected, int) or expected < 0:
        return {"status": 400, "error": "invalid_expected_revision"}

    requested_target = request.get("userId")
    target_user_id = requested_target if identity.is_admin and isinstance(requested_target, str) else identity.user_id
    if isinstance(requested_target, str) and requested_target != identity.user_id and not identity.is_admin:
        return {"status": 403, "error": "forbidden"}

    event_type = request.get("eventType")
    if event_type not in EVENT_TYPES:
        return {"status": 400, "error": "invalid_event_type"}

    state = request.get("state")
    if not isinstance(state, str):
        return {"status": 400, "error": "invalid_state"}

    # Only the effective time is a user-supplied business value. The server time,
    # actor and source are set by the Worker policy, not the request body.
    effective = request.get("effectiveTimestamp")
    if effective is not None and not isinstance(effective, str):
        return {"status": 400, "error": "invalid_effective_timestamp"}
    source = "admin" if identity.is_admin and target_user_id != identity.user_id else "user_action"
    if request.get("testJournalFailure") is True:
        source = "test_journal_failure"  # harness-only trigger below

    try:
        db.execute("BEGIN IMMEDIATE")
        row = current_row(db, target_user_id)
        if row is None:
            if expected != 0:
                db.execute("ROLLBACK")
                return {"status": 409, "error": "work_time_conflict", "revision": 0}
            db.execute(
                """INSERT INTO timeflow_work_time_current
                   (user_id, state_json, revision, last_actor_user_id, last_event_type,
                    last_source, effective_timestamp, server_updated_at, created_at)
                   VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)""",
                (target_user_id, state, identity.user_id, event_type, source, effective, SERVER_TIME, SERVER_TIME),
            )
            db.execute("COMMIT")
            return {"status": 201, "revision": 1}

        # This is the resource-local optimistic concurrency condition. The rowcount
        # determines whether the atomic revision update won; no UPSERT fallback exists.
        result = db.execute(
            """UPDATE timeflow_work_time_current
               SET state_json = ?, revision = revision + 1, last_actor_user_id = ?,
                   last_event_type = ?, last_source = ?, effective_timestamp = ?,
                   server_updated_at = ?
               WHERE user_id = ? AND revision = ?""",
            (state, identity.user_id, event_type, source, effective, SERVER_TIME, target_user_id, expected),
        )
        if result.rowcount != 1:
            current = current_row(db, target_user_id)
            db.execute("ROLLBACK")
            return {
                "status": 409,
                "error": "work_time_conflict",
                "revision": current["revision"],
                "state": current["state_json"],
            }
        new_revision = expected + 1
        db.execute("COMMIT")
        return {"status": 200, "revision": new_revision}
    except sqlite3.DatabaseError as error:
        if db.in_transaction:
            db.execute("ROLLBACK")
        return {"status": 500, "error": "journal_write_failed", "detail": str(error)}


def install_journal_failure_trigger(db: sqlite3.Connection) -> None:
    db.execute("""
      CREATE TRIGGER test_only_fail_journal_insert
      BEFORE INSERT ON timeflow_work_time_journal
      WHEN NEW.source = 'test_journal_failure'
      BEGIN
        SELECT RAISE(ABORT, 'forced journal failure');
      END;
    """)


def run() -> None:
    db = make_database()
    user_a = Identity("user-a")
    user_b = Identity("user-b")
    admin = Identity("admin-a", is_admin=True)

    # Create 0 -> 1 / CLOCK_IN and actor + server-time manipulation resistance.
    result = write_work_time(db, user_a, {
        "expectedRevision": 0, "eventType": "CLOCK_IN", "state": payload("IN"),
        "actor_user_id": "admin-a", "server_timestamp": "2099-01-01T00:00:00.000Z",
    })
    check(result == {"status": 201, "revision": 1}, "CLOCK_IN create failed")
    first = journal_rows(db, "user-a")
    check(len(first) == 1 and first[0]["actor_user_id"] == "user-a", "client actor controlled journal")
    check(first[0]["server_timestamp"] == SERVER_TIME, "client controlled server timestamp")
    check(first[0]["event_type"] == "CLOCK_IN" and first[0]["previous_state_json"] is None, "CLOCK_IN journal invalid")

    # Update 1 -> 2 / CLOCK_OUT, exactly one event and previous state captured.
    result = write_work_time(db, user_a, {"expectedRevision": 1, "eventType": "CLOCK_OUT", "state": payload("OUT")})
    check(result == {"status": 200, "revision": 2}, "CLOCK_OUT update failed")
    rows = journal_rows(db, "user-a")
    check(len(rows) == 2 and rows[-1]["previous_state_json"] == payload("IN"), "CLOCK_OUT did not produce one correct event")

    # Own correction 2 -> 3.
    result = write_work_time(db, user_a, {"expectedRevision": 2, "eventType": "TIME_CORRECTION", "state": payload("OWN-CORRECTED")})
    check(result == {"status": 200, "revision": 3}, "own correction failed")
    check(journal_rows(db, "user-a")[-1]["actor_user_id"] == "user-a", "own correction actor invalid")

    # Unauthorized cross-user correction never reaches current or journal.
    before_b = len(journal_rows(db, "user-b"))
    result = write_work_time(db, user_a, {"userId": "user-b", "expectedRevision": 0, "eventType": "TIME_CORRECTION", "state": payload("ILLEGAL")})
    check(result["status"] == 403 and current_row(db, "user-b") is None and len(journal_rows(db, "user-b")) == before_b, "unauthorized cross-user correction wrote data")

    # Admin correction: target and actor are distinct and both server-derived.
    result = write_work_time(db, admin, {"userId": "user-b", "expectedRevision": 0, "eventType": "ADMIN_CORRECTION", "state": payload("ADMIN-CORRECTED"), "actor_user_id": "user-b"})
    check(result == {"status": 201, "revision": 1}, "admin correction failed")
    admin_event = journal_rows(db, "user-b")[0]
    check(admin_event["user_id"] == "user-b" and admin_event["actor_user_id"] == "admin-a", "admin actor/target binding invalid")

    # Stale + simulated parallel write: A wins, B sees 409, no second journal event.
    result_a = write_work_time(db, user_a, {"expectedRevision": 3, "eventType": "MANUAL_ENTRY", "state": payload("A-WINS")})
    count_after_a = len(journal_rows(db, "user-a"))
    result_b = write_work_time(db, user_a, {"expectedRevision": 3, "eventType": "MANUAL_ENTRY", "state": payload("B-LOSES")})
    after_parallel = current_row(db, "user-a")
    check(result_a == {"status": 200, "revision": 4}, "parallel winner failed")
    check(result_b["status"] == 409 and after_parallel["revision"] == 4 and after_parallel["state_json"] == payload("A-WINS"), "parallel stale write overwrote state")
    check(len(journal_rows(db, "user-a")) == count_after_a, "409 emitted journal event")

    # Legacy data may be imported once as a labeled snapshot, never synthesized events.
    result = write_work_time(db, user_a, {"expectedRevision": 4, "eventType": "SYNC_IMPORT", "state": payload("LEGACY-SNAPSHOT")})
    legacy_events = [row for row in journal_rows(db, "user-a") if row["event_type"] == "SYNC_IMPORT"]
    check(result == {"status": 200, "revision": 5} and len(legacy_events) == 1, "legacy import is not a single labeled event")

    # TimeFlow already has a manual pause toggle. Those user actions need explicit
    # PAUSE events later; the separate automatic-break calculation remains derived.
    result = write_work_time(db, user_a, {"expectedRevision": 5, "eventType": "PAUSE_START", "state": payload("MANUAL-PAUSE")})
    check(result == {"status": 200, "revision": 6}, "manual pause start failed")
    result = write_work_time(db, user_a, {"expectedRevision": 6, "eventType": "PAUSE_END", "state": payload("PAUSE-ENDED")})
    check(result == {"status": 200, "revision": 7}, "manual pause end failed")
    check([row["event_type"] for row in journal_rows(db, "user-a")[-2:]] == ["PAUSE_START", "PAUSE_END"], "manual pause events invalid")

    # Journal rows are database-protected, not merely hidden by an API route.
    journal_id = journal_rows(db, "user-a")[0]["id"]
    for statement in (
        "UPDATE timeflow_work_time_journal SET source = 'tampered' WHERE id = ?",
        "DELETE FROM timeflow_work_time_journal WHERE id = ?",
    ):
        try:
            db.execute(statement, (journal_id,))
            raise CheckFailure("append-only journal mutation unexpectedly succeeded")
        except sqlite3.DatabaseError:
            pass

    # Force an insert failure inside the current-state trigger. The failed update
    # must roll back as one SQL transaction, including the current-state revision.
    install_journal_failure_trigger(db)
    before_failure = current_row(db, "user-a")
    before_failure_events = len(journal_rows(db, "user-a"))
    result = write_work_time(db, user_a, {
        "expectedRevision": 7, "eventType": "MANUAL_ENTRY", "state": payload("MUST-NOT-PERSIST"),
        "testJournalFailure": True,
    })
    after_failure = current_row(db, "user-a")
    check(result["status"] == 500, "forced journal failure did not fail the write")
    check(after_failure["revision"] == before_failure["revision"] and after_failure["state_json"] == before_failure["state_json"], "journal failure left current state committed")
    check(len(journal_rows(db, "user-a")) == before_failure_events, "journal failure appended an event")

    print("Create Revision 0 -> 1: PASS")
    print("Update Revision 1 -> 2: PASS")
    print("Stale Revision: PASS")
    print("Parallel Write: PASS")
    print("CLOCK_IN: PASS")
    print("CLOCK_OUT: PASS")
    print("Own Correction: PASS")
    print("Admin Correction: PASS")
    print("Unauthorized Cross-User Correction: PASS")
    print("Actor Manipulation: PASS")
    print("Server Time Manipulation: PASS")
    print("Exactly One Journal Event per Successful Write: PASS")
    print("Journal Event on 409: NO")
    print("Journal UPDATE blocked: PASS")
    print("Journal DELETE blocked: PASS")
    print("Journal Failure Rolls Back Current State: PASS")
    print("Legacy Single SYNC_IMPORT: PASS")
    print("Manual PAUSE_START/PAUSE_END Events: PASS")


if __name__ == "__main__":
    try:
        run()
    except (CheckFailure, sqlite3.DatabaseError) as error:
        print(f"WORK_TIME_JOURNAL_TEST_FAIL: {error}", file=sys.stderr)
        sys.exit(1)

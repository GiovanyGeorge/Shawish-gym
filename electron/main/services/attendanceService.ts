import { queryAll, queryOne, runExecute, runStatement } from "../database/query";
import { withPersist } from "./store";

export type DailyAttendanceRow = {
  member_id: number;
  member_code: string;
  name: string;
  photo_path: string | null;
  phone: string;
  member_status: string;
  attendance_status: "present" | "absent" | "paused" | null;
  check_in_time: string | null;
};

export type MemberAttendanceRow = {
  attendance_date: string;
  status: "present" | "absent" | "paused";
  check_in_time: string | null;
};

export function listDailyAttendance(date: string, search?: string): DailyAttendanceRow[] {
  return withPersist((db) => {
    const params: (string | number)[] = [date];
    let searchClause = "";
    if (search?.trim()) {
      searchClause = `AND (m.name LIKE ? OR m.phone LIKE ? OR m.member_code LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    const rows = queryAll(
      db,
      `SELECT m.id AS member_id, m.member_code, m.name, m.photo_path, m.phone, m.status AS member_status,
              a.status AS attendance_status, a.check_in_time
       FROM members m
       LEFT JOIN attendance a ON a.member_id = m.id AND a.attendance_date = ?
       WHERE m.status IN ('active', 'paused') ${searchClause}
       ORDER BY m.name COLLATE NOCASE`,
      params,
    );

    return rows.map((row) => {
      let status = row.attendance_status as DailyAttendanceRow["attendance_status"];
      if (!status && String(row.member_status) === "paused") {
        status = "paused";
      }
      return {
        member_id: Number(row.member_id),
        member_code: String(row.member_code),
        name: String(row.name),
        photo_path: row.photo_path ? String(row.photo_path) : null,
        phone: String(row.phone),
        member_status: String(row.member_status),
        attendance_status: status,
        check_in_time: row.check_in_time ? String(row.check_in_time) : null,
      };
    });
  });
}

export function setAttendance(input: {
  member_id: number;
  attendance_date: string;
  status: "present" | "absent";
}): void {
  withPersist((db) => {
    const member = queryOne(db, `SELECT status FROM members WHERE id = ?`, [input.member_id]);
    if (!member) throw new Error("Member not found.");
    if (String(member.status) === "paused") {
      throw new Error("Member is paused. Resume the membership before marking attendance.");
    }

    const existing = queryOne(
      db,
      `SELECT id FROM attendance WHERE member_id = ? AND attendance_date = ?`,
      [input.member_id, input.attendance_date],
    );

    const checkIn =
      input.status === "present"
        ? new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
        : null;

    if (existing) {
      runExecute(
        db,
        `UPDATE attendance SET status = ?, check_in_time = ? WHERE id = ?`,
        [input.status, checkIn, existing.id],
      );
    } else {
      runStatement(
        db,
        `INSERT INTO attendance (member_id, attendance_date, status, check_in_time)
         VALUES (?, ?, ?, ?)`,
        [input.member_id, input.attendance_date, input.status, checkIn],
      );
    }
  });
}

export function listMemberAttendance(memberId: number, limit = 60): MemberAttendanceRow[] {
  return withPersist((db) =>
    queryAll(
      db,
      `SELECT attendance_date, status, check_in_time
       FROM attendance WHERE member_id = ?
       ORDER BY attendance_date DESC LIMIT ?`,
      [memberId, limit],
    ).map((row) => ({
      attendance_date: String(row.attendance_date),
      status: row.status as MemberAttendanceRow["status"],
      check_in_time: row.check_in_time ? String(row.check_in_time) : null,
    })),
  );
}

export function countTodayAttendance(date: string): { present: number; total: number } {
  return withPersist((db) => {
    const totalRow = queryOne(
      db,
      `SELECT COUNT(*) AS c FROM members WHERE status IN ('active', 'paused')`,
    );
    const presentRow = queryOne(
      db,
      `SELECT COUNT(*) AS c FROM attendance WHERE attendance_date = ? AND status = 'present'`,
      [date],
    );
    return {
      present: Number(presentRow?.c ?? 0),
      total: Number(totalRow?.c ?? 0),
    };
  });
}

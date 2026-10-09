-- Phase 2 audit: member program columns, program day description, member goal field

ALTER TABLE workout_program_days ADD COLUMN description TEXT;

ALTER TABLE members ADD COLUMN workout_program_id INTEGER REFERENCES workout_programs(id);
ALTER TABLE members ADD COLUMN workout_program_start_date TEXT;

UPDATE members
SET
  workout_program_id = (
    SELECT program_id FROM member_workout_programs
    WHERE member_workout_programs.member_id = members.id AND is_active = 1
    ORDER BY start_date DESC, id DESC LIMIT 1
  ),
  workout_program_start_date = (
    SELECT start_date FROM member_workout_programs
    WHERE member_workout_programs.member_id = members.id AND is_active = 1
    ORDER BY start_date DESC, id DESC LIMIT 1
  )
WHERE workout_program_id IS NULL;

ALTER TABLE member_goals ADD COLUMN goal TEXT;
UPDATE member_goals SET goal = title WHERE goal IS NULL OR goal = '';

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rawPath = path.join(__dirname, "free-exercise-db.raw.json");
const outPath = path.join(__dirname, "exercises.v1.json");

const SPORT_RE =
  /\b(football|soccer|basketball|tennis|swimming|baseball|softball|golf|hockey|volleyball|cricket|rugby|lacrosse)\b/i;

const MUSCLE = {
  abdominals: "Abs",
  hamstrings: "Hamstrings",
  adductors: "Other",
  quadriceps: "Quadriceps",
  biceps: "Biceps",
  shoulders: "Shoulders",
  chest: "Chest",
  "middle back": "Back",
  calves: "Calves",
  glutes: "Glutes",
  "lower back": "Back",
  lats: "Back",
  triceps: "Triceps",
  traps: "Back",
  forearms: "Forearms",
  neck: "Other",
  abductors: "Other",
};

const EQUIPMENT = {
  "body only": "Bodyweight",
  machine: "Machine",
  other: "Other",
  "foam roll": "Other",
  none: "Bodyweight",
  kettlebells: "Kettlebell",
  dumbbell: "Dumbbell",
  cable: "Cable",
  barbell: "Barbell",
  bands: "Resistance Band",
  "medicine ball": "Other",
  "exercise ball": "Other",
  "e-z curl bar": "EZ Bar",
};

const CATEGORY = {
  strength: "Strength",
  stretching: "Stretching",
  plyometrics: "Conditioning",
  strongman: "Strength",
  powerlifting: "Strength",
  cardio: "Cardio",
  "olympic weightlifting": "Strength",
};

const DIFFICULTY = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  expert: "Advanced",
};

function titleCaseName(name) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([A-Za-z][A-Za-z']*)\b/g, (word) => {
      if (/^(EZ|T-Bar|RDL)$/i.test(word)) return word.toUpperCase() === "EZ" ? "EZ" : word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

function normalizeKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapEquipment(raw, name) {
  const n = name.toLowerCase();
  if (/\bsmith\b/.test(n)) return "Smith Machine";
  if (/\btrap bar\b|\bhex bar\b/.test(n)) return "Trap Bar";
  if (/\bbench\b/.test(n) && (raw === "other" || !raw)) return "Bench";
  if (/\belliptical|treadmill|stair|bike|rowing\b/.test(n)) return "Cardio Machine";
  return EQUIPMENT[String(raw || "none").toLowerCase()] ?? "Other";
}

function mapMuscle(primary, category) {
  if (category === "cardio") return "Cardio";
  const key = String(primary || "").toLowerCase();
  return MUSCLE[key] ?? "Other";
}

function mapCategory(raw, muscle) {
  if (muscle === "Cardio") return "Cardio";
  return CATEGORY[String(raw || "strength").toLowerCase()] ?? "Strength";
}

const extras = [
  {
    id: "shawish:decline-barbell-bench-press",
    name: "Decline Barbell Bench Press",
    muscle_group: "Chest",
    secondary_muscles: "Shoulders, Triceps",
    equipment: "Barbell",
    category: "Strength",
    difficulty: "Intermediate",
    instructions:
      "Lie on a decline bench and unrack a barbell at chest level. Press the bar up until the arms are extended, then lower with control to the lower chest.",
  },
  {
    id: "shawish:bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    muscle_group: "Quadriceps",
    secondary_muscles: "Glutes, Hamstrings",
    equipment: "Dumbbell",
    category: "Strength",
    difficulty: "Intermediate",
    instructions:
      "Stand in a split stance with the rear foot elevated on a bench. Lower the front thigh to parallel, then drive through the front heel to stand.",
  },
  {
    id: "shawish:ab-wheel-rollout",
    name: "Ab Wheel Rollout",
    muscle_group: "Abs",
    secondary_muscles: "Core, Shoulders",
    equipment: "Other",
    category: "Strength",
    difficulty: "Advanced",
    instructions:
      "Kneel holding an ab wheel. Roll forward until the torso is nearly straight, keeping the core braced, then pull the wheel back to the start.",
  },
  {
    id: "shawish:stationary-bike",
    name: "Stationary Bike",
    muscle_group: "Cardio",
    secondary_muscles: "Quadriceps, Hamstrings, Calves",
    equipment: "Cardio Machine",
    category: "Cardio",
    difficulty: "Beginner",
    instructions: "Adjust the saddle height and pedal at a steady cadence. Increase resistance for a harder effort.",
  },
];

const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const seen = new Set();
let skippedSport = 0;
let skippedDup = 0;
const exercises = [];

for (const row of raw) {
  const name = String(row.name || "").trim();
  const id = String(row.id || "").trim();
  if (!name || !id) continue;
  if (SPORT_RE.test(name)) {
    skippedSport += 1;
    continue;
  }
  const key = normalizeKey(name);
  if (seen.has(key)) {
    skippedDup += 1;
    continue;
  }
  seen.add(key);
  const muscle = mapMuscle(row.primaryMuscles?.[0], row.category);
  const secondary = (row.secondaryMuscles || [])
    .map((m) => MUSCLE[String(m).toLowerCase()] ?? titleCaseName(String(m)))
    .filter((m, i, arr) => m && m !== muscle && arr.indexOf(m) === i)
    .join(", ");
  const instructions = Array.isArray(row.instructions)
    ? row.instructions.map((s) => String(s).trim()).filter(Boolean).join(" ")
    : null;

  exercises.push({
    id,
    name: titleCaseName(name),
    muscle_group: muscle,
    secondary_muscles: secondary || null,
    equipment: mapEquipment(row.equipment, name),
    category: mapCategory(row.category, muscle),
    difficulty: DIFFICULTY[String(row.level || "beginner").toLowerCase()] ?? "Beginner",
    instructions: instructions || null,
  });
}

for (const extra of extras) {
  const key = normalizeKey(extra.name);
  if (seen.has(key)) {
    skippedDup += 1;
    continue;
  }
  seen.add(key);
  exercises.push(extra);
}

exercises.sort((a, b) => a.name.localeCompare(b.name));

const payload = {
  version: 1,
  source: "free-exercise-db",
  license: "Unlicense",
  source_url: "https://github.com/yuhonas/free-exercise-db",
  imported: exercises.length,
  skipped_duplicates: skippedDup,
  skipped_sports: skippedSport,
  source_count: raw.length,
  exercises,
};

fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(
  JSON.stringify(
    {
      imported: exercises.length,
      skipped_duplicates: skippedDup,
      skipped_sports: skippedSport,
      source_count: raw.length,
      bytes: fs.statSync(outPath).size,
    },
    null,
    2,
  ),
);

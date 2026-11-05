// Edit workout names and variations here. Layout components contain no exercise lists.
export const ABS = ['Half Crunches', 'Toe Touch Crunches', 'Russian Twist', 'Kick Outs', 'Leg Raises', 'Flutter Kicks', 'Plank Hold', 'V-Up Hold', 'Side Plank Hold'];
export const CARDIO = "CARDIO DAY — Follow Trainer's Instructions";
export const OPTIONAL_CARDIO = 'OPTIONAL CARDIO — As Advised by Trainer';
export const foundation = [
  [
    ['Bodyweight Squats','Machine Flat Chest Press','Lat Pulldown','Leg Extension','Machine Shoulder Press','Triceps Pushdown','Standing Dumbbell Biceps Curl',ABS[0]],
    ['Bodyweight Squats','Machine Incline Chest Press','Seated Row','Leg Press','Dumbbell Lateral Raises','Hammer Curls','Rope Triceps Pushdown',ABS[6]],
    ['Bodyweight Squats','Pec Fly','Lat Pulldown','Leg Press','Machine Shoulder Press','Standing Biceps Curl','Triceps Pushdown',ABS[1]],
  ],
  [
    ['Bodyweight Squats','Dumbbell Flat Chest Press','Chest-Supported Row','Leg Extension','Dumbbell Shoulder Press','Preacher Curl','Rope Triceps Pushdown',ABS[2]],
    ['Dumbbell Wide Squats','Machine Incline Chest Press','Seated Row','Leg Press','Lateral Raises','Hammer Curls','Triceps Extension',ABS[4]],
    ['Bodyweight Squats','Machine Flat Chest Press','Lat Pulldown','Leg Press','Rear Delt Fly','Standing Biceps Curl','Triceps Pushdown',ABS[5]],
  ],
];
export const library = {
  'Chest': ['Flat Chest Press|Barbell / Dumbbell / Machine','Incline Chest Press|Barbell / Dumbbell / Machine','Decline Chest Press|Barbell / Dumbbell','Pec Fly','Incline Pec Fly','Cable Decline Fly'],
  'Back': ['Lat Pulldown','Chest-Supported Row','Seated Row','Assisted Pull-ups','Back Extensions'],
  'Quad-Dominant Legs': ['Bodyweight Squats','Leg Press','Leg Extension','Hip Adduction','Front-Facing Super Squat'],
  'Hamstrings & Glutes': ['Dumbbell Wide Squats','Back-Facing Super Squat','Hip Thrust','Hip Abduction','Leg Extension','Calf Raises'],
  'Shoulders': ['Shoulder Press|Machine / Dumbbell','Dumbbell Lateral Raises','Rear Delt Fly','Dumbbell Shrugs','Barbell Upright Row'],
  'Biceps': ['Standing Dumbbell Biceps Curl','Seated Incline Dumbbell Curl','Hammer Curl','Preacher Curl'],
  'Triceps': ['Triceps Pushdown|Straight Bar / Rope','Overhead Triceps Extension|Dumbbell / Rope','Triceps Dips'],
  'Abs': ABS,
};
export const performance = [
  {title:'Chest + Biceps', groups:[['Chest',['Barbell Flat Chest Press','Incline Dumbbell Chest Press','Machine Chest Press','Pec Fly / Incline Pec Fly']],['Biceps',['Seated Incline Dumbbell Curl','Preacher Curl','Hammer Curl']]]},
  {title:'Quad-Dominant Legs + Shoulders', groups:[['Quad-Dominant Legs',['Bodyweight Squats','Front-Facing Super Squat','Leg Press','Leg Extension','Hip Adduction']],['Shoulders',['Machine / Dumbbell Shoulder Press','Dumbbell Lateral Raises','Rear Delt Fly','Dumbbell Shrugs']]]},
  {title:'Back + Triceps', groups:[['Back',['Assisted Pull-ups','Lat Pulldown','Chest-Supported Row','Seated Row','Back Extensions']],['Triceps',['Straight-Bar Triceps Pushdown','Overhead Triceps Extension|Dumbbell / Rope','Rope Triceps Pushdown / Triceps Dips']]]},
  {title:'Hamstrings & Glutes + Forearms + Abs', groups:[['Hamstrings & Glutes',library['Hamstrings & Glutes']],['Forearms',['Dumbbell Wrist Curls','Reverse Wrist Curls']],['Abs',ABS]]},
];
export const schedules = {
  2: [['Day 1','Chest + Cardio'],['Day 2','Back + Cardio'],['Day 3','Quad-Dominant Legs + Abs + Cardio'],['Day 4','Shoulders + Cardio'],['Day 5','Biceps / Triceps + Cardio'],['Day 6','Hamstrings & Glutes + Abs + Cardio'],['Day 7','Rest']],
  3: [['Day 1','Chest + Biceps'],['Day 2','Quads + Shoulders'],['Day 3','Recovery'],['Day 4','Back + Triceps'],['Day 5','Hamstrings & Glutes + Forearms + Abs'],['Day 6','Optional Cardio / Mobility'],['Day 7','Rest']],
};
export const levels = [
  {id:1,title:'Foundation', audience:'Beginner', format:'Two-week mixed workout', file:'zenith-level-1-foundation.pdf',footer:'Your trainer will guide you on sets, repetitions, weights, and cardio.'},
  {id:2,title:'Strength Builder', audience:'Intermediate', format:'Single muscle + cardio', file:'zenith-level-2-strength-builder.pdf',footer:'Exercise selection, sets, reps, weights, and cardio are guided by your trainer.'},
  {id:3,title:'Performance', audience:'Advanced', format:'Double muscle + optional cardio', file:'zenith-level-3-performance.pdf',footer:'Exercise selection and difficulty modifications are guided by your trainer.'},
];

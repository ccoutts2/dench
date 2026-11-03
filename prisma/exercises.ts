/**
 * Global exercise library (~800 rows).
 *
 * Each line is `Movement | primary | secondary,... | equipment codes | kind?`
 * and expands into one exercise per equipment code, named Strong-style:
 * "Bench Press (Barbell)", "Bench Press (Dumbbell)", ...
 *
 * Equipment codes:
 *   B barbell · D dumbbell · M machine · C cable · W bodyweight · K kettlebell
 *   E EZ bar · S smith machine · R band · T trap bar · A assisted · X other
 *
 * Kind (optional, defaults by equipment):
 *   wr weight+reps · br bodyweight reps · wb weighted bodyweight
 *   ab assisted bodyweight · du duration · dd distance+duration
 */

import type {
	Equipment,
	ExerciseKind,
	MuscleGroup
} from '../src/lib/server/generated/prisma/enums.ts';

const RAW = `
# ── Chest ──
Bench Press | CHEST | TRICEPS,SHOULDERS | BDSM
Incline Bench Press | CHEST | SHOULDERS,TRICEPS | BDSM
Decline Bench Press | CHEST | TRICEPS | BDSM
Close-Grip Bench Press | TRICEPS | CHEST | BDSE
Floor Press | CHEST | TRICEPS | BDK
Paused Bench Press | CHEST | TRICEPS | BD
Spoto Press | CHEST | TRICEPS | B
Pin Press | CHEST | TRICEPS | B
Larsen Press | CHEST | TRICEPS | B
Board Press | CHEST | TRICEPS | B
Reverse-Grip Bench Press | CHEST | TRICEPS | BS
Wide-Grip Bench Press | CHEST | SHOULDERS | BS
Neutral-Grip Bench Press | CHEST | TRICEPS | DM
Squeeze Press | CHEST | TRICEPS | D
Chest Press | CHEST | TRICEPS | MCR
Incline Chest Press | CHEST | SHOULDERS | MC
Decline Chest Press | CHEST | TRICEPS | M
Chest Fly | CHEST | SHOULDERS | DMCR
Incline Chest Fly | CHEST | SHOULDERS | DC
Decline Chest Fly | CHEST | | DC
Low-to-High Cable Fly | CHEST | SHOULDERS | C
High-to-Low Cable Fly | CHEST | | C
Cable Crossover | CHEST | | C
Single-Arm Cable Fly | CHEST | | C
Pec Deck | CHEST | | M
Pullover | CHEST | BACK | DCM
Svend Press | CHEST | | DX
Push-Up | CHEST | TRICEPS,SHOULDERS | WR | br
Weighted Push-Up | CHEST | TRICEPS | W | wb
Incline Push-Up | CHEST | TRICEPS | W | br
Decline Push-Up | CHEST | SHOULDERS | W | br
Diamond Push-Up | TRICEPS | CHEST | W | br
Wide Push-Up | CHEST | | W | br
Archer Push-Up | CHEST | TRICEPS | W | br
Clap Push-Up | CHEST | TRICEPS | W | br
Ring Push-Up | CHEST | TRICEPS | W | br
Deficit Push-Up | CHEST | TRICEPS | W | br
Chest Dip | CHEST | TRICEPS | WA | br
Weighted Chest Dip | CHEST | TRICEPS | W | wb
Landmine Press | CHEST | SHOULDERS | B
Hex Press | CHEST | TRICEPS | D
Plate Press | CHEST | | X

# ── Back ──
Deadlift | BACK | HAMSTRINGS,GLUTES | BTDK
Sumo Deadlift | BACK | GLUTES,QUADS | BKD
Deficit Deadlift | BACK | HAMSTRINGS | BT
Rack Pull | BACK | TRAPS | BT
Block Pull | BACK | TRAPS | B
Snatch-Grip Deadlift | BACK | TRAPS,HAMSTRINGS | B
Paused Deadlift | BACK | HAMSTRINGS | B
Bent Over Row | BACK | BICEPS | BDKCR
Pendlay Row | BACK | BICEPS | B
Yates Row | BACK | BICEPS | B
Seal Row | BACK | BICEPS | BD
Chest-Supported Row | BACK | BICEPS | DM
Incline Row | BACK | BICEPS | D
T-Bar Row | BACK | BICEPS | BM
Meadows Row | BACK | BICEPS | B
Single-Arm Row | BACK | BICEPS | DCKM
Kroc Row | BACK | BICEPS | D
Renegade Row | BACK | ABS | DK
Seated Row | BACK | BICEPS | CMR
Wide-Grip Seated Row | BACK | SHOULDERS | C
Iso-Lateral Row | BACK | BICEPS | M
High Row | BACK | BICEPS | MC
Low Row | BACK | BICEPS | M
Inverted Row | BACK | BICEPS | WS | br
Lat Pulldown | BACK | BICEPS | CMR
Wide-Grip Lat Pulldown | BACK | BICEPS | C
Close-Grip Lat Pulldown | BACK | BICEPS | C
Neutral-Grip Lat Pulldown | BACK | BICEPS | C
Reverse-Grip Lat Pulldown | BACK | BICEPS | C
Single-Arm Lat Pulldown | BACK | BICEPS | C
Behind-the-Neck Pulldown | BACK | SHOULDERS | C
Straight-Arm Pulldown | BACK | | CR
Pull-Up | BACK | BICEPS | WAR | br
Weighted Pull-Up | BACK | BICEPS | W | wb
Chin-Up | BACK | BICEPS | WAR | br
Weighted Chin-Up | BACK | BICEPS | W | wb
Neutral-Grip Pull-Up | BACK | BICEPS | WA | br
Wide-Grip Pull-Up | BACK | | W | br
Commando Pull-Up | BACK | BICEPS | W | br
L-Sit Pull-Up | BACK | ABS | W | br
Muscle-Up | BACK | TRICEPS,CHEST | W | br
Ring Row | BACK | BICEPS | W | br
Back Extension | BACK | GLUTES,HAMSTRINGS | WMD | br
Weighted Back Extension | BACK | GLUTES | W | wb
Reverse Hyperextension | GLUTES | BACK,HAMSTRINGS | M
Superman | BACK | GLUTES | W | br
Good Morning | HAMSTRINGS | BACK,GLUTES | BSR
Jefferson Curl | BACK | HAMSTRINGS | BDK
Rope Pullover | BACK | | C
Kayak Row | BACK | ABS | C
Gorilla Row | BACK | | K
Landmine Row | BACK | BICEPS | B

# ── Shoulders ──
Overhead Press | SHOULDERS | TRICEPS | BDSKM
Seated Overhead Press | SHOULDERS | TRICEPS | BDSM
Push Press | SHOULDERS | TRICEPS,QUADS | BDK
Behind-the-Neck Press | SHOULDERS | TRICEPS | BS
Z Press | SHOULDERS | TRICEPS,ABS | BD
Arnold Press | SHOULDERS | TRICEPS | DK
Single-Arm Overhead Press | SHOULDERS | ABS | DKC
Bradford Press | SHOULDERS | | B
Landmine Shoulder Press | SHOULDERS | CHEST | B
Shoulder Press | SHOULDERS | TRICEPS | MCR
Lateral Raise | SHOULDERS | | DCMRK
Seated Lateral Raise | SHOULDERS | | D
Lean-Away Lateral Raise | SHOULDERS | | DC
Y-Raise | SHOULDERS | BACK | DCR
Front Raise | SHOULDERS | | BDCRX
Rear Delt Fly | SHOULDERS | BACK | DCMR
Reverse Pec Deck | SHOULDERS | BACK | M
Bent Over Lateral Raise | SHOULDERS | BACK | D
Face Pull | SHOULDERS | BACK,TRAPS | CR
Band Pull-Apart | SHOULDERS | BACK | R
Upright Row | SHOULDERS | TRAPS | BDCEKS
Cuban Press | SHOULDERS | | DB
Scaption | SHOULDERS | | D
Pike Push-Up | SHOULDERS | TRICEPS | W | br
Handstand Push-Up | SHOULDERS | TRICEPS | W | br
Wall Walk | SHOULDERS | ABS | W | br
External Rotation | SHOULDERS | | DCR
Internal Rotation | SHOULDERS | | CR
Cable Rear Delt Row | SHOULDERS | BACK | C
Rear Delt Row | SHOULDERS | BACK | D
Lu Raise | SHOULDERS | | D
Bus Driver | SHOULDERS | | X
Halo | SHOULDERS | ABS | KX

# ── Traps ──
Shrug | TRAPS | | BDSTMCK
Behind-the-Back Shrug | TRAPS | | BS
Overhead Shrug | TRAPS | SHOULDERS | B
Farmer's Walk | FOREARMS | TRAPS,FULL_BODY | DKTX | dd
Suitcase Carry | ABS | FOREARMS | DK | dd
Overhead Carry | SHOULDERS | ABS | DKB | dd
High Pull | TRAPS | SHOULDERS | BK
Snatch-Grip High Pull | TRAPS | SHOULDERS | B
Prone Y-T-W | SHOULDERS | TRAPS | DW

# ── Biceps ──
Bicep Curl | BICEPS | FOREARMS | BDCMRKE
Standing Curl | BICEPS | | BE
Hammer Curl | BICEPS | FOREARMS | DCR
Cross-Body Hammer Curl | BICEPS | FOREARMS | D
Incline Curl | BICEPS | | DC
Preacher Curl | BICEPS | | BDEMC
Concentration Curl | BICEPS | | DC
Spider Curl | BICEPS | | BDE
Drag Curl | BICEPS | | BDE
Reverse Curl | FOREARMS | BICEPS | BDEC
Zottman Curl | BICEPS | FOREARMS | D
Bayesian Curl | BICEPS | | C
High Cable Curl | BICEPS | | C
Rope Hammer Curl | BICEPS | FOREARMS | C
Waiter Curl | BICEPS | | D
21s | BICEPS | | BED
Chin-Up Curl | BICEPS | | W | br
Alternating Curl | BICEPS | | DK
Seated Curl | BICEPS | | DM
Lying Cable Curl | BICEPS | | C
Plate Curl | BICEPS | FOREARMS | X

# ── Triceps ──
Triceps Pushdown | TRICEPS | | CR
Rope Pushdown | TRICEPS | | C
V-Bar Pushdown | TRICEPS | | C
Reverse-Grip Pushdown | TRICEPS | | C
Single-Arm Pushdown | TRICEPS | | C
Overhead Triceps Extension | TRICEPS | | DCEBRK
Single-Arm Overhead Extension | TRICEPS | | DC
Skull Crusher | TRICEPS | | BEDC
Incline Skull Crusher | TRICEPS | | ED
JM Press | TRICEPS | CHEST | BS
Tate Press | TRICEPS | | D
Triceps Kickback | TRICEPS | | DCR
Triceps Dip | TRICEPS | CHEST | WAM | br
Weighted Triceps Dip | TRICEPS | CHEST | W | wb
Bench Dip | TRICEPS | | W | br
Triceps Extension | TRICEPS | | M
Cross-Body Extension | TRICEPS | | C
Katana Extension | TRICEPS | | C
Rolling Triceps Extension | TRICEPS | | D
Bodyweight Skull Crusher | TRICEPS | | W | br

# ── Forearms ──
Wrist Curl | FOREARMS | | BDCE
Reverse Wrist Curl | FOREARMS | | BDCE
Behind-the-Back Wrist Curl | FOREARMS | | B
Wrist Roller | FOREARMS | | X
Plate Pinch | FOREARMS | | X | du
Dead Hang | FOREARMS | BACK | W | du
Towel Hang | FOREARMS | | W | du
Grip Crusher | FOREARMS | | X
Fat Grip Hold | FOREARMS | | BD | du

# ── Quads ──
Back Squat | QUADS | GLUTES,HAMSTRINGS | BSM
Front Squat | QUADS | GLUTES,ABS | BKSD
Paused Squat | QUADS | GLUTES | BS
Box Squat | QUADS | GLUTES | B
Pin Squat | QUADS | GLUTES | B
Safety Bar Squat | QUADS | GLUTES | X
Zercher Squat | QUADS | ABS | B
Overhead Squat | QUADS | SHOULDERS,ABS | BD
High-Bar Squat | QUADS | GLUTES | B
Low-Bar Squat | QUADS | GLUTES,HAMSTRINGS | B
Goblet Squat | QUADS | GLUTES | DK
Sumo Squat | QUADS | GLUTES | DK
Hack Squat | QUADS | GLUTES | MB
Pendulum Squat | QUADS | GLUTES | M
Belt Squat | QUADS | GLUTES | M
V-Squat | QUADS | | M
Sissy Squat | QUADS | | WM | br
Heel-Elevated Squat | QUADS | | DBK
Air Squat | QUADS | GLUTES | W | br
Jump Squat | QUADS | GLUTES,CALVES | WBD | br
Pistol Squat | QUADS | GLUTES | WK | br
Cossack Squat | QUADS | GLUTES | WK | br
Wall Sit | QUADS | | W | du
Leg Press | QUADS | GLUTES | M
Single-Leg Leg Press | QUADS | GLUTES | M
Horizontal Leg Press | QUADS | | M
Leg Extension | QUADS | | MR
Single-Leg Leg Extension | QUADS | | M
Bulgarian Split Squat | QUADS | GLUTES | DBSKW
Split Squat | QUADS | GLUTES | DBSW
Front-Foot Elevated Split Squat | QUADS | GLUTES | D
Lunge | QUADS | GLUTES | DBKW
Reverse Lunge | QUADS | GLUTES | DBKSW
Walking Lunge | QUADS | GLUTES | DBKW
Lateral Lunge | QUADS | GLUTES | DKW
Curtsy Lunge | GLUTES | QUADS | DKW
Deficit Reverse Lunge | QUADS | GLUTES | D
Step-Up | QUADS | GLUTES | DBKW
Lateral Step-Up | QUADS | GLUTES | D
Box Jump | QUADS | CALVES | W | br
Broad Jump | QUADS | GLUTES | W | br
Spanish Squat | QUADS | | R
Reverse Nordic | QUADS | | W | br
Peterson Step-Up | QUADS | | W | br
Trap Bar Squat | QUADS | GLUTES | T

# ── Hamstrings ──
Romanian Deadlift | HAMSTRINGS | GLUTES,BACK | BDKST
Single-Leg Romanian Deadlift | HAMSTRINGS | GLUTES | DKBC
Stiff-Leg Deadlift | HAMSTRINGS | BACK | BDT
Lying Leg Curl | HAMSTRINGS | | MD
Seated Leg Curl | HAMSTRINGS | | M
Standing Leg Curl | HAMSTRINGS | | MC
Nordic Curl | HAMSTRINGS | | W | br
Glute-Ham Raise | HAMSTRINGS | GLUTES | W | br
Swiss Ball Leg Curl | HAMSTRINGS | | X
Sliding Leg Curl | HAMSTRINGS | | W | br
Cable Pull-Through | HAMSTRINGS | GLUTES | CR
Kettlebell Swing | GLUTES | HAMSTRINGS | K
Single-Arm Swing | GLUTES | HAMSTRINGS | K
American Swing | GLUTES | SHOULDERS | K

# ── Glutes ──
Hip Thrust | GLUTES | HAMSTRINGS | BDMSR
Single-Leg Hip Thrust | GLUTES | | WBD | br
Glute Bridge | GLUTES | HAMSTRINGS | BDWR
Single-Leg Glute Bridge | GLUTES | | W | br
Frog Pump | GLUTES | | WD | br
Glute Kickback | GLUTES | | CMR
Donkey Kick | GLUTES | | W | br
Hip Abduction | GLUTES | | MCR
Hip Adduction | QUADS | | MC
Fire Hydrant | GLUTES | | WR | br
Clamshell | GLUTES | | R
Lateral Band Walk | GLUTES | | R
Monster Walk | GLUTES | | R
Sumo Deadlift High Pull | GLUTES | TRAPS | BK
B-Stance Hip Thrust | GLUTES | | BD
45° Hip Extension | GLUTES | HAMSTRINGS | WD | br
Copenhagen Plank | QUADS | ABS | W | du

# ── Calves ──
Standing Calf Raise | CALVES | | MBDSW
Seated Calf Raise | CALVES | | MBD
Single-Leg Calf Raise | CALVES | | DW
Donkey Calf Raise | CALVES | | MW
Leg Press Calf Raise | CALVES | | M
Tibialis Raise | CALVES | | WX | br
Jump Rope | CALVES | CARDIO | X | du
Pogo Hop | CALVES | | W | br

# ── Abs ──
Crunch | ABS | | WMC | br
Cable Crunch | ABS | | C
Kneeling Cable Crunch | ABS | | C
Decline Crunch | ABS | | WD | br
Reverse Crunch | ABS | | W | br
Bicycle Crunch | ABS | | W | br
Sit-Up | ABS | | WD | br
Weighted Sit-Up | ABS | | W | wb
V-Up | ABS | | W | br
Toes-to-Bar | ABS | FOREARMS | W | br
Hanging Leg Raise | ABS | FOREARMS | W | br
Hanging Knee Raise | ABS | | W | br
Captain's Chair Leg Raise | ABS | | M | br
Lying Leg Raise | ABS | | W | br
Dragon Flag | ABS | | W | br
Ab Wheel Rollout | ABS | SHOULDERS | X
Barbell Rollout | ABS | | B
Plank | ABS | | W | du
Weighted Plank | ABS | | W | du
Side Plank | ABS | | W | du
RKC Plank | ABS | | W | du
Hollow Hold | ABS | | W | du
L-Sit | ABS | TRICEPS | W | du
Russian Twist | ABS | | WDK | br
Pallof Press | ABS | | CR
Woodchopper | ABS | SHOULDERS | CDR
Landmine Rotation | ABS | SHOULDERS | B
Dead Bug | ABS | | W | br
Bird Dog | ABS | BACK | W | br
Mountain Climber | ABS | CARDIO | W | br
Flutter Kick | ABS | | W | br
Oblique Crunch | ABS | | WC | br
Side Bend | ABS | | DCK
Windshield Wiper | ABS | | W | br
Stir the Pot | ABS | | X
Machine Crunch | ABS | | M
Body Saw | ABS | | W | du
Jackknife Sit-Up | ABS | | W | br
Turkish Get-Up | FULL_BODY | ABS,SHOULDERS | KD

# ── Olympic & full body ──
Clean | FULL_BODY | QUADS,TRAPS | BDK
Power Clean | FULL_BODY | QUADS,TRAPS | BDK
Hang Clean | FULL_BODY | TRAPS | BDK
Hang Power Clean | FULL_BODY | TRAPS | BD
Clean Pull | FULL_BODY | TRAPS | B
Clean and Jerk | FULL_BODY | SHOULDERS,QUADS | BD
Clean and Press | FULL_BODY | SHOULDERS | BDK
Split Jerk | SHOULDERS | QUADS | B
Push Jerk | SHOULDERS | QUADS | BD
Snatch | FULL_BODY | SHOULDERS,QUADS | BDK
Power Snatch | FULL_BODY | SHOULDERS | BD
Hang Snatch | FULL_BODY | SHOULDERS | BD
Muscle Snatch | SHOULDERS | TRAPS | B
Snatch Pull | FULL_BODY | TRAPS | B
Thruster | FULL_BODY | QUADS,SHOULDERS | BDK
Man Maker | FULL_BODY | | D
Burpee | FULL_BODY | CARDIO | W | br
Bear Crawl | FULL_BODY | | W | du
Sandbag Carry | FULL_BODY | | X | dd
Sled Push | FULL_BODY | QUADS | X | dd
Sled Pull | FULL_BODY | HAMSTRINGS | X | dd
Tire Flip | FULL_BODY | | X
Battle Ropes | FULL_BODY | SHOULDERS,CARDIO | X | du
Wall Ball | FULL_BODY | QUADS,SHOULDERS | X
Medicine Ball Slam | FULL_BODY | ABS | X
Devil Press | FULL_BODY | | D
Kettlebell Clean | FULL_BODY | | K
Kettlebell Snatch | FULL_BODY | SHOULDERS | K
Double Kettlebell Front Rack Carry | ABS | | K | dd

# ── Cardio ──
Running | CARDIO | | X | dd
Treadmill | CARDIO | | M | dd
Incline Walk | CARDIO | | M | dd
Cycling | CARDIO | QUADS | X | dd
Stationary Bike | CARDIO | QUADS | M | dd
Assault Bike | CARDIO | FULL_BODY | M | dd
Rowing | CARDIO | BACK | M | dd
Ski Erg | CARDIO | BACK | M | dd
Elliptical | CARDIO | | M | dd
Stair Climber | CARDIO | GLUTES | M | dd
Swimming | CARDIO | FULL_BODY | X | dd
Walking | CARDIO | | X | dd
Hiking | CARDIO | | X | dd
Jumping Jack | CARDIO | | W | br
High Knees | CARDIO | | W | du
Shadow Boxing | CARDIO | SHOULDERS | W | du
Sprints | CARDIO | QUADS | X | dd
Hill Sprints | CARDIO | GLUTES | X | dd
# ── Variations & accessories ──
Incline Close-Grip Bench Press | TRICEPS | CHEST | BS
Guillotine Press | CHEST | SHOULDERS | BS
Feet-Up Bench Press | CHEST | TRICEPS | BD
Single-Arm Bench Press | CHEST | ABS | D
Alternating Bench Press | CHEST | TRICEPS | D
Low Incline Bench Press | CHEST | SHOULDERS | BDS
Single-Arm Chest Press | CHEST | | CMR
Standing Chest Press | CHEST | | CR
Seated Chest Fly | CHEST | | MC
Plate-Loaded Chest Press | CHEST | TRICEPS | M
Wide Chest Press | CHEST | | M
Converging Chest Press | CHEST | | M
Dip Machine | TRICEPS | CHEST | M
Close-Grip Pulldown | BACK | BICEPS | M
Pullover Machine | BACK | | M
Plate-Loaded Row | BACK | BICEPS | M
Pulldown | BACK | BICEPS | M
Dual-Handle Lat Pulldown | BACK | BICEPS | C
Half-Kneeling Lat Pulldown | BACK | | C
Single-Arm Seated Row | BACK | BICEPS | CM
Rope Row | BACK | SHOULDERS | C
Helms Row | BACK | BICEPS | D
Bench Supported Row | BACK | BICEPS | DK
Underhand Row | BACK | BICEPS | BSC
Smith Machine Row | BACK | | S
Rack Chin | BACK | BICEPS | W | br
Scapular Pull-Up | BACK | | W | br
Archer Pull-Up | BACK | BICEPS | W | br
Typewriter Pull-Up | BACK | | W | br
Negative Pull-Up | BACK | BICEPS | W | br
Rope Climb | BACK | FOREARMS | X
Machine Lateral Raise | SHOULDERS | | M
Partial Lateral Raise | SHOULDERS | | DC
Behind-the-Back Lateral Raise | SHOULDERS | | C
Single-Arm Lateral Raise | SHOULDERS | | DCK
Lying Lateral Raise | SHOULDERS | | D
Incline Y-Raise | SHOULDERS | TRAPS | D
Plate Front Raise | SHOULDERS | | X
Alternating Front Raise | SHOULDERS | | D
Single-Arm Rear Delt Fly | SHOULDERS | | CD
Prone Rear Delt Raise | SHOULDERS | | D
Kettlebell Bottoms-Up Press | SHOULDERS | ABS | K
Seated Arnold Press | SHOULDERS | TRICEPS | D
Half-Kneeling Press | SHOULDERS | ABS | DKB
Viking Press | SHOULDERS | TRICEPS | M
Log Press | SHOULDERS | TRICEPS | X
Axle Press | SHOULDERS | TRICEPS | X
Kelso Shrug | TRAPS | BACK | DBM
Single-Arm Shrug | TRAPS | | DC
Incline Shrug | TRAPS | | D
Machine Curl | BICEPS | | M
Single-Arm Preacher Curl | BICEPS | | DC
Rope Cable Curl | BICEPS | FOREARMS | C
Single-Arm Cable Curl | BICEPS | | C
Wide-Grip Curl | BICEPS | | BE
Close-Grip Curl | BICEPS | | BE
Prone Incline Curl | BICEPS | | D
Pinwheel Curl | BICEPS | FOREARMS | D
Kettlebell Curl | BICEPS | FOREARMS | K
Overhead Cable Curl | BICEPS | | C
Banded Curl | BICEPS | | R
Triceps Pressdown | TRICEPS | | M
Close-Grip Push-Up | TRICEPS | CHEST | W | br
Overhead Rope Extension | TRICEPS | | C
Lying Triceps Extension | TRICEPS | | DCE
Seated Triceps Press | TRICEPS | | ED
Single-Arm Kickback | TRICEPS | | DC
Floor Skull Crusher | TRICEPS | | ED
California Press | TRICEPS | CHEST | B
Radial Deviation | FOREARMS | | D
Ulnar Deviation | FOREARMS | | D
Pronation and Supination | FOREARMS | | D
Finger Curl | FOREARMS | | BD
Hammer Hold | FOREARMS | | X | du
Duck Walk | QUADS | GLUTES | W | br
Landmine Squat | QUADS | GLUTES | B
Anderson Squat | QUADS | GLUTES | B
Tempo Squat | QUADS | GLUTES | BD
1.5-Rep Squat | QUADS | GLUTES | BDK
Narrow-Stance Squat | QUADS | | BS
Wide-Stance Squat | QUADS | GLUTES | BS
Front Rack Lunge | QUADS | GLUTES | BK
Overhead Lunge | QUADS | SHOULDERS | BD
Jumping Lunge | QUADS | GLUTES | W | br
Skater Squat | QUADS | GLUTES | WD | br
Box Pistol Squat | QUADS | GLUTES | W | br
Narrow-Stance Leg Press | QUADS | | M
Wide-Stance Leg Press | QUADS | GLUTES | M
Reverse Hack Squat | GLUTES | HAMSTRINGS | M
Kas Glute Bridge | GLUTES | | BM
Glute Drive | GLUTES | | M
Cable Hip Abduction | GLUTES | | C
Standing Hip Abduction | GLUTES | | MR
Side-Lying Hip Abduction | GLUTES | | W | br
Hip Airplane | GLUTES | | W | br
Kneeling Squat | GLUTES | | B
Glute-Ham Developer Raise | HAMSTRINGS | GLUTES | M
Single-Leg Lying Leg Curl | HAMSTRINGS | | M
Single-Leg Seated Leg Curl | HAMSTRINGS | | M
Kettlebell Deadlift | HAMSTRINGS | GLUTES | K
Kickstand Romanian Deadlift | HAMSTRINGS | GLUTES | DBK
Banded Good Morning | HAMSTRINGS | | R
Seated Good Morning | BACK | HAMSTRINGS | B
Snatch-Grip Romanian Deadlift | HAMSTRINGS | TRAPS | B
Bent-Knee Calf Raise | CALVES | | MS
Smith Machine Calf Raise | CALVES | | S
Calf Press | CALVES | | M
Hack Squat Calf Raise | CALVES | | M
Ankle Hops | CALVES | | W | br
Seated Tibialis Raise | CALVES | | DM
Hanging Oblique Raise | ABS | | W | br
Ab Crunch Machine | ABS | | M
Rotary Torso | ABS | | M
Cable Oblique Twist | ABS | | C
Kneeling Ab Wheel | ABS | | X
Standing Ab Wheel | ABS | SHOULDERS | X
Garhammer Raise | ABS | | W | br
Decline Leg Raise | ABS | | W | br
Hanging Windshield Wiper | ABS | | W | br
Ab Pulldown | ABS | | C
Plank Shoulder Tap | ABS | SHOULDERS | W | br
Plank Up-Down | ABS | TRICEPS | W | br
Side Plank Hip Dip | ABS | | W | br
Hollow Rock | ABS | | W | br
Bear Plank | ABS | | W | du
Weighted Crunch | ABS | | DX
Heel Tap | ABS | | W | br
Swiss Ball Crunch | ABS | | X
Swiss Ball Pike | ABS | SHOULDERS | X
Stability Ball Rollout | ABS | | X
Push-Up Plus | SHOULDERS | CHEST | W | br
Kettlebell Windmill | ABS | SHOULDERS | K
Kettlebell High Pull | TRAPS | SHOULDERS | K
Kettlebell Goblet Carry | ABS | | K | dd
Kettlebell Around the World | ABS | SHOULDERS | K
Kettlebell Figure 8 | ABS | | K
Kettlebell Thruster | FULL_BODY | | K
Double Kettlebell Clean | FULL_BODY | | K
Double Kettlebell Press | SHOULDERS | TRICEPS | K
Double Kettlebell Front Squat | QUADS | ABS | K
Double Kettlebell Swing | GLUTES | HAMSTRINGS | K
Hang Squat Clean | FULL_BODY | QUADS | B
Squat Clean | FULL_BODY | QUADS | B
Squat Snatch | FULL_BODY | QUADS,SHOULDERS | B
Snatch Balance | QUADS | SHOULDERS | B
Clean High Pull | TRAPS | FULL_BODY | B
Tall Clean | FULL_BODY | | B
Behind-the-Neck Jerk | SHOULDERS | QUADS | B
Sandbag Clean | FULL_BODY | | X
Sandbag Shouldering | FULL_BODY | | X
Atlas Stone | FULL_BODY | BACK | X
Yoke Carry | FULL_BODY | TRAPS | X | dd
Keg Carry | FULL_BODY | | X | dd
Zercher Carry | ABS | BICEPS | B | dd
Prowler Push | FULL_BODY | QUADS | X | dd
Backward Sled Drag | QUADS | | X | dd
Cross Trainer | CARDIO | | M | dd
Spin Class | CARDIO | QUADS | X | du
Versaclimber | CARDIO | FULL_BODY | M | dd
Jacob's Ladder | CARDIO | FULL_BODY | M | dd
Open Water Swim | CARDIO | | X | dd
Rucking | CARDIO | FULL_BODY | X | dd
Skipping | CARDIO | CALVES | W | du
Box Step-Over | QUADS | GLUTES | DW | br
Burpee Box Jump | FULL_BODY | CARDIO | W | br
Squat Thrust | FULL_BODY | | W | br
Inchworm | FULL_BODY | | W | br
`;

const EQUIPMENT: Record<string, { enum: Equipment; label: string }> = {
	B: { enum: 'BARBELL', label: 'Barbell' },
	D: { enum: 'DUMBBELL', label: 'Dumbbell' },
	M: { enum: 'MACHINE', label: 'Machine' },
	C: { enum: 'CABLE', label: 'Cable' },
	W: { enum: 'BODYWEIGHT', label: 'Bodyweight' },
	K: { enum: 'KETTLEBELL', label: 'Kettlebell' },
	E: { enum: 'EZ_BAR', label: 'EZ Bar' },
	S: { enum: 'SMITH_MACHINE', label: 'Smith Machine' },
	R: { enum: 'BAND', label: 'Band' },
	T: { enum: 'TRAP_BAR', label: 'Trap Bar' },
	A: { enum: 'ASSISTED', label: 'Assisted' },
	X: { enum: 'OTHER', label: 'Other' }
};

const KINDS: Record<string, ExerciseKind> = {
	wr: 'WEIGHT_REPS',
	br: 'BODYWEIGHT_REPS',
	wb: 'WEIGHTED_BODYWEIGHT',
	ab: 'ASSISTED_BODYWEIGHT',
	du: 'DURATION',
	dd: 'DISTANCE_DURATION'
};

export type SeedExercise = {
	id: string;
	name: string;
	equipment: Equipment;
	primaryMuscle: MuscleGroup;
	secondaryMuscles: MuscleGroup[];
	kind: ExerciseKind;
};

const slug = (s: string) =>
	s
		.toLowerCase()
		.replace(/[°']/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

function kindFor(code: string, explicit: string | undefined): ExerciseKind {
	if (code === 'A') return 'ASSISTED_BODYWEIGHT';
	const k = explicit ? KINDS[explicit] : undefined;
	if (explicit && !k) throw new Error(`Unknown kind "${explicit}"`);
	// "bodyweight reps" only describes the unloaded variants of a movement;
	// its machine/dumbbell/etc. variants are weight × reps.
	if (!k || k === 'BODYWEIGHT_REPS') return code === 'W' ? 'BODYWEIGHT_REPS' : 'WEIGHT_REPS';
	return k;
}

export function buildExercises(): SeedExercise[] {
	const out: SeedExercise[] = [];
	const seen = new Set<string>();

	for (const line of RAW.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const [movement, primary, secondary, codes, kind] = trimmed.split('|').map((p) => p.trim());
		if (!movement || !primary || codes === undefined) throw new Error(`Bad line: ${line}`);

		for (const code of codes) {
			const eq = EQUIPMENT[code];
			if (!eq) throw new Error(`Unknown equipment code "${code}" in: ${line}`);

			const name = `${movement} (${eq.label})`;
			const id = `ex_${slug(name)}`;
			if (seen.has(id)) throw new Error(`Duplicate exercise: ${name}`);
			seen.add(id);

			out.push({
				id,
				name,
				equipment: eq.enum,
				primaryMuscle: primary as MuscleGroup,
				secondaryMuscles: (secondary ? secondary.split(',').filter(Boolean) : []) as MuscleGroup[],
				kind: kindFor(code, kind)
			});
		}
	}

	return out;
}

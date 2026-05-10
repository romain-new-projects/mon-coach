import { useState, useEffect, useRef } from "react";

// ── SOUNDS ────────────────────────────────────────────────────────────────────
function createAudioCtx() {
  if (typeof window === "undefined") return null;
  return new (window.AudioContext || window.webkitAudioContext)();
}
function playBeep(ctx, freq, duration, type = "sine", gain = 0.4) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
}
function playWorkCountdown(ctx) { playBeep(ctx, 880, 0.12, "sine", 0.35); }
function playWorkEnd(ctx) {
  if (!ctx) return;
  playBeep(ctx, 660, 0.1, "square", 0.3);
  setTimeout(() => playBeep(ctx, 880, 0.1, "square", 0.3), 120);
  setTimeout(() => playBeep(ctx, 1100, 0.25, "square", 0.4), 240);
}
function playRestCountdown(ctx) { playBeep(ctx, 440, 0.12, "triangle", 0.3); }
function playRestEnd(ctx) {
  if (!ctx) return;
  playBeep(ctx, 330, 0.1, "triangle", 0.25);
  setTimeout(() => playBeep(ctx, 440, 0.1, "triangle", 0.3), 130);
  setTimeout(() => playBeep(ctx, 660, 0.3, "sine", 0.45), 260);
}

// ── STORAGE ───────────────────────────────────────────────────────────────────
async function load(key, fallback) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : fallback; } catch { return fallback; }
}
async function save(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch {}
}

// ── PROGRAMME PROGRESSIF ──────────────────────────────────────────────────────
const PROGRESSIVE_PROGRAM = {
  1: {
    label: "Poitrine & Triceps", color: "#FF6B35", emoji: "💪",
    levels: [
      { label: "Débutant 🌱", exercises: [
        { name: "Pompes sur les genoux", muscles: "Pectoraux, Triceps", sets: 3, reps: "8", work: 35, rest: 25, desc: "Genoux au sol, mains à largeur d'épaules. Descends la poitrine vers le sol, remonte lentement." },
        { name: "Dips assistés", muscles: "Triceps", sets: 3, reps: "8", work: 30, rest: 30, desc: "Mains sur la chaise, pieds posés au sol pour t'aider. Descends et remonte." },
        { name: "Pompes murales", muscles: "Pectoraux, Épaules", sets: 3, reps: "12", work: 30, rest: 25, desc: "Debout face au mur, mains à hauteur de poitrine. Fléchis les coudes et repousse." },
        { name: "Écartés isométriques", muscles: "Pectoraux", sets: 3, reps: "10 sec", work: 30, rest: 30, desc: "Paumes jointes devant la poitrine, pousse fort de chaque côté pendant 10 sec." },
      ]},
      { label: "Intermédiaire 💪", exercises: [
        { name: "Pompes classiques", muscles: "Pectoraux, Triceps", sets: 3, reps: "12", work: 40, rest: 20, desc: "Mains à largeur d'épaules, corps droit. Descends la poitrine au sol, remonte en explosif." },
        { name: "Dips sur chaise", muscles: "Triceps, Deltoïdes", sets: 3, reps: "12", work: 35, rest: 25, desc: "Mains sur le bord d'une chaise, pieds tendus. Descends les fesses vers le sol, remonte." },
        { name: "Pompes serrées", muscles: "Triceps, Pectoraux internes", sets: 3, reps: "10", work: 35, rest: 25, desc: "Mains rapprochées sous la poitrine. Coudes collés au corps à la descente." },
        { name: "Extensions triceps élastique", muscles: "Triceps", sets: 3, reps: "15", work: 40, rest: 20, desc: "Élastique sous le pied. Bras derrière la tête, étends vers le haut." },
      ]},
      { label: "Avancé 🔥", exercises: [
        { name: "Pompes déclinées", muscles: "Pectoraux supérieurs", sets: 4, reps: "12", work: 40, rest: 20, desc: "Pieds surélevés sur une chaise. Corps en ligne droite, descente lente et contrôlée." },
        { name: "Pompes diamant", muscles: "Triceps, Pectoraux internes", sets: 3, reps: "10", work: 35, rest: 25, desc: "Mains formant un losange sous la poitrine. Coudes vers l'arrière à la descente." },
        { name: "Dips lestés", muscles: "Triceps, Pectoraux", sets: 3, reps: "10", work: 35, rest: 30, desc: "Dips sur chaise avec un sac à dos lesté. Amplitude complète, dos droit." },
        { name: "Pompes à tempo lent", muscles: "Pectoraux, Triceps", sets: 3, reps: "8", work: 40, rest: 30, desc: "4 sec à la descente, 1 sec en bas, 2 sec à la montée. Contrôle total." },
      ]},
      { label: "Expert ⚡", exercises: [
        { name: "Pompes archer", muscles: "Pectoraux unilatéral", sets: 4, reps: "8/côté", work: 45, rest: 25, desc: "Une main large, l'autre tend le bras sur le côté. Alterne les côtés." },
        { name: "Pike push-up", muscles: "Deltoïdes, Triceps", sets: 3, reps: "12", work: 40, rest: 20, desc: "En V inversé, plie les coudes pour amener la tête vers le sol. Remonte en poussant fort." },
        { name: "Pompes explosives", muscles: "Pectoraux, Explosivité", sets: 4, reps: "8", work: 40, rest: 30, desc: "Descends lentement, explose vers le haut. Mains décollent du sol à chaque rep." },
        { name: "Pompes déclinées diamant", muscles: "Pectoraux supérieurs, Triceps", sets: 3, reps: "8", work: 35, rest: 30, desc: "Pieds surélevés + mains en diamant. L'exercice le plus intense de la série." },
      ]},
    ],
  },
  2: {
    label: "Dos & Biceps", color: "#4ECDC4", emoji: "🏋️",
    levels: [
      { label: "Débutant 🌱", exercises: [
        { name: "Superman", muscles: "Lombaires, Dorsaux", sets: 3, reps: "12", work: 40, rest: 20, desc: "Allongé ventre au sol, lève bras et jambes simultanément. Tiens 2 sec en haut." },
        { name: "Good Morning", muscles: "Lombaires, Ischio-jambiers", sets: 3, reps: "12", work: 35, rest: 25, desc: "Debout, pieds écartés. Penche le buste en avant dos droit, remonte lentement." },
        { name: "Curl élastique", muscles: "Biceps", sets: 3, reps: "12", work: 35, rest: 25, desc: "Élastique sous les pieds. Fléchis les bras vers les épaules, coudes fixes." },
        { name: "Rowing élastique", muscles: "Dorsaux, Biceps", sets: 3, reps: "12", work: 40, rest: 20, desc: "Élastique fixé devant toi. Tire les coudes vers l'arrière en serrant les omoplates." },
      ]},
      { label: "Intermédiaire 💪", exercises: [
        { name: "Superman pulsé", muscles: "Lombaires, Dorsaux", sets: 3, reps: "15", work: 40, rest: 20, desc: "Comme le Superman mais avec de petits mouvements de haut en bas en position haute." },
        { name: "Rowing élastique serré", muscles: "Dorsaux, Rhomboïdes", sets: 3, reps: "15", work: 40, rest: 20, desc: "Tire les coudes en serrant fort les omoplates. Tiens 2 sec en position haute." },
        { name: "Curl biceps élastique", muscles: "Biceps", sets: 3, reps: "15", work: 40, rest: 20, desc: "Élastique sous les pieds. Fléchis les deux bras, tiens 1 sec en haut." },
        { name: "Face pull élastique", muscles: "Deltoïdes arrière, Trapèzes", sets: 3, reps: "15", work: 35, rest: 25, desc: "Élastique à hauteur de visage. Tire vers ton visage en écartant les coudes." },
      ]},
      { label: "Avancé 🔥", exercises: [
        { name: "Superman unilatéral", muscles: "Lombaires asymétrique", sets: 3, reps: "10/côté", work: 40, rest: 20, desc: "Lève bras droit + jambe gauche ensemble, puis l'inverse. Contrôle complet." },
        { name: "Rowing unilatéral", muscles: "Grand dorsal, Biceps", sets: 3, reps: "12/bras", work: 40, rest: 20, desc: "Un bras à la fois. Tire le coude loin en arrière, légère rotation du buste." },
        { name: "Curl marteau élastique", muscles: "Biceps, Brachial", sets: 3, reps: "12", work: 40, rest: 20, desc: "Poignets en position neutre (pouces vers le haut). Fléchis lentement." },
        { name: "Rowing haut élastique", muscles: "Trapèzes, Deltoïdes", sets: 3, reps: "12", work: 35, rest: 25, desc: "Tire l'élastique vers le menton, coudes hauts et écartés." },
      ]},
      { label: "Expert ⚡", exercises: [
        { name: "Inverted row sur table", muscles: "Dorsaux, Biceps, Core", sets: 4, reps: "10", work: 45, rest: 25, desc: "Allongé sous une table, saisis le bord et tire ta poitrine vers le haut. Corps rigide." },
        { name: "Curl concentré élastique", muscles: "Biceps pic", sets: 3, reps: "12/bras", work: 40, rest: 20, desc: "Coude appuyé sur la cuisse, curl lent. Squeeze fort en haut." },
        { name: "Superman tempo lent", muscles: "Chaîne postérieure", sets: 3, reps: "10", work: 45, rest: 25, desc: "4 sec à la montée, 3 sec tenu en haut, 4 sec à la descente." },
        { name: "Rowing élastique double", muscles: "Dorsaux complet", sets: 4, reps: "15", work: 45, rest: 20, desc: "Deux élastiques, un par main. Tire simultanément, maximum de contraction dorsale." },
      ]},
    ],
  },
  3: {
    label: "Jambes & Fessiers", color: "#A8E6CF", emoji: "🦵",
    levels: [
      { label: "Débutant 🌱", exercises: [
        { name: "Squats assistés", muscles: "Quadriceps, Fessiers", sets: 3, reps: "12", work: 40, rest: 20, desc: "Tiens-toi à une chaise pour l'équilibre. Descends lentement, remonte en poussant sur les talons." },
        { name: "Pont fessier", muscles: "Fessiers, Ischio-jambiers", sets: 3, reps: "15", work: 35, rest: 25, desc: "Allongé sur le dos, pieds à plat. Pousse les hanches vers le haut, serre les fesses." },
        { name: "Fentes statiques", muscles: "Quadriceps, Fessiers", sets: 3, reps: "10/jambe", work: 40, rest: 20, desc: "Position de fente fixe, descends et remonte sans changer de pied. Dos droit." },
        { name: "Mollets debout", muscles: "Mollets", sets: 3, reps: "20", work: 30, rest: 20, desc: "Monte sur la pointe des pieds lentement. Tiens 1 sec en haut, descends doucement." },
      ]},
      { label: "Intermédiaire 💪", exercises: [
        { name: "Squats classiques", muscles: "Quadriceps, Fessiers", sets: 4, reps: "15", work: 45, rest: 15, desc: "Pieds à largeur d'épaules. Descends comme pour t'asseoir, genoux dans l'axe des pieds." },
        { name: "Fentes avant alternées", muscles: "Quadriceps, Fessiers", sets: 3, reps: "10/jambe", work: 45, rest: 15, desc: "Un pied en avant, descends le genou arrière vers le sol. Alterne les jambes." },
        { name: "Pont fessier unilatéral", muscles: "Fessiers unilatéral", sets: 3, reps: "12/jambe", work: 40, rest: 20, desc: "Une jambe tendue, pousse les hanches avec l'autre. Garde le bassin horizontal." },
        { name: "Squats sumo", muscles: "Adducteurs, Fessiers", sets: 3, reps: "15", work: 40, rest: 20, desc: "Pieds très écartés, orteils à 45°. Descends profond, dos droit." },
      ]},
      { label: "Avancé 🔥", exercises: [
        { name: "Squats bulgares", muscles: "Quadriceps unilatéral", sets: 3, reps: "10/jambe", work: 45, rest: 25, desc: "Pied arrière sur une chaise, descends le genou avant vers le sol. Dos droit." },
        { name: "Fentes sautées", muscles: "Quadriceps, Cardio", sets: 3, reps: "10/jambe", work: 40, rest: 25, desc: "En position de fente, saute et change de jambe en l'air. Atterris en douceur." },
        { name: "Pont fessier élastique", muscles: "Fessiers, Abducteurs", sets: 3, reps: "15", work: 40, rest: 20, desc: "Élastique autour des genoux, pousse-les vers l'extérieur pendant le pont." },
        { name: "Squats pause", muscles: "Quadriceps, Force statique", sets: 4, reps: "10", work: 45, rest: 25, desc: "Descends en squat, tiens 3 sec en bas avant de remonter. Posture irréprochable." },
      ]},
      { label: "Expert ⚡", exercises: [
        { name: "Pistol squat assisté", muscles: "Quadriceps, Équilibre", sets: 3, reps: "6/jambe", work: 45, rest: 30, desc: "Une jambe tendue devant, descends sur l'autre. Aide-toi d'une chaise si besoin." },
        { name: "Fentes marchées lestées", muscles: "Jambes complètes", sets: 3, reps: "12/jambe", work: 50, rest: 25, desc: "Avance en fentes avec un sac à dos lesté. Amplitude maximale à chaque pas." },
        { name: "Squats sautés", muscles: "Explosivité", sets: 4, reps: "12", work: 40, rest: 25, desc: "Descends en squat puis explose vers le haut. Atterris doucement en squat directement." },
        { name: "Nordic curl assisté", muscles: "Ischio-jambiers", sets: 3, reps: "6", work: 45, rest: 35, desc: "Pieds bloqués sous un meuble, penche-toi en avant en résistant. Aide avec les mains." },
      ]},
    ],
  },
  4: {
    label: "Épaules & Abdos", color: "#FFD93D", emoji: "🎯",
    levels: [
      { label: "Débutant 🌱", exercises: [
        { name: "Élévations latérales élastique", muscles: "Deltoïdes latéraux", sets: 3, reps: "12", work: 35, rest: 25, desc: "Élastique léger sous le pied. Lève les bras sur les côtés jusqu'à hauteur d'épaules." },
        { name: "Planche sur les genoux", muscles: "Abdos, Core", sets: 3, reps: "20 sec", work: 20, rest: 30, desc: "Sur les avant-bras et les genoux. Corps droit de la tête aux genoux. Respire." },
        { name: "Crunchs", muscles: "Abdominaux", sets: 3, reps: "15", work: 35, rest: 25, desc: "Sur le dos, genoux pliés. Monte les épaules vers les genoux en soufflant." },
        { name: "Rotations épaules élastique", muscles: "Coiffe des rotateurs", sets: 3, reps: "15", work: 30, rest: 25, desc: "Élastique tenu à deux mains, tire latéralement en gardant les coudes collés au corps." },
      ]},
      { label: "Intermédiaire 💪", exercises: [
        { name: "Pike push-up", muscles: "Deltoïdes, Triceps", sets: 3, reps: "10", work: 40, rest: 20, desc: "En V inversé, plie les coudes pour amener la tête vers le sol." },
        { name: "Élévations latérales élastique", muscles: "Deltoïdes latéraux", sets: 3, reps: "15", work: 35, rest: 25, desc: "Élastique sous le pied. Lève les bras sur les côtés jusqu'à hauteur d'épaules." },
        { name: "Planche", muscles: "Abdos, Core", sets: 3, reps: "30 sec", work: 30, rest: 30, desc: "Sur les avant-bras et les orteils. Corps rigide. Respire régulièrement." },
        { name: "Mountain climbers", muscles: "Abdos, Cardio", sets: 3, reps: "30 sec", work: 30, rest: 30, desc: "En position de pompe, ramène alternativement les genoux vers la poitrine rapidement." },
      ]},
      { label: "Avancé 🔥", exercises: [
        { name: "Pike push-up décliné", muscles: "Deltoïdes, Force", sets: 4, reps: "10", work: 40, rest: 25, desc: "Pieds surélevés sur une chaise, en V inversé accentué. Amplitude maximale." },
        { name: "Élévations frontales + latérales", muscles: "Deltoïdes complets", sets: 3, reps: "10+10", work: 45, rest: 25, desc: "10 élévations frontales puis 10 latérales sans pause. Élastique ou poids léger." },
        { name: "Planche avec touchers d'épaules", muscles: "Core, Stabilité", sets: 3, reps: "20", work: 40, rest: 25, desc: "En planche haute, touche alternativement chaque épaule. Hanches stables." },
        { name: "Dragon flag partiel", muscles: "Abdos profonds", sets: 3, reps: "6", work: 40, rest: 35, desc: "Allongé, tiens un support derrière la tête. Soulève les jambes et le bas du dos, descends lentement." },
      ]},
      { label: "Expert ⚡", exercises: [
        { name: "Handstand wall hold", muscles: "Deltoïdes, Core", sets: 3, reps: "20 sec", work: 20, rest: 40, desc: "Monté aux pieds contre le mur. Bras tendus, corps aligné. Tiens la position." },
        { name: "Pike push-up explosif", muscles: "Deltoïdes, Explosivité", sets: 3, reps: "8", work: 40, rest: 30, desc: "Descends lentement, remonte en explosant. Mains décollent du sol." },
        { name: "Planche dynamique", muscles: "Core complet", sets: 4, reps: "30 sec", work: 30, rest: 25, desc: "Alterne planche basse (avant-bras) et haute (mains tendues) sans poser les genoux." },
        { name: "L-sit sur chaises", muscles: "Abdos, Triceps, Core", sets: 3, reps: "10 sec", work: 10, rest: 40, desc: "Mains sur deux chaises, soulève les jambes tendues devant toi. Tiens." },
      ]},
    ],
  },
  5: {
    label: "Full Body & Mobilité", color: "#C77DFF", emoji: "✨",
    levels: [
      { label: "Débutant 🌱", exercises: [
        { name: "Squats + pompes murales", muscles: "Full body léger", sets: 3, reps: "10+10", work: 50, rest: 20, desc: "10 squats puis 10 pompes murales enchaînés. Rythme lent et contrôlé." },
        { name: "Hip flexor stretch", muscles: "Fléchisseurs, Mobilité", sets: 2, reps: "30 sec/côté", work: 30, rest: 15, desc: "En fente basse, genou arrière au sol. Pousse les hanches vers l'avant doucement." },
        { name: "Cat-Cow", muscles: "Colonne vertébrale, Mobilité", sets: 2, reps: "10", work: 40, rest: 15, desc: "À 4 pattes. Alterne dos arrondi et dos creusé, lentement en respirant." },
        { name: "Étirements full body", muscles: "Récupération globale", sets: 1, reps: "60 sec", work: 60, rest: 0, desc: "Étire chaque groupe musculaire 10 sec. Respiration profonde." },
      ]},
      { label: "Intermédiaire 💪", exercises: [
        { name: "Burpees", muscles: "Full body, Cardio", sets: 3, reps: "10", work: 45, rest: 15, desc: "Debout → accroupi → pompe → accroupi → saut. Enchaîne sans pause." },
        { name: "Squat jump", muscles: "Jambes, Cardio", sets: 3, reps: "12", work: 40, rest: 20, desc: "Descends en squat puis explose vers le haut. Atterris doucement en squat." },
        { name: "Hip flexor stretch dynamique", muscles: "Fléchisseurs, Mobilité", sets: 2, reps: "10/côté", work: 35, rest: 15, desc: "Fente basse avec rotation du buste vers le genou avant. Alterne." },
        { name: "Étirements full body", muscles: "Récupération globale", sets: 1, reps: "60 sec", work: 60, rest: 0, desc: "Étire chaque groupe musculaire. Respiration profonde." },
      ]},
      { label: "Avancé 🔥", exercises: [
        { name: "Burpees avec pompe", muscles: "Full body, Force + Cardio", sets: 4, reps: "10", work: 50, rest: 15, desc: "Comme les burpees mais avec une vraie pompe en bas. Qualité avant rapidité." },
        { name: "Thrusters élastique", muscles: "Jambes, Épaules, Full body", sets: 3, reps: "12", work: 45, rest: 20, desc: "Squat avec élastique, en remontant pousse les bras vers le haut. Mouvement continu." },
        { name: "Bear crawl", muscles: "Core, Épaules, Coordination", sets: 3, reps: "20 sec", work: 20, rest: 25, desc: "À 4 pattes, genoux décollés du sol. Avance en coordonnant bras et jambes opposés." },
        { name: "Étirements + respiration", muscles: "Récupération, Système nerveux", sets: 1, reps: "90 sec", work: 90, rest: 0, desc: "Étirements lents avec 4 sec inspire, 4 sec expire." },
      ]},
      { label: "Expert ⚡", exercises: [
        { name: "Burpees saut groupé", muscles: "Full body explosif", sets: 4, reps: "10", work: 50, rest: 20, desc: "Burpee classique + saut en ramenant les genoux à la poitrine." },
        { name: "Man maker élastique", muscles: "Full body, Force", sets: 3, reps: "8", work: 50, rest: 25, desc: "Pompe → rowing gauche → rowing droit → squat thrust → debout. Un seul mouvement." },
        { name: "Sprint sur place", muscles: "Cardio, Coordination", sets: 5, reps: "15 sec", work: 15, rest: 20, desc: "Course sur place à vitesse maximale, genoux hauts. 5 intervalles." },
        { name: "Cohérence cardiaque", muscles: "Récupération totale", sets: 1, reps: "2 min", work: 120, rest: 0, desc: "5 sec inspire par le nez, 5 sec expire par la bouche. Laisse le rythme cardiaque descendre." },
      ]},
    ],
  },
};

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function getTodayIndex() {
  const d = new Date().getDay();
  if (d === 0 || d === 6) return 0;
  return d - 1;
}
function toKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function getStreak(completedDays) {
  if (!completedDays.length) return 0;
  let streak = 0, check = new Date();
  if (!completedDays.includes(toKey(new Date()))) check.setDate(check.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    if (completedDays.includes(toKey(check))) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── PIN LOCK ──────────────────────────────────────────────────────────────────
const SECRET_PIN = "1629"; // ← Ton code admin (change sur GitHub)
const GUEST_PIN = "2026";  // ← Code invité (change sur GitHub)

function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function press(digit) {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === SECRET_PIN) {
        setTimeout(() => onUnlock("admin"), 200);
      } else if (next === GUEST_PIN) {
        setTimeout(() => onUnlock("guest"), 200);
      } else {
        setTimeout(() => { setPin(""); setError(true); }, 400);
      }
    }
  }

  function del() { setPin(p => p.slice(0, -1)); setError(false); }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ fontSize: 44, marginBottom: 16 }}>💪</div>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Mon Coach</div>
      <div style={{ fontSize: 13, color: "#444", marginBottom: 40 }}>Entre ton code pour accéder</div>

      {/* Points */}
      <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: i < pin.length ? (error ? "#ff4444" : "#FF6B35") : "#222", transition: "background 0.15s" }}/>
        ))}
      </div>

      {error && <div style={{ fontSize: 12, color: "#ff4444", marginBottom: 20, marginTop: -30 }}>Code incorrect</div>}

      {/* Clavier */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 280 }}>
        {[1,2,3,4,5,6,7,8,9].map(d => (
          <button key={d} onClick={() => press(String(d))} style={{ aspectRatio: "1", borderRadius: 16, border: "none", background: "#141414", color: "#fff", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 24, cursor: "pointer", transition: "background 0.1s" }}
            onMouseDown={e => e.currentTarget.style.background = "#222"}
            onMouseUp={e => e.currentTarget.style.background = "#141414"}
          >{d}</button>
        ))}
        <div/>
        <button onClick={() => press("0")} style={{ aspectRatio: "1", borderRadius: 16, border: "none", background: "#141414", color: "#fff", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 24, cursor: "pointer" }}>0</button>
        <button onClick={del} style={{ aspectRatio: "1", borderRadius: 16, border: "none", background: "#141414", color: "#fff", fontSize: 20, cursor: "pointer" }}>⌫</button>
      </div>
    </div>
  );
}


function LevelSelector({ level, color, onChange }) {
  const icons = ["🌱","💪","🔥","⚡"];
  const labels = ["Débutant","Intermédiaire","Avancé","Expert"];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[0,1,2,3].map(l => (
        <button key={l} onClick={() => onChange(l)} style={{
          flex: 1, padding: "7px 4px", borderRadius: 10, border: "none",
          background: l === level ? color : "#1a1a1a",
          color: l === level ? "#000" : "#444",
          fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 10,
          cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          transition: "all 0.2s",
        }}>
          <span style={{ fontSize: 14 }}>{icons[l]}</span>
          <span>{labels[l]}</span>
        </button>
      ))}
    </div>
  );
}

// ── EDIT FIELD ────────────────────────────────────────────────────────────────
function NumField({ label, value, onChange, min = 1, max = 999, unit = "" }) {
  return (
    <div style={{ background: "#0a0a0a", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>{label}</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>{value}{unit}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onChange(Math.max(min, value - 1))} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 18, cursor: "pointer" }}>−</button>
        <button onClick={() => onChange(Math.min(max, value + 1))} style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 18, cursor: "pointer" }}>+</button>
      </div>
    </div>
  );
}

// ── EDIT EXERCISE SCREEN ──────────────────────────────────────────────────────
function EditExScreen({ program, dayIdx, lvl, exIdx, onSave, onBack }) {
  const ex = program[dayIdx + 1].levels[lvl].exercises[exIdx];
  const day = program[dayIdx + 1];
  const [name, setName] = useState(ex.name);
  const [sets, setSets] = useState(ex.sets);
  const [reps, setReps] = useState(parseInt(ex.reps) || 10);
  const [work, setWork] = useState(ex.work);
  const [rest, setRest] = useState(ex.rest);

  function save() {
    const updated = JSON.parse(JSON.stringify(program));
    updated[dayIdx + 1].levels[lvl].exercises[exIdx] = { ...ex, name, sets, reps: String(reps), work, rest };
    onSave(updated);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif", maxWidth: 420, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ padding: "28px 24px 0" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, marginBottom: 16 }}>← Retour</button>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#444", textTransform: "uppercase", fontFamily: "Syne, sans-serif" }}>Modifier l'exercice</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, marginTop: 4 }}>{ex.name}</div>
        <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{day.levels[lvl].label} · {day.label}</div>
      </div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "#0a0a0a", border: "1px solid #222", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>Nom de l'exercice</div>
          <input value={name} onChange={e => setName(e.target.value)} style={{ background: "none", border: "none", color: "#fff", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, width: "100%", outline: "none" }}/>
        </div>
        <NumField label="Séries" value={sets} onChange={setSets} min={1} max={10}/>
        <NumField label="Répétitions" value={reps} onChange={setReps} min={1} max={100}/>
        <NumField label="Temps de travail" value={work} onChange={setWork} min={5} max={300} unit="s"/>
        <NumField label="Temps de repos" value={rest} onChange={setRest} min={0} max={300} unit="s"/>
        <button onClick={save} style={{ marginTop: 8, background: day.color, color: "#000", border: "none", borderRadius: 12, padding: "14px", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Enregistrer ✓
        </button>
      </div>
    </div>
  );
}

// ── CALENDAR ──────────────────────────────────────────────────────────────────
function Calendar({ completedDays }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const todayKey = toKey(today);
  const streak = getStreak(completedDays);
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{ background: "#141414", borderRadius: 16, padding: "16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 36 }}>🔥</div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#FF6B35", lineHeight: 1 }}>{streak}</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>jour{streak > 1 ? "s" : ""} de suite</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff" }}>{completedDays.length}</div>
          <div style={{ fontSize: 12, color: "#555" }}>séances total</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: "#1a1a1a", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16 }}>‹</button>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15 }}>{MONTHS[month]} {year}</div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: "#1a1a1a", border: "none", color: "#fff", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {["L","M","M","J","V","S","D"].map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 11, color: "#444", fontFamily: "Syne, sans-serif", fontWeight: 700, padding: "4px 0" }}>{d}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`}/>;
          const dateKey = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isDone = completedDays.includes(dateKey);
          const isToday = dateKey === todayKey;
          const isFuture = dateKey > todayKey;
          return (
            <div key={dateKey} style={{ aspectRatio: "1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, background: isDone ? "#FF6B35" : isToday ? "#222" : "transparent", color: isDone ? "#000" : isToday ? "#fff" : isFuture ? "#2a2a2a" : "#555", border: isToday && !isDone ? "1px solid #444" : "none", position: "relative" }}>
              {d}{isDone && <span style={{ position: "absolute", top: 2, right: 3, fontSize: 8 }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function Timer({ seconds, label, color, onDone, isRest, audioCtx }) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef();
  const doneRef = useRef(false);
  useEffect(() => { setLeft(seconds); doneRef.current = false; }, [seconds]);
  useEffect(() => {
    if (doneRef.current) return;
    if (left === 3 || left === 2 || left === 1) isRest ? playRestCountdown(audioCtx) : playWorkCountdown(audioCtx);
    if (left <= 0) {
      if (!doneRef.current) { doneRef.current = true; isRest ? playRestEnd(audioCtx) : playWorkEnd(audioCtx); setTimeout(() => onDone && onDone(), 400); }
      return;
    }
    ref.current = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(ref.current);
  }, [left]);
  const pct = ((seconds - left) / seconds) * 100;
  const isUrgent = left <= 3 && left > 0;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, fontFamily: "Syne, sans-serif", letterSpacing: 3, color: "#555", marginBottom: 8, textTransform: "uppercase" }}>{label}</div>
      <div style={{ position: "relative", width: 130, height: 130, margin: "0 auto" }}>
        <svg width="130" height="130" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="65" cy="65" r="56" fill="none" stroke="#1a1a1a" strokeWidth="9"/>
          <circle cx="65" cy="65" r="56" fill="none" stroke={color} strokeWidth="9" strokeDasharray={`${2 * Math.PI * 56}`} strokeDashoffset={`${2 * Math.PI * 56 * (1 - pct / 100)}`} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.9s linear" }}/>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Syne, sans-serif", fontSize: isUrgent ? 40 : 34, fontWeight: 800, color: isUrgent && !isRest ? color : "#fff", transform: isUrgent ? "scale(1.08)" : "scale(1)", transition: "transform 0.1s, color 0.2s" }}>{left}</div>
      </div>
    </div>
  );
}

// ── NAVBAR ────────────────────────────────────────────────────────────────────
function NavBar({ screen, setScreen, isAdmin }) {
  const tabs = [
    ["home","🏠","Accueil"],
    ["calendar","📅","Calendrier"],
    ...(isAdmin ? [["edit","✏️","Modifier"]] : []),
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#111", borderTop: "1px solid #1a1a1a", display: "flex", justifyContent: "space-around", padding: "12px 0 20px" }}>
      {tabs.map(([id, icon, label]) => (
        <button key={id} onClick={() => setScreen(id)} style={{ background: "none", border: "none", color: screen === id ? "#fff" : "#444", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, fontSize: 10, fontFamily: "Syne, sans-serif", fontWeight: 700 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>{label}
        </button>
      ))}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function FitnessApp() {
  const [unlocked, setUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [screen, setScreen] = useState("home");
  const [dayIndex, setDayIndex] = useState(getTodayIndex());
  const [exIndex, setExIndex] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [setNum, setSetNum] = useState(1);
  const [completedDays, setCompletedDays] = useState([]);
  const [levels, setLevels] = useState({ 1:0, 2:0, 3:0, 4:0, 5:0 }); // niveau manuel par jour
  const [program, setProgram] = useState(PROGRESSIVE_PROGRAM);
  const [editDay, setEditDay] = useState(0);
  const [editEx, setEditEx] = useState(0);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    load("completed-days", []).then(setCompletedDays);
    load("manual-levels", { 1:0, 2:0, 3:0, 4:0, 5:0 }).then(setLevels);
    load("custom-program", null).then(p => { if (p) setProgram(p); });
  }, []);

  function ensureAudio() {
    if (!audioCtxRef.current) audioCtxRef.current = createAudioCtx();
    else if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  }

  const dayKey = dayIndex + 1;
  const level = levels[dayKey] || 0;
  const dayData = program[dayKey];
  const currentExercises = dayData.levels[level].exercises;
  const ex = exIndex !== null ? currentExercises[exIndex] : null;

  async function changeLevel(dayK, newLevel) {
    const updated = { ...levels, [dayK]: newLevel };
    setLevels(updated);
    await save("manual-levels", updated);
  }

  function getNext() {
    if (!ex) return null;
    if (setNum < ex.sets) return { name: ex.name, reps: ex.reps };
    if (exIndex + 1 < currentExercises.length) return { name: currentExercises[exIndex + 1].name, reps: currentExercises[exIndex + 1].reps };
    return null;
  }

  function handleWorkDone() { ex.rest > 0 ? setPhase("rest") : advanceSet(); }
  function advanceSet() {
    if (setNum < ex.sets) { setSetNum(s => s + 1); setPhase("work"); }
    else setPhase("done");
  }
  function startExercise(i) { ensureAudio(); setExIndex(i); setSetNum(1); setPhase("work"); }
  function nextExercise() {
    const next = exIndex + 1;
    if (next < currentExercises.length) startExercise(next);
    else finishWorkout();
  }
  async function finishWorkout() {
    const todayKey = toKey(new Date());
    const updatedDays = completedDays.includes(todayKey) ? completedDays : [...completedDays, todayKey];
    setCompletedDays(updatedDays);
    await save("completed-days", updatedDays);
    setExIndex(null); setPhase("idle"); setSetNum(1);
    setScreen("calendar");
  }
  function backToList() { setExIndex(null); setPhase("idle"); setSetNum(1); }
  const next = getNext();
  const todayKey = toKey(new Date());
  const streak = getStreak(completedDays);
  const alreadyDoneToday = completedDays.includes(todayKey);

  if (!unlocked) return <PinScreen onUnlock={(role) => { setUnlocked(true); setIsAdmin(role === "admin"); }} />;

  // ── EDIT EXERCISE ──
  if (screen === "editExercise") return (
    <EditExScreen
      program={program}
      dayIdx={editDay}
      lvl={levels[editDay + 1] || 0}
      exIdx={editEx}
      onSave={async (updated) => { setProgram(updated); await save("custom-program", updated); setScreen("edit"); }}
      onBack={() => setScreen("edit")}
    />
  );

  // ── WORKOUT ──
  if (screen === "workout") return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif", maxWidth: 420, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ padding: "28px 24px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#444", textTransform: "uppercase", fontFamily: "Syne, sans-serif" }}>Jour {dayKey} — {dayData.label}</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, marginTop: 4 }}>{ex ? ex.name : ""}</div>
      </div>
      <div style={{ padding: "16px 24px" }}>
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => { backToList(); setScreen("home"); }} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13 }}>← Retour</button>
        </div>
        {ex && <>
          <div style={{ background: "#111", borderRadius: 20, padding: "16px", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#555", textAlign: "center", lineHeight: 1.6 }}>{ex.desc}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            {Array.from({ length: ex.sets }).map((_, i) => <div key={i} style={{ width: 28, height: 5, borderRadius: 3, background: i < setNum ? dayData.color : "#222", transition: "background 0.3s" }}/>)}
          </div>
          <div style={{ textAlign: "center", fontSize: 12, color: "#555", marginBottom: 20 }}>Série {setNum} / {ex.sets}</div>
          {phase === "work" && <div>
            <Timer key={`work-${setNum}-${exIndex}`} seconds={ex.work} label="⚡ Travail" color={dayData.color} onDone={handleWorkDone} isRest={false} audioCtx={audioCtxRef.current}/>
            <div style={{ textAlign: "center", marginTop: 14, color: "#555", fontSize: 13 }}>Objectif : <strong style={{ color: "#fff" }}>{ex.reps} reps</strong></div>
          </div>}
          {phase === "rest" && <div>
            <Timer key={`rest-${setNum}-${exIndex}`} seconds={ex.rest} label="💤 Repos" color="#3a3a3a" onDone={advanceSet} isRest={true} audioCtx={audioCtxRef.current}/>
            {next ? (
              <div style={{ marginTop: 18, background: "#141414", borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{setNum < ex.sets ? "Série suivante" : "Exercice suivant"}</div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "#fff" }}>{next.name}</div>
                <div style={{ color: dayData.color, fontSize: 14, marginTop: 5, fontWeight: 700 }}>{next.reps} reps</div>
              </div>
            ) : <div style={{ textAlign: "center", marginTop: 14, color: "#555", fontSize: 13 }}>Dernier effort 💪</div>}
          </div>}
          {phase === "done" && <div style={{ textAlign: "center", paddingTop: 8 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Exercice terminé !</div>
            <div style={{ color: "#555", fontSize: 13, marginBottom: 20 }}>{exIndex + 1 < currentExercises.length ? `Prochain : ${currentExercises[exIndex + 1].name}` : "C'était le dernier 💪"}</div>
            <button onClick={exIndex + 1 < currentExercises.length ? nextExercise : finishWorkout} style={{ background: dayData.color, color: "#000", border: "none", borderRadius: 12, padding: "13px 28px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" }}>
              {exIndex + 1 < currentExercises.length ? "Exercice suivant →" : "Terminer la séance 🏆"}
            </button>
          </div>}
        </>}
      </div>
    </div>
  );

  // ── EDIT LIST ──
  if (screen === "edit") return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif", maxWidth: 420, margin: "0 auto", paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ padding: "36px 24px 16px" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#444", textTransform: "uppercase", fontFamily: "Syne, sans-serif" }}>Personnaliser</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 800, marginTop: 4 }}>Mes exercices</div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "0 24px 16px", overflowX: "auto" }}>
        {DAY_NAMES.map((d, i) => (
          <button key={i} onClick={() => setEditDay(i)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 20, border: "none", background: i === editDay ? program[i + 1].color : "#1a1a1a", color: i === editDay ? "#000" : "#555", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{d}</button>
        ))}
      </div>
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, color: "#444", marginBottom: 2 }}>
          {program[editDay + 1].emoji} {program[editDay + 1].label} — {program[editDay + 1].levels[levels[editDay + 1] || 0].label}
        </div>
        {program[editDay + 1].levels[levels[editDay + 1] || 0].exercises.map((exo, i) => (
          <button key={i} onClick={() => { setEditEx(i); setScreen("editExercise"); }} style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "14px 16px", textAlign: "left", cursor: "pointer", color: "#fff", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = program[editDay + 1].color}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#222"}
          >
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14 }}>{exo.name}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{exo.sets} séries · {exo.reps} reps · {exo.work}s</div>
            </div>
            <span style={{ color: "#444", fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
      <NavBar screen={screen} setScreen={setScreen} isAdmin={isAdmin} />
    </div>
  );

  // ── CALENDAR ──
  if (screen === "calendar") return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif", maxWidth: 420, margin: "0 auto", paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ padding: "36px 24px 20px" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#444", textTransform: "uppercase", fontFamily: "Syne, sans-serif" }}>Suivi</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 800, marginTop: 4 }}>Mes séances</div>
      </div>
      <Calendar completedDays={completedDays} />
      <NavBar screen={screen} setScreen={setScreen} isAdmin={isAdmin} />
    </div>
  );

  // ── HOME ──
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'DM Sans', sans-serif", maxWidth: 420, margin: "0 auto", paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { display: none; }`}</style>
      <div style={{ padding: "36px 24px 0" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#444", textTransform: "uppercase", fontFamily: "Syne, sans-serif" }}>Bonjour 👋</div>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 800, marginTop: 4 }}>Mon Coach</div>
      </div>

      {/* Streak */}
      <div style={{ margin: "20px 24px 0", background: "#141414", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>🔥</div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: "#FF6B35" }}>{streak} jour{streak > 1 ? "s" : ""} de suite</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{alreadyDoneToday ? "Séance du jour validée ✓" : "Séance du jour à faire"}</div>
        </div>
      </div>

      {/* Day selector */}
      <div style={{ display: "flex", gap: 8, padding: "16px 24px 0", overflowX: "auto" }}>
        {DAY_NAMES.map((d, i) => (
          <button key={i} onClick={() => setDayIndex(i)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 20, border: "none", background: i === dayIndex ? dayData.color : "#1a1a1a", color: i === dayIndex ? "#000" : "#555", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{d}</button>
        ))}
      </div>

      {/* Level selector */}
      <div style={{ padding: "14px 24px 0" }}>
        <div style={{ fontSize: 11, color: "#444", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Niveau de difficulté</div>
        <LevelSelector level={level} color={dayData.color} onChange={(l) => changeLevel(dayKey, l)} />
        <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>{dayData.levels[level].label}</div>
      </div>

      {/* Exercise list */}
      <div style={{ padding: "14px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, color: "#444", marginBottom: 2 }}>{dayData.emoji} {dayData.label} · {currentExercises.length} exercices</div>
        {currentExercises.map((exo, i) => (
          <button key={i} onClick={() => { setScreen("workout"); startExercise(i); }} style={{ background: "#111", border: "1px solid #222", borderRadius: 14, padding: "14px 16px", textAlign: "left", cursor: "pointer", color: "#fff", width: "100%" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = dayData.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#222"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14 }}>{exo.name}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{exo.muscles}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: dayData.color, fontSize: 13 }}>{exo.sets}×{exo.reps}</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>{exo.work}s</div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <NavBar screen={screen} setScreen={setScreen} isAdmin={isAdmin} />
    </div>
  );
}

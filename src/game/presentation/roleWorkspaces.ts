import Phaser from "phaser";
import { placeholder } from "../../assets/placeholders";
import { workspaceSprite as sprite } from "../../assets/workspaceSprites";
import type { Role } from "../state/contracts";
import { prefersReducedMotion } from "../../app/options";
import { devil, label } from "./art";
import {
  AGENT_LAYOUT,
  ARCHIVE_LAYOUT,
  DISPATCH_LAYOUT,
} from "./workspaceLayout";
import { TOKENS } from "../../ui/tokens";

const C = TOKENS.color;

function heading(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string = C.text,
): void {
  label(scene, x, y, text, 23, color).setFontFamily("Georgia, serif");
}

function agentDesk(scene: Phaser.Scene, live: boolean): void {
  placeholder(scene, "paper-sheet", 76, 195, 170, 210).setAngle(-6);
  label(
    scene,
    94,
    226,
    "NETT ZUHÖREN.\nSCHARF FRAGEN.\nRICHTIG SCHICKEN.",
    19,
    C.ink,
    140,
  );
  const operator = scene.add
    .image(290, 466, "agent-operator")
    .setDisplaySize(430, 477)
    .setName("agent-operator");
  if (!prefersReducedMotion())
    scene.tweens.add({
      targets: operator,
      y: 460,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  placeholder(scene, "telephone", 160, 627, 320, 180);
  sprite(scene, "control-housing", 95, 758, 395, 224);
  sprite(scene, "control-housing", 119, 775, 346, 72).setTint(0xe38d6f);
  sprite(scene, "control-housing", 119, 857, 346, 62);
  if (!live) {
    label(scene, 151, 795, "☎ ANNEHMEN (A)", 27);
    label(scene, 135, 870, "↯ UNTERBRECHEN (I)", 22);
    label(scene, 130, 943, "STIMMUNG  —", 21, "#ffc69c");
  }
  sprite(scene, "iron-frame", 501, 180, 889, 247);
  sprite(scene, "cyan-monitor", 525, 199, 841, 207);
  heading(scene, 551, 216, "EINGEHENDER ANRUF / SEELENKANAL", "#91eafa");
  if (!live) {
    scene.add.image(648, 321, "agent-caller").setDisplaySize(138, 148);
    label(scene, 746, 276, "Noch kein Anruf", 35);
    label(scene, 746, 334, "FALL  —", 19, "#91eafa");
  }
  sprite(scene, "dossier-paper", 525, 438, 841, 144);
  heading(scene, 548, 451, "ANRUFER", C.ink);
  if (!live) label(scene, 548, 489, "Leitung frei.", 25, C.ink, 790);
  for (let i = 0; i < 5; i++) {
    const box = AGENT_LAYOUT.choice(i);
    if (!live) {
      sprite(scene, "paper-card", box.x, box.y, box.w, box.h);
      label(scene, box.x + 18, box.y + 16, String(i + 1), 25, C.ink);
      label(
        scene,
        box.x + 60,
        box.y + 18,
        "Antwort verfügbar nach Anrufannahme",
        23,
        C.ink,
      );
    }
  }
  sprite(scene, "iron-frame", 527, 933, 835, 75);
  sprite(scene, "paper-card", 543, 944, 581, 52);
  sprite(scene, "control-housing", 1135, 944, 207, 52);
  if (!live) {
    label(scene, 558, 956, "→ Zielbitte: —", 23, C.ink);
    label(scene, 1151, 957, "BITTE SENDEN", 22);
  }
  sprite(scene, "iron-frame", 1402, 193, 394, 641);
  sprite(scene, "dossier-paper", 1416, 207, 367, 610);
  sprite(scene, "clipboard-clip", 1524, 173, 150, 61);
  heading(scene, 1436, 255, "ÖFFENTLICHE HINWEISE", C.ink);
  for (let i = 0; i < 3; i++) {
    const box = AGENT_LAYOUT.hint(i);
    sprite(scene, "hint-slip", box.x, box.y, box.w, box.h);
    if (!live) label(scene, 1450, box.y + 25, `◇ HINWEIS ${i + 1}`, 24, C.ink);
  }
  if (!live) {
    label(scene, 1450, 686, "Entdeckt: —", 21, C.ink);
    label(scene, 1450, 758, "◇ Freigabe: Ziel fehlt", 21, C.ink);
  }
  sprite(scene, "iron-frame", 1402, 856, 394, 152);
  heading(scene, 1427, 878, "LEITUNGSDRUCK");
  if (!live) label(scene, 1428, 924, "◇ Ruhig", 24);
}

function archiveDesk(scene: Phaser.Scene, live: boolean): void {
  placeholder(scene, "filing-cabinet", 95, 194, 427, 630);
  sprite(scene, "iron-frame", 109, 194, 390, 620);
  heading(scene, 130, 220, "ARCHIVSUCHE");
  sprite(scene, "paper-card", 124, 270, 360, 70);
  if (!live) label(scene, 140, 289, "Akten durchsuchen …", 22, C.ink);
  if (!live)
    for (let i = 0; i < 3; i++) {
      const box = ARCHIVE_LAYOUT.result(i);
      sprite(scene, "paper-card", box.x, box.y, box.w, box.h);
      label(
        scene,
        136,
        box.y + 22,
        i === 0 ? "Keine Akte geöffnet" : "—",
        20,
        C.ink,
      );
    }
  sprite(scene, "dossier-paper", 530, 194, 690, 620);
  sprite(scene, "clipboard-clip", 555, 170, 130, 53).setAngle(-4);
  heading(scene, 575, 241, "HÖLLEN-HOTLINE / SEELEN-DOSSIER", C.ink);
  if (!live) {
    label(scene, 575, 305, "Keine Akte geöffnet", 29, C.ink);
    label(scene, 575, 386, "Alias · Beruf · Ereignis", 23, C.ink);
    label(scene, 575, 490, "Beschwerde · Unstimmigkeiten", 23, C.ink);
  }
  sprite(scene, "book-spread", 1240, 210, 555, 604);
  heading(scene, 1280, 250, "REGELWERK", C.ink);
  for (let i = 0; i < 4; i++) {
    const box = ARCHIVE_LAYOUT.tab(i);
    sprite(scene, "book-tab", box.x, box.y, box.w, box.h);
    label(
      scene,
      box.x + 11,
      box.y + 8,
      ["AKTE", "REGELN", "AUSN.", "NOTIZ"][i]!,
      16,
      C.ink,
    );
  }
  if (!live)
    label(scene, 1280, 370, "Noch keine Schicht begonnen.", 22, C.ink, 465);
  sprite(scene, "iron-frame", 109, 835, 390, 169);
  heading(scene, 130, 854, "ÖFFENTLICHE PINS");
  if (!live) {
    label(scene, 130, 897, "◇ PIN 1: frei", 20);
    label(scene, 130, 940, "◇ PIN 2: frei", 20);
  }
  for (let i = 0; i < 3; i++) {
    const box = ARCHIVE_LAYOUT.stamp(i);
    sprite(scene, "stamp-base", box.x, box.y, box.w, box.h);
    sprite(scene, "stamp-cap", box.x + 57, box.y + 16, 90, 45).setTint(
      [C.success, C.warning, C.error][i]!,
    );
    if (!live)
      label(
        scene,
        box.x + 12,
        945,
        ["✓ VERIFIZIERT", "? FRAGWÜRDIG", "× NICHT FREIGEBEN"][i]!,
        18,
      );
  }
  sprite(scene, "iron-frame", 1240, 835, 555, 169);
  heading(scene, 1270, 858, "ARCHIV-FREIGABE");
  if (!live) label(scene, 1270, 926, "◇ FREIGABE OFFEN", 22);
}

function dispatcherDesk(scene: Phaser.Scene, live: boolean): void {
  devil(scene, 285, 254, 0.52, 0xa64131).setName("dispatcher-worker");
  placeholder(scene, "telephone", 109, 299, 250, 90);
  heading(scene, 457, 260, "DISPOSITION / ÜBERGABE-PARAMETER");
  sprite(scene, "iron-frame", 96, 348, 971, 505);
  if (!live)
    for (let i = 0; i < 6; i++) {
      const box = DISPATCH_LAYOUT.control(i);
      sprite(scene, "control-housing", box.x, box.y, box.w, box.h);
      heading(scene, box.x + 17, box.y + 17, `REGLER ${i + 1}`);
      sprite(scene, "dial-face", box.x + 78, box.y + 53, 140, 140);
      sprite(scene, "dial-pointer", box.x + 78, box.y + 53, 140, 140);
    }
  sprite(scene, "dossier-paper", 1090, 194, 411, 642);
  sprite(scene, "clipboard-clip", 1220, 170, 150, 61);
  if (!live) {
    heading(scene, 1120, 245, "ZIELANFORDERUNGEN", C.ink);
    label(
      scene,
      1120,
      304,
      "Ziel wählen, Anforderungen prüfen,\nAnlage einstellen.",
      22,
      C.ink,
      340,
    );
  }
  sprite(scene, "iron-frame", 1512, 180, 328, 523);
  heading(scene, 1543, 201, "ZIELAUSWAHL");
  if (!live)
    for (let i = 0; i < 12; i++) {
      const box = DISPATCH_LAYOUT.target(i);
      sprite(scene, "paper-card", box.x, box.y, box.w, box.h);
      label(
        scene,
        box.x + 22,
        box.y + 8,
        [
          "ZORN",
          "LUST",
          "VÖLLEREI",
          "HABGIER",
          "NEID",
          "TRÄGHEIT",
          "HOCHMUT",
          "LIMBUS",
          "FEGEFEUER",
          "ARCHIV",
          "RÜCKLAUF",
          "QUARANTÄNE",
        ][i]!,
        19,
        C.ink,
      );
    }
  sprite(scene, "iron-frame", 96, 870, 971, 134);
  heading(scene, 120, 886, "SYSTEMSTATUS / REPARATUR");
  placeholder(scene, "warning-light", 1010, 850, 54, 68)
    .setName("dispatcher-warning-light")
    .setVisible(false);
  sprite(scene, "control-housing", 1090, 852, 411, 72);
  sprite(scene, "control-housing", 1090, 939, 411, 65);
  if (!live) {
    label(scene, 120, 932, "✓ Keine aktive Störung", 21);
    label(scene, 1115, 874, "ANLAGE VORBEREITEN", 22);
    label(scene, 1115, 956, "BEREIT MELDEN", 22);
  }
  sprite(scene, "lever-housing", 1512, 721, 328, 283);
  if (!live) {
    label(scene, 1540, 744, "ZIEL: — · OFFEN", 19, C.text, 270);
    label(scene, 1540, 792, "↗ HEBEL GESPERRT", 25, C.text, 250);
    placeholder(scene, "lever-arm", 1626, 815, 80, 150);
    label(scene, 1540, 969, "SCHUTZBÜGEL: ZU", 17);
  }
}

export function roleWorkspace(
  scene: Phaser.Scene,
  role: Role,
  live: boolean,
): void {
  if (role === "agent") agentDesk(scene, live);
  if (role === "archivist") archiveDesk(scene, live);
  if (role === "dispatcher") dispatcherDesk(scene, live);
}

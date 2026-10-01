import Phaser from "phaser";
import { workspaceSprite as sprite } from "../../assets/workspaceSprites";
import { roleSprite as prop } from "../../assets/roleSprites";
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
  scene.add.image(0, 0, "agent-frame").setOrigin(0);
  prop(scene, "paper_note", 20, 185, 150, 215).setAngle(-6).setDepth(1);
  label(
    scene,
    43,
    218,
    "NETT ZUHÖREN.\nSCHARF FRAGEN.\nRICHTIG SCHICKEN.",
    17,
    C.ink,
    112,
  ).setDepth(1);
  const operator = scene.add
    .image(257, 369, "agent-operator")
    .setDisplaySize(470, 515)
    .setName("agent-operator");
  if (!prefersReducedMotion())
    scene.tweens.add({
      targets: operator,
      y: 364,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  scene.add
    .image(20, 545, "agent-call-console")
    .setOrigin(0)
    .setDisplaySize(480, 355)
    .setName("agent-call-console");
  scene.add
    .image(-2, 753, "agent-coffee-mug")
    .setOrigin(0)
    .setDisplaySize(135, 136)
    .setName("agent-coffee-mug");
  if (!live) {
    label(scene, 228, 663, "ANNEHMEN", 27, "#21100e").setAngle(-5);
    label(scene, 220, 746, "UNTERBRECHEN", 20, C.ink).setAngle(-5);
    label(scene, 255, 826, "ABKLINGZEIT  --:--", 15, C.text).setAngle(-5);
  }
  scene.add
    .image(501, 169, "agent-call-monitor")
    .setOrigin(0)
    .setDisplaySize(889, 253)
    .setName("agent-call-monitor");
  heading(scene, 548, 205, "EINGEHENDER ANRUF …", "#91eafa");
  prop(scene, "cyan_neon_frame", 546, 241, 188, 153);
  scene.add
    .graphics()
    .lineStyle(2, 0x34727c, 0.8)
    .lineBetween(1134, 241, 1134, 389);
  label(scene, 1152, 249, "STIMMUNG", 17, "#91eafa");
  if (!live) {
    prop(scene, "caller_ghost", 573, 244, 138, 145);
    prop(scene, "ring_energy", 695, 328, 42, 30);
    label(scene, 746, 251, "Noch kein Anruf", 32, "#91eafa");
    label(scene, 746, 296, "FALL-ID  —", 19, "#91eafa");
    label(scene, 746, 323, "BERUF  —", 18, "#91eafa");
    label(scene, 746, 349, "EREIGNIS  —", 17, "#91eafa");
    label(scene, 1155, 306, "—", 30, "#91eafa");
  }
  sprite(scene, "dossier-paper", 525, 429, 841, 148);
  heading(scene, 548, 442, "ANRUFER:", C.ink);
  if (!live) label(scene, 675, 451, "Leitung frei.", 25, C.ink, 660);
  label(scene, 548, 542, "DU:", 21, C.ink);
  sprite(scene, "cyan-monitor", 607, 535, 742, 32).setAlpha(0.6);
  for (let i = 0; i < 5; i++) {
    const box = AGENT_LAYOUT.choice(i);
    if (!live) {
      sprite(scene, "paper-card", box.x, box.y, box.w, box.h);
      scene.add
        .rectangle(box.x + 10, box.y + 6, 54, 52, 0x211a17)
        .setOrigin(0)
        .setStrokeStyle(2, 0x987459);
      label(scene, box.x + 24, box.y + 12, String(i + 1), 30, C.text);
      label(
        scene,
        box.x + 82,
        box.y + 13,
        "Antwort verfügbar nach Anrufannahme",
        22,
        C.ink,
      );
    }
  }
  sprite(scene, "iron-frame", 527, 938, 839, 112);
  label(scene, 548, 943, "PRIVATE HINWEISE", 18, C.text);
  for (let i = 0; i < 3; i++) {
    const box = AGENT_LAYOUT.privateHint(i);
    sprite(scene, "hint-slip", box.x, box.y, box.w, box.h);
  }
  if (!live) {
    label(scene, 560, 978, "Noch keine Hinweise", 19, C.ink);
  }
  scene.add
    .image(1402, 165, "agent-hints-clipboard")
    .setOrigin(0)
    .setDisplaySize(394, 639)
    .setName("agent-hints-clipboard");
  heading(scene, 1436, 244, "ÖFFENTLICHE HINWEISE", C.ink);
  label(scene, 1436, 275, "Slot anklicken · max. 3 für das Team", 16, C.ink);
  for (let i = 0; i < 3; i++) {
    const box = AGENT_LAYOUT.hint(i);
    sprite(scene, "hint-slip", box.x, box.y, box.w, box.h);
    scene.add
      .rectangle(box.x + 11, box.y + 14, 50, 64, 0x211a17)
      .setOrigin(0)
      .setStrokeStyle(2, 0x987459);
    label(scene, box.x + 27, box.y + 27, String(i + 1), 29, C.text);
    if (!live) label(scene, 1512, box.y + 25, `HINWEIS ${i + 1}`, 22, C.ink);
  }
  if (!live) {
    label(scene, 1450, 666, "Hinweis auswählen: —", 19, C.ink);
    label(scene, 1450, 744, "◇ Freigabe: Ziel fehlt", 21, C.ink);
  }
  sprite(scene, "iron-frame", 1402, 817, 394, 233);
  heading(scene, 1427, 839, "TEAM-STATUS");
  sprite(scene, "control-housing", 1595, 955, 184, 34);
  if (!live) {
    label(scene, 1428, 883, "ARCHIV  —", 20);
    label(scene, 1428, 913, "DISPOSITION  —", 20);
    label(scene, 1428, 943, "ZIELBITTE  —", 20);
    label(scene, 1610, 961, "BITTE SENDEN", 17);
    label(scene, 1428, 998, "FREIGABE  —", 20);
    label(scene, 1428, 1021, "LEITUNGSDRUCK  ◇ Ruhig", 17);
  }
}

function archiveDesk(scene: Phaser.Scene, live: boolean): void {
  scene.add.image(0, 0, "archivist-frame").setOrigin(0);
  prop(scene, "filing_cabinet", 0, 218, 95, 540);
  prop(scene, "case_file_stack", 6, 816, 215, 240);
  heading(scene, 172, 181, "ARCHIVSUCHE");
  heading(scene, 615, 170, "HÖLLEN-HOTLINE / ARCHIV", C.ink);
  heading(scene, 1242, 216, "REGELWERK", C.ink);
  heading(scene, 1243, 243, "TAGESKLAUSELN", C.ink);
  heading(scene, 1565, 216, "AUSNAHMEN", C.ink);
  heading(scene, 1565, 243, "& QUERVERWEISE", C.ink);
  for (const [text, x] of [
    ["ALLE", 155],
    ["NAMEN", 235],
    ["BERUFE", 327],
    ["TAGS", 414],
  ] as const) {
    sprite(scene, "book-tab", x, 285, x === 155 ? 76 : 82, 38);
    label(scene, x + 10, 293, text, 15, C.ink).setFontFamily("Georgia, serif");
  }
  if (!live)
    for (let i = 0; i < 4; i++) {
      const box = ARCHIVE_LAYOUT.result(i);
      sprite(scene, "paper-card", box.x, box.y, box.w, box.h);
      label(scene, box.x + 91, box.y + 22, i ? "—" : "Keine Akte", 20, C.ink);
    }
  for (const [index, title] of ["AKTE", "REGEL", "FÄLLE", "NOTIZ"].entries()) {
    const box = ARCHIVE_LAYOUT.tab(index);
    label(scene, box.x + 2, box.y + 18, title, 10, C.ink).setFontFamily(
      "Georgia, serif",
    );
  }
  for (let i = 0; i < 3; i++) {
    const box = ARCHIVE_LAYOUT.stamp(i);
    sprite(scene, "stamp-base", box.x, box.y, box.w, box.h);
    if (!live)
      label(
        scene,
        box.x + 16,
        953,
        ["VERIFIZIERT", "FRAGWÜRDIG", "NICHT FREIGEBEN"][i]!,
        17,
      );
  }
  prop(scene, "wax_seal_pin", 1320, 877, 52, 64);
  prop(scene, "wax_seal_pin", 1402, 877, 52, 64);
  scene.add
    .graphics()
    .fillStyle(0x6d4124)
    .fillRoundedRect(1722, 911, 84, 44, 8)
    .lineStyle(5, 0x130d0c)
    .strokeRoundedRect(1722, 911, 84, 44, 8)
    .lineStyle(14, 0x2b1b17)
    .lineBetween(1763, 924, 1785, 863)
    .fillStyle(0x9b251d)
    .fillCircle(1786, 857, 25)
    .lineStyle(5, 0x170e0d)
    .strokeCircle(1786, 857, 25);
  heading(scene, 1312, 835, "ÖFFENTLICHE PINS");
  heading(scene, 1617, 808, "ARCHIV-FREIGABE", C.ink);
  if (!live) {
    label(scene, 165, 779, "0 Treffer  ·  Seite 1", 19);
    label(scene, 615, 240, "Keine Akte geöffnet", 29, C.ink);
    label(scene, 615, 513, "Akte auswählen, Hinweise prüfen.", 23, C.ink);
    label(scene, 1250, 316, "Noch keine Schicht begonnen.", 20, C.ink);
    label(scene, 1300, 960, "0 / 2", 18);
    label(scene, 1610, 937, "◇ Ziel noch offen", 19);
  }
}

function dispatcherDesk(scene: Phaser.Scene, live: boolean): void {
  devil(scene, 277, 203, 0.82, 0xa64131).setName("dispatcher-worker");
  scene.add.image(0, 0, "dispatch-frame").setOrigin(0);
  prop(scene, "lever_bank", 132, 259, 198, 53);
  prop(scene, "receipt_roll", 461, 179, 32, 100);
  heading(scene, 405, 271, "ÜBERGABE-PARAMETER");
  if (!live)
    for (let i = 0; i < 6; i++) {
      const box = DISPATCH_LAYOUT.control(i);
      heading(scene, box.x + 17, box.y + 17, `REGLER ${i + 1}`);
      prop(scene, "analog_gauge", box.x + 83, box.y + 58, 130, 130);
    }
  if (!live) {
    heading(scene, 1140, 213, "ZIELANFORDERUNGEN", C.ink);
    label(
      scene,
      1140,
      270,
      "Ziel wählen, Anforderungen prüfen,\nAnlage einstellen.",
      22,
      C.ink,
      350,
    );
    heading(scene, 1140, 623, "AKTUELLE ÜBERGABE");
    label(scene, 1140, 676, "Noch kein Ziel gewählt.", 22, C.ink, 360);
  }
  heading(scene, 1608, 194, "ZIELAUSWAHL");
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
  heading(scene, 156, 896, "SYSTEMSTATUS / REPARATUR");
  prop(scene, "warning_beacon", 987, 885, 54, 60)
    .setName("dispatcher-warning-light")
    .setVisible(false);
  prop(scene, "red_push_button", 1409, 878, 57, 55);
  if (!live) {
    label(scene, 156, 981, "✓ Keine aktive Störung", 21);
    label(scene, 1140, 881, "ANLAGE VORBEREITEN", 20, C.ink);
    label(scene, 1140, 944, "BEREIT MELDEN", 20, C.ink);
  }
  if (!live) {
    label(scene, 1581, 727, "ZIEL: — · OFFEN", 18, C.ink, 240);
    label(scene, 1582, 782, "↗ HEBEL GESPERRT", 22, C.text, 240);
    prop(scene, "single_lever", 1656, 811, 80, 116);
    label(scene, 1585, 944, "SCHUTZBÜGEL: ZU", 17, C.ink);
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

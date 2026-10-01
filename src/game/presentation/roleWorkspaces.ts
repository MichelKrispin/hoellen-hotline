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
  prop(scene, "filing_cabinet", 12, 310, 100, 300);
  prop(scene, "case_file_stack", 20, 650, 78, 175);
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
  prop(scene, "paper_stack", 1157, 198, 50, 62);
  heading(scene, 575, 241, "HÖLLEN-HOTLINE / SEELEN-DOSSIER", C.ink);
  if (!live) {
    label(scene, 575, 305, "Keine Akte geöffnet", 29, C.ink);
    label(scene, 575, 386, "Alias · Beruf · Ereignis", 23, C.ink);
    label(scene, 575, 490, "Beschwerde · Unstimmigkeiten", 23, C.ink);
  }
  sprite(scene, "book-spread", 1240, 210, 555, 604);
  prop(scene, "rulebook_open", 1630, 219, 125, 70);
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
  for (let i = 0; i < 2; i++)
    prop(scene, "wax_seal_pin", 112, 888 + i * 43, 18, 32);
  if (!live) {
    label(scene, 130, 897, "◇ PIN 1: frei", 20);
    label(scene, 130, 940, "◇ PIN 2: frei", 20);
  }
  for (let i = 0; i < 3; i++) {
    const box = ARCHIVE_LAYOUT.stamp(i);
    sprite(scene, "stamp-base", box.x, box.y, box.w, box.h);
    prop(scene, "infernal_stamp", box.x + 60, box.y + 5, 80, 90);
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
  prop(scene, "lever_bank", 115, 300, 240, 78);
  prop(scene, "receipt_roll", 409, 186, 35, 112);
  prop(scene, "horned_signplate", 465, 185, 137, 72);
  heading(scene, 457, 260, "DISPOSITION / ÜBERGABE-PARAMETER");
  sprite(scene, "iron-frame", 96, 348, 971, 505);
  prop(scene, "routing_console", 96, 335, 971, 520);
  if (!live)
    for (let i = 0; i < 6; i++) {
      const box = DISPATCH_LAYOUT.control(i);
      sprite(scene, "control-housing", box.x, box.y, box.w, box.h);
      heading(scene, box.x + 17, box.y + 17, `REGLER ${i + 1}`);
      prop(scene, "analog_gauge", box.x + 78, box.y + 53, 140, 140);
      prop(scene, "gauge_needle", 0, 0, 25, 90)
        .setOrigin(0.5, 0.75)
        .setPosition(box.x + 148, box.y + 123);
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
  prop(scene, "warning_beacon", 1010, 850, 54, 68)
    .setName("dispatcher-warning-light")
    .setVisible(false);
  sprite(scene, "control-housing", 1090, 852, 411, 72);
  sprite(scene, "control-housing", 1090, 939, 411, 65);
  prop(scene, "red_push_button", 1433, 859, 57, 55);
  if (!live) {
    label(scene, 120, 932, "✓ Keine aktive Störung", 21);
    label(scene, 1115, 874, "ANLAGE VORBEREITEN", 22);
    label(scene, 1115, 956, "BEREIT MELDEN", 22);
  }
  sprite(scene, "lever-housing", 1512, 721, 328, 283);
  if (!live) {
    label(scene, 1540, 744, "ZIEL: — · OFFEN", 19, C.text, 270);
    label(scene, 1540, 792, "↗ HEBEL GESPERRT", 25, C.text, 250);
    prop(scene, "single_lever", 1626, 830, 80, 125);
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

import Phaser from "phaser";
import { button, installDebugNavigation } from "./navigation";
import { TOKENS } from "../../ui/tokens";
import type { Role } from "../state/contracts";
import type { GameNetwork } from "../../net/gameNetwork";
import { GameNetworkOverlay } from "../../ui/gameNetworkOverlay";
import { preloadAssetGroups } from "../../assets/registry";
import { placeholder } from "../../assets/placeholders";
import { AgentPanel } from "../roles/agent/AgentPanel";
import { ArchivistPanel } from "../roles/archivist/ArchivistPanel";
import { DispatcherPanel } from "../roles/dispatcher/DispatcherPanel";
import { PresentationSystem } from "../presentation/PresentationSystem";
import { ShiftMirror } from "../../ui/shiftMirror";
import { prefersReducedMotion } from "../../app/options";
import {
  controlSurface,
  devil,
  gauge,
  label,
  neon,
  plate,
  room,
  roomSign,
  scalablePlate,
  statusBar,
} from "../presentation/art";
import {
  bakeliteControl,
  metalHousing,
  neonIndicator,
  paperSurface,
  physicalLabel,
} from "../presentation/uiPrimitives";

const C = TOKENS.color;

function agentDesk(scene: Phaser.Scene, live: boolean): void {
  roomSign(scene, "LEITUNG  /  ANRUFER", C.agent);
  plate(scene, 95, 317, 395, 416, C.wood);
  physicalLabel(scene, 111, 334, 363, 39, "AGENT  /  TELEFONZENTRALE", {
    material: "bakelite",
    fontSize: 19,
    color: "#ffc69c",
    paddingX: 18,
    paddingY: 7,
  });
  const operator = scene.add
    .image(292, 548, "agent-operator")
    .setDisplaySize(320, 355);
  if (!prefersReducedMotion()) {
    scene.tweens.add({
      targets: operator,
      y: 544,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }
  bakeliteControl(scene, 95, 742, 395, 232);
  neonIndicator(scene, 119, 759, 346, 72, C.agent);
  plate(scene, 119, 839, 346, 62, C.wood);
  placeholder(scene, "telephone", 241, 648, 245, 108);
  if (!live)
    label(scene, 151, 778, "☎  ANNEHMEN (A)", 27).setFontFamily(
      '"Trebuchet MS", "DejaVu Sans", sans-serif',
    );
  if (!live) {
    label(scene, 137, 850, "↯  UNTERBRECHEN (I)", 22);
    label(scene, 130, 923, "STIMMUNG   —", 21, "#ffc69c");
  }
  metalHousing(scene, 501, 308, 889, 541);
  plate(scene, 526, 335, 837, 215, C.bakelite);
  neonIndicator(scene, 539, 348, 810, 183, C.cyan);
  plate(scene, 608, 360, 190, 175, C.bakelite);
  if (!live) scene.add.image(703, 446, "agent-caller").setDisplaySize(152, 163);
  label(scene, 818, 374, "SEELENKANAL", 24, "#91eafa");
  paperSurface(scene, 817, 496, 348, 37, "card");
  if (!live) label(scene, 837, 500, "FALL  —", 19, C.ink);
  if (!live) label(scene, 817, 427, "Noch kein Anruf", 41);
  scalablePlate(scene, 527, 545, 835, 285, "panel-paper");
  physicalLabel(scene, 549, 550, 346, 30, "GESPRÄCHS-SKRIPT", {
    material: "paper",
    fontSize: 20,
    paddingY: 4,
  });
  if (!live)
    for (let i = 0; i < 5; i++)
      plate(scene, 541, 582 + i * 48, 790, 42, C.paper);
  if (!live) {
    plate(scene, 527, 844, 835, 150, C.wood);
    label(scene, 548, 856, "ZIELBITTE  /  DISPOSITION", 20, "#ffc69c");
    plate(scene, 543, 901, 581, 55, C.paper);
    label(scene, 558, 912, "→ Zielbitte: —", 23, C.ink);
    plate(scene, 1135, 901, 207, 55, C.bakelite);
    label(scene, 1153, 914, "BITTE SENDEN", 21);
  }
  plate(scene, 1402, 317, 394, 553, C.wood);
  paperSurface(scene, 1416, 330, 367, 528, "clipboard");
  label(scene, 1450, 365, "GETEILTE HINWEISE", 25, C.ink);
  for (let i = 0; i < 3; i++)
    paperSurface(scene, 1431, 424 + i * 82, 338, 71, "note");
  if (!live)
    for (let i = 0; i < 3; i++)
      label(scene, 1450, 446 + i * 82, `◇  HINWEIS ${i + 1}`, 24, C.ink);
  if (!live) {
    label(scene, 1450, 697, "Entdeckt: —", 21, C.ink);
    label(scene, 1450, 777, "◇  Freigabe: Ziel fehlt", 21, C.ink);
  }
  plate(scene, 1402, 883, 394, 111, C.bakelite);
  label(scene, 1427, 901, "LEITUNGSDRUCK", 19, "#ffc69c");
  if (!live) label(scene, 1428, 938, "◇  Ruhig", 24);
}

function archiveDesk(scene: Phaser.Scene, live: boolean): void {
  roomSign(scene, "AKTEN  /  REGELWERK", C.archivist);
  placeholder(scene, "filing-cabinet", 95, 310, 427, 680);
  metalHousing(scene, 109, 331, 390, 491);
  physicalLabel(scene, 124, 347, 360, 44, "KARTEIKASTEN  /  SUCHE", {
    material: "wood",
    fontSize: 22,
  });
  paperSurface(scene, 124, 404, 360, 70, "card");
  if (!live) label(scene, 140, 421, "Akten durchsuchen …", 22, C.ink);
  physicalLabel(scene, 124, 478, 360, 39, "TREFFER  /  SCHUBLADE", {
    material: "wood",
    fontSize: 19,
  });
  if (!live)
    for (let i = 0; i < 3; i++) {
      paperSurface(scene, 124, 540 + i * 56, 360, 49, "card");
      label(
        scene,
        142,
        551 + i * 56,
        i === 0 ? "Keine Akte geöffnet" : "—",
        20,
        C.ink,
      );
    }
  scalablePlate(scene, 530, 310, 690, 550, "panel-paper");
  label(scene, 573, 350, "SEELEN-DOSSIER", 32, C.ink);
  if (!live) {
    label(scene, 575, 425, "Keine Akte geöffnet", 27, C.ink);
    label(scene, 575, 550, "Alias · Beruf · Ereignis", 23, C.ink);
    label(scene, 575, 623, "Beschwerde · Unstimmigkeiten", 23, C.ink);
  }
  scalablePlate(scene, 1240, 310, 555, 550, "panel-wood");
  scalablePlate(scene, 1258, 327, 520, 509, "panel-paper");
  const binding = scene.add.graphics();
  binding.fillStyle(0x7d5540).fillRoundedRect(1267, 347, 12, 466, 5);
  for (const bookY of [375, 555, 735])
    binding.fillStyle(0x30232a).fillCircle(1273, bookY, 5);
  label(scene, 1280, 344, "REGELBUCH", 28, C.ink);
  for (let i = 0; i < 4; i++) {
    physicalLabel(
      scene,
      1265 + i * 128,
      385,
      124,
      38,
      ["AKTE", "REGELN", "AUSN.", "NOTIZ"][i]!,
      {
        material: "paper",
        fontSize: 16,
        paddingX: 11,
        paddingY: 8,
      },
    );
  }
  if (!live) {
    label(scene, 1280, 457, "Noch keine Schicht begonnen.", 22, C.ink, 465);
    label(scene, 1280, 595, "◇  Fall prüfen", 22, C.ink);
    label(scene, 1280, 655, "◇  Ausnahme prüfen", 22, C.ink);
  }
  if (!live) devil(scene, 1770, 858, 0.3, 0x70517b);
  plate(scene, 109, 829, 390, 137, C.wood);
  if (!live) label(scene, 127, 848, "◇  PIN 1     ◇  PIN 2", 20);
  plate(scene, 1240, 875, 555, 112, C.bakelite);
  if (!live) label(scene, 1272, 911, "◇  FREIGABE OFFEN", 22);
  for (let i = 0; i < 3; i++) {
    const x = 550 + i * 220;
    const stamp = scene.add.graphics();
    stamp.fillStyle(0x251923).fillRoundedRect(x, 898, 204, 82, 12);
    stamp
      .lineStyle(5, [C.success, C.warning, C.error][i] ?? C.warning)
      .strokeRoundedRect(x + 2, 900, 200, 78, 11);
    if (!live)
      label(
        scene,
        x + 14,
        919,
        ["✓ VERIFIZIERT", "? FRAGWÜRDIG", "× NICHT FREI"][i] ?? "",
        19,
      );
  }
}

function dispatcherDesk(scene: Phaser.Scene, live: boolean): void {
  roomSign(scene, "ZIELBANK  /  ROUTING", C.dispatcher);
  devil(scene, 296, 661, 1.24, 0xa64131);
  metalHousing(scene, 520, 310, 765, 690);
  scalablePlate(scene, 545, 332, 715, 180, "panel-paper");
  if (!live) {
    label(scene, 575, 351, "MASCHINENAUFTRAG", 27, C.ink);
    label(scene, 575, 406, "Ziel wählen · Technik einstellen", 22, C.ink);
  }
  physicalLabel(
    scene,
    548,
    519,
    707,
    42,
    "MASCHINENREGLER  /  AKTUELLE WERTE",
    {
      material: "metal",
      fontSize: 20,
    },
  );
  scalablePlate(scene, 1297, 310, 506, 394, "panel-metal");
  physicalLabel(scene, 1315, 326, 470, 42, "ZIELBANK  /  12 ROHRE", {
    material: "metal",
    fontSize: 20,
  });
  const rows: [string, number, string][] = [
    ["ZORN", C.error, "♨"],
    ["LUST", 0xd773c7, "♥"],
    ["VÖLLEREI", C.dispatcher, "✦"],
    ["HABGIER", C.success, "◆"],
    ["NEID", 0x9a8cc8, "◉"],
    ["TRÄGHEIT", 0x7aa6e6, "☾"],
  ];
  if (!live)
    rows.forEach(([name, color, symbol], i) => {
      const x = 1313 + (i % 2) * 237;
      const y = 380 + Math.floor(i / 2) * 53;
      bakeliteControl(scene, x, y, 225, 51);
      scene.add
        .graphics()
        .fillStyle(color)
        .fillCircle(x + 17, y + 26, 6);
      label(scene, x + 31, y + 12, `${symbol}  ${name}`, 19);
    });
  if (!live) {
    for (let i = 0; i < 6; i++) {
      const x = 555 + (i % 3) * 233;
      const y = 575 + Math.floor(i / 3) * 102;
      controlSurface(scene, x, y, 219, 88, C.metalEdge);
      label(scene, x + 17, y + 20, `◉  REGLER ${i + 1}`, 20);
    }
  }
  scalablePlate(scene, 1297, 718, 506, 282, "panel-metal");
  if (!live) {
    label(scene, 1320, 745, "✓  Keine Störung", 21);
    label(scene, 1320, 827, "◇  ANLAGE VORBEREITEN", 22);
    label(scene, 1320, 905, "◇  BEREIT MELDEN", 22);
    controlSurface(scene, 584, 795, 642, 181, C.error);
    label(scene, 634, 853, "↗  HEBEL GESPERRT", 34);
    placeholder(scene, "lever-arm", 1118, 802, 80, 150);
  }
}

export class Game extends Phaser.Scene {
  private role: Role = "agent";
  private network: GameNetwork | null = null;
  private overlay: GameNetworkOverlay | null = null;
  private agentPanel: AgentPanel | null = null;
  private archivistPanel: ArchivistPanel | null = null;
  private dispatcherPanel: DispatcherPanel | null = null;
  private presentation: PresentationSystem | null = null;
  private shiftMirror: ShiftMirror | null = null;
  constructor() {
    super("Game");
  }
  init(data: { role?: Role; network?: GameNetwork }): void {
    this.network = data.network ?? null;
    this.role =
      data.role === "archivist" || data.role === "dispatcher"
        ? data.role
        : "agent";
  }
  preload(): void {
    const progress = this.add.text(96, 72, "Pultgrafiken laden: 0 %", {
      fontFamily: "Arial, sans-serif",
      fontSize: "28px",
      color: "#f4e1bd",
    });
    this.load.on("progress", (fraction: number) =>
      progress.setText(`Pultgrafiken laden: ${Math.round(fraction * 100)} %`),
    );
    this.load.once("complete", () => progress.destroy());
    preloadAssetGroups(this, ["shared", `role-${this.role}`]);
  }
  create(): void {
    this.game.canvas.dataset.scene = "Game";
    this.game.canvas.dataset.role = this.role;
    this.cameras.main.setBackgroundColor(C.background);
    room(
      this,
      this.role === "agent" ? 0 : this.role === "archivist" ? 120 : 240,
    );
    const hud = statusBar(this, this.role);
    const unsubscribeHud = this.network?.subscribe(() => {
      if (this.network?.view) hud.update(this.network.view.public);
    });
    if (this.role === "agent") agentDesk(this, Boolean(this.network));
    if (this.role === "archivist") archiveDesk(this, Boolean(this.network));
    if (this.role === "dispatcher") dispatcherDesk(this, Boolean(this.network));
    const shiftEnded = (): boolean =>
      this.network?.status === "ended" ||
      this.network?.status === "host-aborted" ||
      this.network?.status === "guest-aborted";
    const exitButton = button(
      this,
      1671,
      218,
      this.network?.isHost
        ? "SCHICHT ABBRECHEN"
        : this.network
          ? "PARTIE VERLASSEN"
          : "ERGEBNIS  →",
      () => {
        if (!this.network) this.scene.start("Results");
        else if (this.network.isHost && !shiftEnded())
          this.network.submit({ kind: "ABANDON" });
        else this.scene.start("Title");
      },
      C.dispatcher,
      260,
      64,
    );
    const unsubscribeExit = this.network?.subscribe(() => {
      if (shiftEnded()) exitButton.setText("ZUM TITEL");
    });
    if (this.network) this.overlay = new GameNetworkOverlay(this.network);
    if (this.network && this.role === "agent")
      this.agentPanel = new AgentPanel(this, this.network);
    if (this.network && this.role === "archivist")
      this.archivistPanel = new ArchivistPanel(this, this.network);
    if (this.network && this.role === "dispatcher")
      this.dispatcherPanel = new DispatcherPanel(
        this,
        this.network,
        this.overlay!.audio,
      );
    if (this.network)
      this.presentation = new PresentationSystem(this, this.network);
    if (this.network) this.shiftMirror = new ShiftMirror(this.network);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.shiftMirror?.destroy();
      this.shiftMirror = null;
      this.presentation?.destroy();
      this.presentation = null;
      unsubscribeHud?.();
      unsubscribeExit?.();
      this.dispatcherPanel?.destroy();
      this.dispatcherPanel = null;
      this.archivistPanel?.destroy();
      this.archivistPanel = null;
      this.agentPanel?.destroy();
      this.agentPanel = null;
      this.overlay?.destroy();
      this.overlay = null;
    });
    installDebugNavigation(this);
  }
}

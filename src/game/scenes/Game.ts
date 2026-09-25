import Phaser from "phaser";
import { button, installDebugNavigation } from "./navigation";
import { TOKENS } from "../../ui/tokens";
import type { Role } from "../state/contracts";
import type { GameNetwork } from "../../net/gameNetwork";
import { GameNetworkOverlay } from "../../ui/gameNetworkOverlay";
import { preloadPortraits } from "../../assets/portraits";
import { AgentPanel } from "../roles/agent/AgentPanel";
import { ArchivistPanel } from "../roles/archivist/ArchivistPanel";
import { DispatcherPanel } from "../roles/dispatcher/DispatcherPanel";
import {
  devil,
  gauge,
  label,
  neon,
  paper,
  plate,
  room,
  roomSign,
  statusBar,
} from "../presentation/art";

const C = TOKENS.color;

function agentDesk(scene: Phaser.Scene, live: boolean): void {
  roomSign(scene, "LEITUNG  /  ANRUFER", C.agent);
  devil(scene, 263, 639, 1.05, 0xc23b36);
  const phone = scene.add.graphics();
  phone.fillStyle(0x17121b).fillRoundedRect(108, 686, 262, 90, 26);
  phone.lineStyle(8, 0x806260).strokeRoundedRect(108, 686, 262, 90, 26);
  phone.fillStyle(0x17121b).fillRoundedRect(119, 652, 241, 39, 16);
  phone.lineStyle(5, C.agent).strokeRoundedRect(119, 652, 241, 39, 16);
  phone.lineStyle(7, 0x1c151f).strokeEllipse(363, 743, 72, 92);
  phone.fillStyle(C.fire).fillCircle(316, 731, 9);
  plate(scene, 95, 735, 395, 137, C.bakelite);
  neon(scene, 124, 765, 330, 67, C.agent);
  if (!live) label(scene, 155, 780, "☎   TELEFON", 30);
  plate(scene, 501, 308, 889, 541, C.metal);
  neon(scene, 528, 337, 834, 209, C.cyan);
  const g = scene.add.graphics();
  g.fillStyle(C.cyan, 0.26).fillEllipse(706, 441, 190, 150);
  g.fillStyle(C.cyan).fillCircle(697, 419, 48);
  g.fillTriangle(664, 443, 730, 444, 697, 509);
  g.fillStyle(0x122b37).fillCircle(682, 418, 5).fillCircle(711, 418, 5);
  label(scene, 818, 374, "SEELENKANAL", 24, "#91eafa");
  if (!live) label(scene, 817, 427, "Noch kein Anruf", 41);
  if (!live) label(scene, 548, 573, "GESPRÄCHSOPTIONEN", 25, C.muted);
  if (!live)
    for (let i = 0; i < 3; i++) {
      paper(scene, 541, 621 + i * 69, 790, 56);
      label(scene, 570, 633 + i * 69, `${i + 1}   —`, 25, C.ink);
    }
  paper(scene, 1416, 330, 367, 471);
  label(scene, 1453, 366, "GETEILTE HINWEISE", 27, C.ink);
  if (!live)
    for (let i = 0; i < 3; i++)
      label(scene, 1450, 446 + i * 83, `◇  HINWEIS ${i + 1}`, 24, C.ink);
  if (!live) {
    gauge(scene, 1638, 853, 69, 0.25);
    label(scene, 1500, 941, "LEITUNGSDRUCK", 24);
  }
}

function archiveDesk(scene: Phaser.Scene, live: boolean): void {
  roomSign(scene, "AKTEN  /  REGELWERK", C.archivist);
  plate(scene, 105, 314, 431, 542, C.wood, C.woodEdge);
  for (let i = 0; i < 4; i++) {
    plate(scene, 126, 346 + i * 119, 387, 91, 0x33212b, C.woodEdge, 5);
    label(
      scene,
      159,
      368 + i * 119,
      [
        "I  /  DOSSIERS",
        "II  /  REGELN",
        "III  /  AUSNAHMEN",
        "IV  /  NOTIZEN",
      ][i] ?? "",
      25,
    );
    scene.add
      .graphics()
      .fillStyle(C.dispatcher)
      .fillRoundedRect(442, 378 + i * 119, 42, 18, 6);
  }
  paper(scene, 577, 310, 684, 546);
  label(scene, 615, 352, "REGELBUCH", 34, C.ink);
  if (!live) {
    label(scene, 619, 430, "AKTIVE REGELN", 25, C.ink);
    label(scene, 619, 502, "Noch keine Schicht begonnen.", 25, C.ink, 550);
    label(scene, 619, 646, "◇   Fall prüfen", 27, C.ink);
    label(scene, 619, 715, "◇   Ausnahme prüfen", 27, C.ink);
  }
  paper(scene, 1293, 336, 497, 377);
  label(scene, 1332, 378, "SEELEN-DOSSIER", 30, C.ink);
  if (!live) {
    label(scene, 1332, 450, "Keine Akte geöffnet", 27, C.ink);
    label(scene, 1332, 568, "GETEILTE TAGS  ◇", 23, C.ink);
  }
  devil(scene, 1540, 868, 0.42, 0x70517b);
  for (let i = 0; i < 3; i++) {
    const x = 603 + i * 290;
    neon(
      scene,
      x,
      898,
      255,
      82,
      [C.success, C.warning, C.error][i] ?? C.warning,
    );
    if (!live)
      label(
        scene,
        x + 22,
        919,
        ["✓  PASST", "?  UNKLAR", "×  NEIN"][i] ?? "",
        27,
      );
  }
}

function dispatcherDesk(scene: Phaser.Scene, live: boolean): void {
  roomSign(scene, "ZIELBANK  /  ROUTING", C.dispatcher);
  devil(scene, 296, 661, 1.24, 0xa64131);
  plate(scene, 546, 322, 842, 549, C.metal);
  if (!live) label(scene, 595, 351, "ZIEL WÄHLEN", 28);
  const rows: [string, number, string][] = [
    ["ZORN", C.error, "♨"],
    ["LUST", 0xd773c7, "♥"],
    ["VÖLLEREI", C.dispatcher, "✦"],
    ["HABGIER", C.success, "◆"],
    ["NEID", C.cyan, "◉"],
    ["TRÄGHEIT", 0x7aa6e6, "☾"],
  ];
  if (!live)
    rows.forEach(([name, color, symbol], i) => {
      const x = 575 + (i % 2) * 389;
      const y = 401 + Math.floor(i / 2) * 139;
      neon(scene, x, y, 344, 106, color);
      label(scene, x + 24, y + 28, `${symbol}  ${name}`, 29);
    });
  if (!live) {
    const g = scene.add.graphics();
    g.lineStyle(14, 0x1b141e).lineBetween(590, 978, 1335, 978);
    for (let i = 0; i < 5; i++) {
      const x = 660 + i * 145;
      g.fillStyle(0x17121a).fillRoundedRect(x - 21, 868, 42, 111, 12);
      g.lineStyle(15, 0x716063).lineBetween(
        x,
        905,
        x + (i % 2 ? -29 : 26),
        818,
      );
      g.fillStyle(i % 2 ? C.error : C.dispatcher).fillCircle(
        x + (i % 2 ? -29 : 26),
        812,
        22,
      );
    }
  }
  paper(scene, 1430, 340, 344, 331);
  if (!live) {
    label(scene, 1470, 381, "ROUTE", 32, C.ink);
    label(scene, 1470, 467, "Noch kein Ziel", 26, C.ink, 270);
    gauge(scene, 1604, 782, 87, 0.52);
    label(scene, 1480, 898, "KESSELDRUCK", 26);
    neon(scene, 1432, 932, 342, 79, C.error);
    label(scene, 1451, 951, "↗  ZUSTELLEN", 29);
  }
}

export class Game extends Phaser.Scene {
  private role: Role = "agent";
  private network: GameNetwork | null = null;
  private overlay: GameNetworkOverlay | null = null;
  private agentPanel: AgentPanel | null = null;
  private archivistPanel: ArchivistPanel | null = null;
  private dispatcherPanel: DispatcherPanel | null = null;
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
    preloadPortraits(this);
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
    button(
      this,
      1671,
      218,
      this.network?.isHost
        ? "SCHICHT ABBRECHEN"
        : this.network
          ? "PARTIE VERLASSEN"
          : "ERGEBNIS  →",
      () => {
        if (this.network?.isHost) this.network.submit({ kind: "ABANDON" });
        else this.scene.start("Results");
      },
      C.dispatcher,
      212,
      54,
    );
    if (this.network) this.overlay = new GameNetworkOverlay(this.network);
    if (this.network && this.role === "agent")
      this.agentPanel = new AgentPanel(this, this.network);
    if (this.network && this.role === "archivist")
      this.archivistPanel = new ArchivistPanel(this, this.network);
    if (this.network && this.role === "dispatcher")
      this.dispatcherPanel = new DispatcherPanel(this, this.network);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribeHud?.();
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

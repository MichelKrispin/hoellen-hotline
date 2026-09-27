import type { PlayerViewState } from "../game/state/contracts";

/** A short prompt for the shared status strip. Only projected role data is used. */
export function nextStep(view: PlayerViewState): string {
  const shared = view.public;
  if (shared.phase === "results")
    return "Schicht beendet · Abschlussakte öffnen";
  if (shared.pauseReason) return "Schicht pausiert · auf Fortsetzung warten";
  if (shared.tutorial?.stage === "stations")
    return shared.tutorial.stations[view.role.role]
      ? "Station erledigt · auf das Team warten"
      : "Stationsfrage im Tutorial beantworten";
  if (!shared.activeCaseId) {
    if (view.role.role === "agent") return "Nächsten Anruf annehmen";
    if (view.role.role === "archivist")
      return "Regelbuch prüfen · auf den Anruf warten";
    return "Zielbank prüfen · auf den Anruf warten";
  }

  if (view.role.role === "agent") {
    if (!shared.publishedTags.length)
      return view.role.discoveredTags.length
        ? "Entdeckten Hinweis veröffentlichen"
        : "Anrufer befragen · Hinweis entdecken";
    if (shared.selectedDestination)
      return shared.approvals.agent
        ? "Freigabe erteilt · Team abstimmen lassen"
        : "Gewähltes Ziel prüfen und freigeben";
    return shared.suggestedDestination
      ? "Zielbitte gesendet · mit dem Team abstimmen"
      : "Ziel mit dem Team besprechen · Bitte senden";
  }
  if (view.role.role === "archivist") {
    if (!shared.archivePins.length) return "Akte suchen und Beleg pinnen";
    if (!view.role.stamp) return "Regeln prüfen und Einschätzung stempeln";
    if (!shared.selectedDestination)
      return "Regelbewertung mit der Disposition teilen";
    return shared.approvals.archivist
      ? "Freigabe erteilt · Team abstimmen lassen"
      : "Gewähltes Ziel gegen Regeln prüfen";
  }
  if (!shared.selectedDestination) return "Hinweise abgleichen und Ziel wählen";
  if (view.role.incident) return "Störung diagnostizieren und beheben";
  if (!view.role.prepared) return "Regler einstellen und Anlage vorbereiten";
  if (!shared.approvals.dispatcher) return "Bereitschaft melden";
  return shared.approvals.agent && shared.approvals.archivist
    ? "Ziel und Freigaben prüfen · Hebel entsichern"
    : "Auf Freigaben von Agent und Archiv warten";
}

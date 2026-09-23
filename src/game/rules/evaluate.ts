import type { CampaignPackage, Predicate } from "../../content/schemas";

type Pack = CampaignPackage["packs"][number];
export type Destination = Pack["destinations"][number];
export type Rule = Pack["rules"][number];
export type Exception = Pack["exceptions"][number];
export type Layout = Pack["machineLayouts"][number];
export type ControlValue = boolean | number | string;

export interface RuleContext {
  tags: readonly string[];
  stamps: readonly ("verified" | "questionable" | "reject")[];
  pressure: number;
  caseCount: number;
}

export function matches(
  predicate: Predicate,
  context: RuleContext,
  destination: string,
): boolean {
  switch (predicate.op) {
    case "all":
      return predicate.predicates.every((part) =>
        matches(part, context, destination),
      );
    case "any":
      return predicate.predicates.some((part) =>
        matches(part, context, destination),
      );
    case "not":
      return !matches(predicate.predicate, context, destination);
    case "hasTag":
      return context.tags.includes(predicate.id);
    case "hasStamp":
      return context.stamps.includes(predicate.id);
    case "destinationIs":
      return destination === predicate.id;
    case "pressureBelow":
      return context.pressure < predicate.value;
    case "caseCountAtLeast":
      return context.caseCount >= predicate.value;
  }
}

export interface Verdict {
  destinationId: string;
  valid: boolean;
  reason: "eligible" | "ineligible" | "allowed" | "forbidden" | "conflict";
  decisiveIds: string[];
  priority: number | null;
}

export function evaluateDestination(
  destination: Destination,
  rules: readonly Rule[],
  exceptions: readonly Exception[],
  context: RuleContext,
): Verdict {
  if (!matches(destination.eligibility, context, destination.id))
    return {
      destinationId: destination.id,
      valid: false,
      reason: "ineligible",
      decisiveIds: [destination.id],
      priority: null,
    };
  const applicable = [
    ...rules,
    ...exceptions.filter((exception) =>
      rules.some((rule) => rule.id === exception.overrides),
    ),
  ].filter(
    (clause) =>
      clause.destination === destination.id &&
      matches(clause.when, context, destination.id),
  );
  if (applicable.length === 0)
    return {
      destinationId: destination.id,
      valid: true,
      reason: "eligible",
      decisiveIds: [destination.id],
      priority: null,
    };
  const priority = Math.max(...applicable.map((clause) => clause.priority));
  const top = applicable
    .filter((clause) => clause.priority === priority)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  // A contradictory top priority is explicitly unresolved, never silently allowed.
  const conflict = top.some((clause) => clause.effect !== top[0]?.effect);
  return {
    destinationId: destination.id,
    valid: !conflict && top[0]?.effect === "allow",
    reason: conflict
      ? "conflict"
      : top[0]?.effect === "allow"
        ? "allowed"
        : "forbidden",
    decisiveIds: top.map((clause) => clause.id),
    priority,
  };
}

export function machineCanRoute(
  destination: Destination,
  layout: Layout,
  controls: Readonly<Record<string, ControlValue>>,
): boolean {
  return (
    layout.availableDestinations.includes(destination.id) &&
    destination.machineRequirements.every(
      (requirement) => controls[requirement.control] === requirement.equals,
    )
  );
}

export function machineCanBeConfigured(
  destination: Destination,
  layout: Layout,
): boolean {
  return (
    layout.availableDestinations.includes(destination.id) &&
    destination.machineRequirements.every((requirement) =>
      layout.controls.some(
        (control) =>
          control.id === requirement.control &&
          control.values.includes(requirement.equals),
      ),
    )
  );
}

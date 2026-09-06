import {EntitiesRowConfig, TodoRowConfig} from "../structs/config";
import {getFallBackColor} from "./colors";
import {getHass} from "../globals";
export function getEntityName(entity: string): string {
    return getHass()?.states[entity]?.attributes?.friendly_name ?? entity;
}
export function processEditorEntities(
    entities: (EntitiesRowConfig | string)[],
    assignColors = false,
): EntitiesRowConfig[] {
    return entities
        .map((entry, i) =>
            typeof entry === "string"
                ? {
                      entity: entry,
                      color: assignColors ? getFallBackColor(i) : "",
                  }
                : {
                      ...entry,
                      color:
                          entry.color
                          ?? (assignColors ? getFallBackColor(i) : ""),
                  },
        )
        .filter((entry) => entry.entity.startsWith("calendar."));
}
export function processTodoEntities(
    entities: (TodoRowConfig | string)[] = [],
    assignColors = false,
): TodoRowConfig[] {
    return entities
        .map((entry, i) =>
            typeof entry === "string"
                ? {
                      entity: entry,
                      color: assignColors ? getFallBackColor(i) : "",
                  }
                : {
                      ...entry,
                      color:
                          entry.color
                          ?? (assignColors ? getFallBackColor(i) : ""),
                  },
        )
        .filter((entry) => entry.entity.startsWith("todo."));
}
export function isEqual<T>(a: T, b: T): boolean {
    if (a === b) return true;
    const objects = a && b && typeof a === "object" && typeof b === "object";
    return Boolean(
        objects
        && Object.keys(a).length === Object.keys(b).length
        && Object.entries(a).every(([k, v]) => isEqual(v, b[k as keyof T])),
    );
}

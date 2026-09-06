import dayjs from "dayjs";
import {HomeAssistant} from "custom-card-helpers";
import CalendarEvent from "../structs/event";
import {CardConfig, EntitiesRowConfig, TodoRowConfig} from "../structs/config";

export type TodoItem = {
    uid: string;
    summary: string;
    due?: string;
    entity: TodoRowConfig;
};
type TodoGetItemsResponse = {
    response?: Record<string, {items?: any[]}>;
};

export type AgendaDay = {
    date: dayjs.Dayjs;
    schedule: CalendarEvent[];
    events: CalendarEvent[];
    todos: TodoItem[];
};

export function getAgendaDays(config: CardConfig): dayjs.Dayjs[] {
    const first = dayjs()
        .startOf("day")
        .add(config.advance ?? 0, "day");
    if (!config.show_next_school_day) return [first];
    const schoolDays = config.school_days?.length
        ? config.school_days
        : [1, 2, 3, 4, 5];
    let next = first.add(1, "day");
    while (!schoolDays.includes(next.day())) next = next.add(1, "day");
    const days: dayjs.Dayjs[] = [];
    for (let day = first; !day.isAfter(next, "day"); day = day.add(1, "day"))
        days.push(day);
    return days;
}

export async function getAgenda(
    config: CardConfig,
    calendars: EntitiesRowConfig[],
    todos: TodoRowConfig[],
    hass: HomeAssistant,
): Promise<AgendaDay[]> {
    const days = getAgendaDays(config);
    const result = await Promise.all(
        days.map(async (date) => {
            const normal = calendars.filter((entry) => !entry.school_schedule);
            const schedules = calendars.filter(
                (entry) => entry.school_schedule,
            );
            const schoolDays = config.school_days?.length
                ? config.school_days
                : [1, 2, 3, 4, 5];
            const [events, schedule, todoItems] = await Promise.all([
                fetchCalendarEvents(normal, date, config, hass),
                schoolDays.includes(date.day())
                    ? fetchCalendarEvents(schedules, date, config, hass)
                    : Promise.resolve([]),
                fetchTodos(todos, date, hass, date.isSame(days[0], "day")),
            ]);
            return {
                date,
                events: filterAndLimit(events, config),
                schedule: filterAndLimit(schedule, config),
                todos: todoItems,
            };
        }),
    );
    return result;
}

async function fetchCalendarEvents(
    entities: EntitiesRowConfig[],
    date: dayjs.Dayjs,
    config: CardConfig,
    hass: HomeAssistant,
): Promise<CalendarEvent[]> {
    const start = date.startOf("day").toISOString();
    const end = date.endOf("day").toISOString();
    const responses = await Promise.all(
        entities.map(async (entity) => {
            try {
                const events = await hass.callApi<any[]>(
                    "GET",
                    `calendars/${entity.entity}?start=${start}&end=${end}`,
                );
                return events.map(
                    (event) => new CalendarEvent(event, entity, config, date),
                );
            } catch (error) {
                console.error(`Unable to load ${entity.entity}`, error);
                return [];
            }
        }),
    );
    return responses.flat();
}

async function fetchTodos(
    entities: TodoRowConfig[],
    date: dayjs.Dayjs,
    hass: HomeAssistant,
    includeUndated: boolean,
): Promise<TodoItem[]> {
    const responses = await Promise.all(
        entities.map(async (entity) => {
            try {
                const response = await hass.callWS<TodoGetItemsResponse>({
                    type: "call_service",
                    domain: "todo",
                    service: "get_items",
                    service_data: {status: "needs_action"},
                    target: {entity_id: entity.entity},
                    return_response: true,
                });
                const items = response.response?.[entity.entity]?.items ?? [];
                return items
                    .filter(
                        (item) =>
                            item.status !== "completed"
                            && (item.due
                                ? dayjs(item.due).isSame(date, "day")
                                : includeUndated),
                    )
                    .map((item) => ({
                        uid: item.uid,
                        summary: item.summary ?? "",
                        due: item.due,
                        entity,
                    }));
            } catch (error) {
                console.error(`Unable to load ${entity.entity}`, error);
                return [];
            }
        }),
    );
    return responses.flat();
}

function filterAndLimit(
    events: CalendarEvent[],
    config: CardConfig,
): CalendarEvent[] {
    const filtered = events.filter(
        (event) =>
            (config.show_all_day_events || !event.isAllDay)
            && (config.show_past_events || !event.isInPast),
    );
    filtered.sort(
        (a, b) =>
            a.start.valueOf() - b.start.valueOf()
            || a.end.valueOf() - b.end.valueOf(),
    );
    return !config.limit ? filtered : filtered.slice(0, config.limit);
}

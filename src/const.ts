import {CardConfig} from "./structs/config";
export const VERSION = "v1.0.0";
export const REFRESH_INTERVAL = 60 * 1_000;
export const TIME_FORMATS = [
    {value: "H:mm", label: "8:02"},
    {value: "HH:mm", label: "08:02"},
    {value: "h:mm A", label: "8:02 AM"},
    {value: "hh:mm A", label: "08:02 AM"},
];
export const DEFAULT_CONFIG: CardConfig = {
    type: "custom:today-card",
    title: "",
    advance: 0,
    time_format: "HH:mm",
    fallback_color: "primary",
    show_all_day_events: true,
    show_past_events: false,
    limit: 0,
    show_next_school_day: true,
    school_days: [1, 2, 3, 4, 5],
    confirm_todo_completion: true,
    tap_action: {action: "none"},
    entities: [],
    todo_entities: [],
};

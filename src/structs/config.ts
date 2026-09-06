import {
    any,
    array,
    assign,
    boolean,
    Infer,
    number,
    object,
    optional,
    refine,
    string,
    union,
} from "superstruct";
import {actionConfigStruct} from "./action";

export const baseCardConfigStruct = object({
    type: string(),
    view_layout: any(),
    layout_options: any(),
    grid_options: any(),
    visibility: any(),
    card_mod: any(),
});
export type BaseCardConfig = Infer<typeof baseCardConfigStruct>;

export const entitiesRowConfigStruct = object({
    entity: string(),
    color: optional(string()),
    school_schedule: optional(boolean()),
});
export type EntitiesRowConfig = Infer<typeof entitiesRowConfigStruct>;
export const todoRowConfigStruct = object({
    entity: string(),
    color: optional(string()),
});
export type TodoRowConfig = Infer<typeof todoRowConfigStruct>;

export const cardConfigStruct = assign(
    baseCardConfigStruct,
    object({
        title: optional(string()),
        advance: optional(number()),
        time_format: optional(string()),
        fallback_color: optional(string()),
        show_all_day_events: optional(boolean()),
        show_past_events: optional(boolean()),
        limit: optional(
            refine(number(), "non-negative", (value) => value >= 0),
        ),
        tap_action: optional(actionConfigStruct),
        show_next_school_day: optional(boolean()),
        school_days: optional(array(number())),
        confirm_todo_completion: optional(boolean()),
        entities: union([array(string()), array(entitiesRowConfigStruct)]),
        todo_entities: optional(
            union([array(string()), array(todoRowConfigStruct)]),
        ),
    }),
);
export type CardConfig = Infer<typeof cardConfigStruct>;

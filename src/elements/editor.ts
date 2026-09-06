import styles from "./editor.css";
import {CSSResult, html, LitElement, TemplateResult, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {assert} from "superstruct";
import {
    isEqual,
    processEditorEntities,
    processTodoEntities,
} from "../functions/config";
import {loadHaComponents} from "../functions/hacks";
import {
    CardConfig,
    cardConfigStruct,
    EntitiesRowConfig,
    TodoRowConfig,
} from "../structs/config";
import {HomeAssistant} from "custom-card-helpers";
import {setHass} from "../globals";
import {fireEvent} from "../common/fire-event";
import {TIME_FORMATS} from "../const";

const FORM_SCHEMA = [
    {
        name: "content",
        type: "expandable",
        flatten: true,
        schema: [
            {name: "title", selector: {text: {}}},
            {
                name: "time_format",
                selector: {select: {mode: "dropdown", options: TIME_FORMATS}},
            },
            {name: "show_next_school_day", selector: {boolean: {}}},
            {name: "confirm_todo_completion", selector: {boolean: {}}},
            {name: "show_all_day_events", selector: {boolean: {}}},
            {name: "show_past_events", selector: {boolean: {}}},
            {name: "limit", selector: {number: {mode: "box", min: 0}}},
        ],
    },
];
@customElement("today-card-editor")
export class TodayCardEditor extends LitElement {
    @property({attribute: false}) public hass!: HomeAssistant;
    @state() private config?: CardConfig;
    @state() private entities: EntitiesRowConfig[] = [];
    @state() private todos: TodoRowConfig[] = [];
    static get styles(): CSSResult {
        return unsafeCSS(styles);
    }
    connectedCallback(): void {
        super.connectedCallback();
        loadHaComponents();
    }
    setConfig(config: CardConfig): void {
        setHass(this.hass);
        assert(config, cardConfigStruct);
        this.config = {
            ...config,
            entities: processEditorEntities(config.entities),
            todo_entities: processTodoEntities(config.todo_entities),
        };
        this.entities = this.config.entities as EntitiesRowConfig[];
        this.todos = this.config.todo_entities as TodoRowConfig[];
    }
    render(): TemplateResult {
        if (!this.hass || !this.config) return html``;
        return html`<ha-form
                .hass=${this.hass}
                .data=${this.config}
                .schema=${FORM_SCHEMA}
                @value-changed=${this.valueChanged}
            ></ha-form
            ><ha-expansion-panel outlined
                ><div slot="header">Calendars and lesson plans</div>
                <div class="content">
                    <today-card-entities-editor
                        .hass=${this.hass}
                        .entities=${this.entities}
                        @entities-changed=${this.entitiesChanged}
                    ></today-card-entities-editor></div></ha-expansion-panel
            ><ha-expansion-panel outlined
                ><div slot="header">Task lists</div>
                <div class="content">
                    ${this.todos.map(
                        (todo, index) =>
                            html`<div class="todo-row">
                                <span>${todo.entity}</span
                                ><ha-icon-button
                                    .index=${index}
                                    .label=${"Remove"}
                                    @click=${this.removeTodo}
                                    >×</ha-icon-button
                                >
                            </div>`,
                    )}<ha-entity-picker
                        .hass=${this.hass}
                        .includeDomains=${["todo"]}
                        @value-changed=${this.addTodo}
                    ></ha-entity-picker></div
            ></ha-expansion-panel>`;
    }
    private valueChanged(event: CustomEvent): void {
        event.stopPropagation();
        if (this.config && !isEqual(event.detail.value, this.config))
            fireEvent(this, "config-changed", {config: event.detail.value});
    }
    private entitiesChanged(event: CustomEvent): void {
        event.stopPropagation();
        if (this.config)
            fireEvent(this, "config-changed", {
                config: {...this.config, entities: event.detail.entities},
            });
    }
    private addTodo(event: CustomEvent): void {
        const entity = event.detail.value;
        if (
            !entity
            || !this.config
            || this.todos.some((todo) => todo.entity === entity)
        )
            return;
        (event.target as any).value = "";
        fireEvent(this, "config-changed", {
            config: {
                ...this.config,
                todo_entities: this.todos.concat({entity}),
            },
        });
    }
    private removeTodo(event: Event): void {
        if (!this.config) return;
        const index = (event.currentTarget as any).index;
        const todos = this.todos.concat();
        todos.splice(index, 1);
        fireEvent(this, "config-changed", {
            config: {...this.config, todo_entities: todos},
        });
    }
}

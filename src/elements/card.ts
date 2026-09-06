import styles from "./card.css";
import {
    CSSResult,
    html,
    LitElement,
    nothing,
    TemplateResult,
    unsafeCSS,
} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {assert} from "superstruct";
import {ActionHandlerEvent, HomeAssistant} from "custom-card-helpers";
import {getAgenda, AgendaDay, TodoItem} from "../functions/agenda";
import {computeCssColor, getFallBackColor} from "../functions/colors";
import {processEditorEntities, processTodoEntities} from "../functions/config";
import {
    CardConfig,
    cardConfigStruct,
    EntitiesRowConfig,
    TodoRowConfig,
} from "../structs/config";
import CalendarEvent from "../structs/event";
import {DEFAULT_CONFIG, REFRESH_INTERVAL} from "../const";
import {setHass} from "../globals";
import {handleAction} from "../common/handle-action";
import {ActionConfig} from "../structs/action";
import {actionHandler} from "../common/action-handler";

@customElement("today-card")
export class TodayCard extends LitElement {
    @property({attribute: false}) public hass!: HomeAssistant;
    @state() private config: CardConfig = DEFAULT_CONFIG;
    @state() private calendars: EntitiesRowConfig[] = [];
    @state() private todoEntities: TodoRowConfig[] = [];
    @state() private days: AgendaDay[] = [];
    private initialized = false;
    private updateInProgress = false;
    private refreshInterval?: number;
    static get styles(): CSSResult {
        return unsafeCSS(styles);
    }
    static getConfigElement(): HTMLElement {
        return document.createElement("today-card-editor");
    }
    static getStubConfig(
        _hass: HomeAssistant,
        entities: string[],
        fallback: string[],
    ): Partial<CardConfig> {
        const available = entities
            .concat(fallback)
            .filter(
                (id, index, all) =>
                    id.startsWith("calendar.") && all.indexOf(id) === index,
            );
        return {
            ...DEFAULT_CONFIG,
            title: "School agenda",
            entities: available.map((entity, index) => ({
                entity,
                color: getFallBackColor(index),
            })),
        };
    }
    getLayoutOptions() {
        return {grid_columns: 4, grid_min_columns: 2, grid_min_rows: 2};
    }
    connectedCallback(): void {
        super.connectedCallback();
        this.refreshInterval ??= window.setInterval(
            () => this.updateAgenda(),
            REFRESH_INTERVAL,
        );
    }
    disconnectedCallback(): void {
        if (this.refreshInterval) window.clearInterval(this.refreshInterval);
        this.refreshInterval = undefined;
        super.disconnectedCallback();
    }
    setConfig(config: CardConfig): void {
        setHass(this.hass);
        assert(config, cardConfigStruct);
        this.calendars = processEditorEntities(config.entities, true);
        this.todoEntities = processTodoEntities(config.todo_entities, true);
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            entities: this.calendars,
            todo_entities: this.todoEntities,
        };
        this.updateAgenda();
    }
    async updateAgenda(): Promise<void> {
        if (!this.hass || this.updateInProgress) return;
        this.updateInProgress = true;
        try {
            this.days = await getAgenda(
                this.config,
                this.calendars,
                this.todoEntities,
                this.hass,
            );
            this.initialized = true;
        } finally {
            this.updateInProgress = false;
        }
    }
    private hasAction(config?: ActionConfig): boolean {
        return !!config?.action && config.action !== "none";
    }
    private handleTapAction(event: ActionHandlerEvent): void {
        handleAction(
            this,
            this.hass,
            {tap_action: this.config.tap_action},
            event.detail.action!,
        );
    }
    private async completeTodo(todo: TodoItem): Promise<void> {
        if (
            this.config.confirm_todo_completion
            && !window.confirm(`Mark “${todo.summary}” as completed?`)
        )
            return;
        await this.hass.callService(
            "todo",
            "update_item",
            {
                item: todo.uid,
                status: "completed",
            },
            {entity_id: todo.entity.entity},
        );
        await this.updateAgenda();
    }
    render(): TemplateResult {
        if (!this.hass) return html``;
        setHass(this.hass);
        if (!this.initialized) this.updateAgenda();
        const actionable = this.hasAction(this.config.tap_action);
        return html`<ha-card
            header="${this.config.title || nothing}"
            role=${actionable ? "button" : nothing}
            tabindex=${actionable ? "0" : nothing}
            @action=${this.handleTapAction}
            .actionHandler=${actionHandler()}
            ><div class="card-content">${this.renderAgenda()}</div>
            ${actionable ? html`<ha-ripple></ha-ripple>` : nothing}</ha-card
        >`;
    }
    private renderAgenda(): TemplateResult {
        if (!this.initialized) return html``;
        if (
            !this.days.some(
                (day) =>
                    day.events.length
                    || day.schedule.length
                    || day.todos.length,
            )
        )
            return html`<div class="empty">
                No lessons, events or tasks planned.
            </div>`;
        return html`${this.days.map((day) => this.renderDay(day))}`;
    }
    private renderDay(day: AgendaDay): TemplateResult {
        return html`<section class="day">
            <h3>${day.date.format("dddd, D MMMM")}</h3>
            ${day.schedule.length
                ? html`<h4>Lesson plan</h4>
                      ${day.schedule.map((event) => this.renderEvent(event))}`
                : nothing}${day.events.length
                ? html`<h4>Calendar</h4>
                      ${day.events.map((event) => this.renderEvent(event))}`
                : nothing}${day.todos.length
                ? html`<h4>Tasks</h4>
                      ${day.todos.map((todo) => this.renderTodo(todo))}`
                : nothing}
        </section>`;
    }
    private renderEvent(event: CalendarEvent): TemplateResult {
        return html`<div class="event">
            <div
                class="indicator"
                style="background-color:${computeCssColor(event.color)}"
            ></div>
            <div class="details">
                <strong>${event.title}</strong>${event.timeSchedule
                    ? html`<p>${event.timeSchedule}</p>`
                    : nothing}
            </div>
        </div>`;
    }
    private renderTodo(todo: TodoItem): TemplateResult {
        return html`<button
            class="todo"
            @click=${() => this.completeTodo(todo)}
            aria-label="Complete ${todo.summary}"
        >
            <span class="checkbox"></span><span>${todo.summary}</span>
        </button>`;
    }
}

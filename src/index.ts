import "./elements/card";
import "./elements/editor";
import "./elements/entity-editor";
import {VERSION} from "./const";

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: "today-card",
    name: "School Agenda",
    description: "Show school calendars, lesson plans and tasks",
});

console.info(`%c🗓️ Today Card ${VERSION}`, "font-weight: 700;");

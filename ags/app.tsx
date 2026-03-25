import app from "ags/gtk4/app"
import { Astal, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { execAsync } from "ags/process"

const POLL_MS = 1000

function Section(props: { class: string; children: JSX.Element[] | JSX.Element }) {
    return <box class={`section ${props.class}`}>{props.children}</box>
}

function ModuleBox(props: { class: string; children: JSX.Element[] | JSX.Element }) {
    return <box class={`module ${props.class}`}>{props.children}</box>
}

function WorkspaceButton(id: number, activeWorkspaceId: ReturnType<typeof createPoll>) {
    return (
        <button
            class={activeWorkspaceId((v) => `workspace-btn${Number(v) === id ? " active" : ""}`)}
            onClicked={() => execAsync(["hyprctl", "dispatch", "workspace", `${id}`]).catch(() => null)}
            tooltipText={`Workspace ${id}`}>
            <label label={activeWorkspaceId((v) => (Number(v) === id ? "" : ""))} />
        </button>
    )
}

function Workspaces() {
    const activeWorkspaceId = createPoll("1", POLL_MS, [
        "bash",
        "-lc",
        "hyprctl activeworkspace -j 2>/dev/null | python -c 'import json,sys; print(json.load(sys.stdin).get(\"id\", 1))' 2>/dev/null || echo 1",
    ])

    return (
        <ModuleBox class="workspaces">
            <box spacing={6}>{Array.from({ length: 10 }, (_, i) => WorkspaceButton(i + 1, activeWorkspaceId))}</box>
        </ModuleBox>
    )
}

function ActiveWindow() {
    const title = createPoll("Desktop", POLL_MS, [
        "bash",
        "-lc",
        "hyprctl activewindow -j 2>/dev/null | python -c 'import json,sys; print(json.load(sys.stdin).get(\"title\", \"Desktop\"))' 2>/dev/null || echo Desktop",
    ])

    return (
        <ModuleBox class="window">
            <label xalign={0} maxWidthChars={42} ellipsize={3} label={title((v) => (v?.trim() ? v : "Desktop"))} />
        </ModuleBox>
    )
}

function Clock() {
    const value = createPoll("", POLL_MS, ["bash", "-lc", "date '+  %a %d %b  %H:%M'"])
    return (
        <ModuleBox class="clock">
            <label label={value} />
        </ModuleBox>
    )
}

function Bar(monitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

    return (
        <window
            visible
            gdkmonitor={monitor}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={TOP | LEFT | RIGHT}
            marginTop={10}
            marginLeft={10}
            marginRight={10}
            class="bar-window"
            application={app}
            name={`liquid-bar-${monitor.get_connector() ?? "0"}`}>
            <centerbox
                class="bar"
                startWidget={
                    <Section class="left">
                        <Workspaces />
                        <ActiveWindow />
                    </Section>
                }
                centerWidget={
                    <Section class="center">
                        <Clock />
                    </Section>
                }
                endWidget={
                    <Section class="right">
                        <ModuleBox class="hint">
                            <label label="AGS v2/v3" />
                        </ModuleBox>
                    </Section>
                }
            />
        </window>
    )
}

app.start({
    css: "./style.css",
    main() {
        const monitors = app.get_monitors()
        if (monitors.length === 0) {
            return
        }
        for (const monitor of monitors) {
            app.add_window(Bar(monitor))
        }
    },
})

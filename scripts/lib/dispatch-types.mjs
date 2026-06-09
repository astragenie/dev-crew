// FEAT-020 SLICE-1 — Types + error classes (foundation module).
// Spec: docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md
export class DispatchDepthExceeded extends Error {
    constructor(message) {
        super(message);
        this.name = "DispatchDepthExceeded";
    }
}
export class DispatchFanoutExceeded extends Error {
    constructor(message) {
        super(message);
        this.name = "DispatchFanoutExceeded";
    }
}
export class DispatchWorktreeError extends Error {
    constructor(message) {
        super(message);
        this.name = "DispatchWorktreeError";
    }
}
export class DispatchConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = "DispatchConfigError";
    }
}

// Firebase App v10.12.0 - Core SDK Local
const _apps = new Map();
export function initializeApp(options, name = "[DEFAULT]") {
    if (typeof options !== "object" || !options) {
        throw new Error("Invalid Firebase options passed to initializeApp()");
    }
    if (_apps.has(name)) return _apps.get(name);
    const app = { name, options, automaticDataCollectionEnabled: false };
    _apps.set(name, app);
    return app;
}
export function _getProvider() {
    return { getImmediate: () => ({}) };
}

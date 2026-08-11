// Firebase App v10.12.0 - Core SDK
const _apps = new Map();
const _components = new Map();
function initializeApp(options, name = "[DEFAULT]") {
    if (typeof options !== "object" || !options) {
        throw new Error("Invalid Firebase options passed to initializeApp()");
    }
    if (_apps.has(name)) return _apps.get(name);
    const app = { name, options, automaticDataCollectionEnabled: false };
    _apps.set(name, app);
    return app;
}
function _getProvider(app, name) {
    return { getImmediate: () => ({}) };
}
export { initializeApp, _getProvider };

import { script } from './playcanvas-stable.min.mjs';

const ASSET_PREFIX = "";
const SCRIPT_PREFIX = "";
const SCENE_PATH = "2608607.json";
const CONTEXT_OPTIONS = {
    'antialias': true,
    'alpha': false,
    'preserveDrawingBuffer': false,
    'deviceTypes': [
        `webgl2`,
        `webgl1`
    ],
    'powerPreference': "high-performance"
};
const SCRIPTS = [
    309265356,
    309300378
];
const CONFIG_FILENAME = "config.json";
const INPUT_SETTINGS = {
    useKeyboard: true,
    useMouse: true,
    useGamepads: false,
    useTouch: true
};
const PRELOAD_MODULES = [];
script.legacy = false;

export { ASSET_PREFIX, CONFIG_FILENAME, CONTEXT_OPTIONS, INPUT_SETTINGS, PRELOAD_MODULES, SCENE_PATH, SCRIPTS, SCRIPT_PREFIX };

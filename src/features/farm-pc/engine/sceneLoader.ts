import { Asset, HierarchyHandler, type AppBase, type Entity } from 'playcanvas';
import { validateCorner } from '../naming';
import { attachBindings, extractBindings, isTrustedScript } from '../scripts/bindings';

/** Script assets are metadata only: validated imported classes replace exported code. */
export const TRUSTED_SCRIPT_ASSET_POLICY = 'host-imported-farm-scripts-only' as const;

function packageUrl(url: string, base: URL): string {
  const resolved = new URL(url, base);
  const decoded = decodeURIComponent(resolved.pathname);
  if (/%(?:2e|2f|5c|25)/i.test(decoded)) throw new Error('Encoded URL outside scene package');
  if (
    !['http:', 'https:'].includes(resolved.protocol) ||
    resolved.origin !== base.origin ||
    resolved.username ||
    resolved.password ||
    !decoded.startsWith(new URL('.', base).pathname) ||
    decoded.includes('\\') ||
    decoded.split('/').some((part) => part === '..' || part === '.')
  )
    throw new Error('URL outside scene package');
  return resolved.href;
}
function validateNestedUrls(value: unknown, base: URL): unknown {
  if (Array.isArray(value)) return value.map((item) => validateNestedUrls(item, base));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /^(url|uri)$/i.test(key) && typeof item === 'string'
        ? packageUrl(item, base)
        : validateNestedUrls(item, base),
    ]),
  );
}

/** Editor exports do not contain an engine version; the host pins 2.22.6. */
export function adaptSceneConfig(config: Record<string, unknown>) {
  if (config.schemaVersion === 1) return config;
  const scenes = config.scenes as { url?: unknown }[] | undefined;
  const properties = config.application_properties as Record<string, unknown> | undefined;
  if (
    !properties ||
    !Array.isArray(scenes) ||
    scenes.length !== 1 ||
    typeof scenes[0]?.url !== 'string'
  )
    throw new Error('Unsupported Editor scene config: exactly one scene required');
  if (
    (properties.externalScripts as unknown[] | undefined)?.length ||
    (properties.libraries as unknown[] | undefined)?.length
  )
    throw new Error('Editor external scripts/libraries are not executable in the farm host');
  return { ...config, schemaVersion: 1, engineVersion: '2.22.6', scene: scenes[0].url };
}

/** Opt-in: ?scene=v1 resolves to public/farm-scenes/v1/config.json. No persistence. */
export function readSceneConfig(search = window.location.search): string | undefined {
  const version = new URLSearchParams(search).get('scene');
  return version && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(version)
    ? `${import.meta.env.BASE_URL}farm-scenes/${version}/config.json`
    : undefined;
}

export interface LoadedCorner {
  hierarchy: Entity;
  plotIds: number[];
  /** Explicit exemption report; these IDs were validated but never registered/loaded. */
  scriptAssetPolicy: typeof TRUSTED_SCRIPT_ASSET_POLICY;
  exemptScriptAssetIds: number[];
  dispose(): void;
}

/** Export envelope: schemaVersion:1, engineVersion:'2.22.6', scene:'scene.json',
 * plotIds:number[], assets: the Editor config asset dictionary. Relative files
 * resolve beside config.json. Scripts/bundles are deliberately not executable.
 */
export async function loadCorner(
  app: AppBase,
  configUrl: string,
  signal: AbortSignal,
): Promise<LoadedCorner> {
  const controller = new AbortController();
  const externalSignal = signal;
  const abort = () => controller.abort();
  externalSignal.addEventListener('abort', abort, { once: true });
  if (externalSignal.aborted) abort();
  signal = controller.signal;
  const assets: Asset[] = [];
  const exemptScriptAssetIds: number[] = [];
  let hierarchy: Entity | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    controller.abort();
    hierarchy?.destroy();
    for (const asset of assets) {
      app.assets.remove(asset);
      asset.unload();
    }
  };
  const json = async (url: string) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Scene HTTP ${response.status}`);
    if (response.url) packageUrl(response.url, new URL(url));
    return response.json();
  };
  try {
    signal.throwIfAborted();
    const base = new URL(configUrl, window.location.href);
    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.origin !== window.location.origin ||
      base.username ||
      base.password
    )
      throw new Error('Config URL outside host');
    const rawConfig = await json(base.href);
    const config = { ...rawConfig, ...adaptSceneConfig(rawConfig) };
    const editor = rawConfig.schemaVersion !== 1;
    signal.throwIfAborted();
    if (
      config.schemaVersion !== 1 ||
      config.engineVersion !== '2.22.6' ||
      typeof config.scene !== 'string' ||
      (!editor &&
        (!Array.isArray(config.plotIds) ||
          !config.plotIds.every((id: unknown) => Number.isSafeInteger(id) && Number(id) > 0) ||
          new Set(config.plotIds).size !== config.plotIds.length)) ||
      !config.assets ||
      typeof config.assets !== 'object'
    ) {
      throw new Error('Unsupported farm scene config');
    }
    const properties = config.application_properties;
    if (properties && (properties.externalScripts?.length || properties.libraries?.length))
      throw new Error('External scripts/libraries are not executable in the farm host');
    const sceneUrl = new URL(packageUrl(config.scene, base));
    const data = await json(sceneUrl.href);
    signal.throwIfAborted();
    const plotIds: number[] = editor
      ? Object.values(data.entities ?? {})
          .map((entity) => /^plot-([1-9]\d*)$/.exec((entity as { name: string }).name)?.[1])
          .filter(Boolean)
          .map(Number)
          .sort((a, b) => a - b)
      : (config.plotIds as number[]);
    const extracted = extractBindings(data);
    const scriptIds = properties?.scripts;
    if (
      scriptIds !== undefined &&
      (!Array.isArray(scriptIds) ||
        scriptIds.some(
          (id: unknown) =>
            !Number.isSafeInteger(id) || config.assets[String(id)]?.type !== 'script',
        ))
    )
      throw new Error('Invalid host script asset references');
    for (const [key, value] of Object.entries(config.assets)) {
      const raw = value as { name: string; type: string; file?: { url: string }; data?: object };
      const id = Number(key);
      if (!Number.isSafeInteger(id) || id <= 0 || app.assets.get(id))
        throw new Error('Duplicate/invalid asset id');
      // Validate all executable asset metadata, but never register or load it.
      if (raw.type === 'script') {
        const metadata = raw.data as { scripts?: Record<string, unknown> } | undefined;
        if (
          !metadata?.scripts ||
          !Object.keys(metadata.scripts).length ||
          Object.keys(metadata.scripts).some((name) => !isTrustedScript(name))
        )
          throw new Error('Untrusted script asset under host policy');
        if (raw.file) validateNestedUrls(raw.file, base);
        exemptScriptAssetIds.push(id);
        continue;
      }
      if (
        ![
          'texture',
          'material',
          'render',
          'model',
          'container',
          'json',
          'binary',
          'template',
          'cubemap',
        ].includes(raw.type)
      ) {
        throw new Error(`Unsupported asset type: ${raw.type}`);
      }
      const file = raw.file ? (validateNestedUrls(raw.file, base) as typeof raw.file) : undefined;
      const asset = new Asset(
        raw.name,
        raw.type as ConstructorParameters<typeof Asset>[1],
        file,
        validateNestedUrls(raw.data, base) as object | undefined,
      );
      asset.id = id;
      assets.push(asset);
      app.assets.add(asset);
    }
    await Promise.all(
      assets.map(
        (asset) =>
          new Promise<void>((resolve, reject) => {
            const finish = (error?: unknown) => {
              asset.off('load', loaded);
              asset.off('error', failed);
              signal.removeEventListener('abort', aborted);
              if (error) reject(error);
              else resolve();
            };
            const loaded = () => {
              if (signal.aborted) asset.unload();
              finish();
            };
            const failed = (error: unknown) => finish(error || new Error('Asset load failed'));
            const aborted = () => {
              // AssetRegistry loading cannot be cancelled. Keep a one-shot cleanup
              // after settlement so a late resource never survives disposal.
              asset.once('load', () => asset.unload());
              finish(new Error('Scene cancelled'));
            };
            asset.once('load', loaded);
            asset.once('error', failed);
            signal.addEventListener('abort', aborted, { once: true });
            app.assets.load(asset);
          }),
      ),
    );
    signal.throwIfAborted();
    // Real 2.22.6 hierarchy parser; detached until validation and binding succeed.
    hierarchy = new HierarchyHandler(app).open(sceneUrl.href, extracted.data);
    const check = validateCorner(hierarchy, plotIds);
    if (!check.ok) throw new Error(`Invalid corner: ${check.missing.join(', ')}`);
    attachBindings(hierarchy, extracted.bindings);
    signal.throwIfAborted();
    return {
      hierarchy,
      plotIds,
      scriptAssetPolicy: TRUSTED_SCRIPT_ASSET_POLICY,
      exemptScriptAssetIds,
      dispose,
    };
  } catch (error) {
    controller.abort();
    dispose();
    throw error;
  } finally {
    externalSignal.removeEventListener('abort', abort);
  }
}

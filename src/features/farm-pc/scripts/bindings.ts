import { type Entity } from 'playcanvas';
import { FARM_SCRIPTS } from './motion';

const types = new Map(FARM_SCRIPTS.map((type) => [type.scriptName, type]));
const fields: Record<string, Record<string, 'number' | 'boolean' | 'string'>> = {
  farmSway: { amplitude: 'number', speed: 'number', phase: 'number' },
  farmPop: { duration: 'number', from: 'number', playOnStart: 'boolean' },
  farmDoor: { openAngle: 'number', target: 'string' },
  farmLamp: { intensity: 'number', glow: 'string' },
  farmFx: { kind: 'string', lift: 'number' },
};
export function isTrustedScript(name: string): boolean {
  return types.has(name);
}
export interface SceneEntity {
  resource_id: string;
  name: string;
  components: Record<string, unknown>;
}
interface Binding {
  id: string;
  enabled: boolean;
  scripts: { name: string; enabled: boolean; properties: Record<string, unknown> }[];
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid script binding object');
  return value as Record<string, unknown>;
}
function enabled(value: unknown): boolean {
  if (value !== undefined && typeof value !== 'boolean') throw new Error('Invalid script enabled');
  return value !== false;
}
/** Validated host replacement policy: no exported code reaches the hierarchy parser. */
export function extractBindings(data: { entities: Record<string, SceneEntity> }) {
  const bindings: Binding[] = [];
  const entities: Record<string, SceneEntity> = {};
  for (const [id, entity] of Object.entries(data.entities)) {
    const components = { ...entity.components };
    if (components.script !== undefined) {
      const component = object(components.script);
      const scripts = object(component.scripts);
      const order = component.order;
      if (
        !Array.isArray(order) ||
        order.some((name) => typeof name !== 'string') ||
        new Set(order).size !== order.length ||
        order.length !== Object.keys(scripts).length ||
        order.some((name) => !Object.hasOwn(scripts, name))
      )
        throw new Error('Invalid script order');
      bindings.push({
        id: entity.resource_id || id,
        enabled: enabled(component.enabled),
        scripts: order.map((name: string) => {
          if (!isTrustedScript(name)) throw new Error(`Unknown scene script: ${name}`);
          const script = object(scripts[name]);
          const properties = { ...object(script.attributes ?? {}) };
          for (const [key, value] of Object.entries(properties)) {
            if (name === 'farmLamp' && key === 'glow' && value === null) continue;
            const type = fields[name]?.[key];
            if (!type || typeof value !== type || (type === 'number' && !Number.isFinite(value)))
              throw new Error(`Invalid script attribute: ${name}.${key}`);
          }
          if (
            name === 'farmPop' &&
            typeof properties.duration === 'number' &&
            properties.duration <= 0
          )
            throw new Error('Invalid farmPop.duration');
          if (
            name === 'farmDoor' &&
            properties.target !== undefined &&
            properties.target !== 'barn' &&
            properties.target !== 'plot'
          )
            throw new Error('Invalid farmDoor.target');
          if (
            name === 'farmFx' &&
            properties.kind !== undefined &&
            !['water', 'plant', 'harvest', 'dust', 'sparkle'].includes(String(properties.kind))
          )
            throw new Error('Invalid farmFx.kind');
          // Editor presentation names map to the host event vocabulary explicitly.
          if (name === 'farmFx' && properties.kind === 'dust') properties.kind = 'plant';
          if (name === 'farmFx' && properties.kind === 'sparkle') properties.kind = 'harvest';
          return { name, enabled: enabled(script.enabled), properties };
        }),
      });
      delete components.script;
    }
    entities[id] = { ...entity, components };
  }
  return { data: { ...data, entities }, bindings };
}
export function attachBindings(root: Entity, bindings: Binding[]) {
  const byGuid = new Map<string, Entity>();
  const byName = new Map<string, Entity[]>();
  const visit = (entity: Entity) => {
    byGuid.set(entity.guid, entity);
    byName.set(entity.name, [...(byName.get(entity.name) ?? []), entity]);
    for (const child of entity.children) visit(child as Entity);
  };
  visit(root);
  for (const binding of bindings) {
    const entity = byGuid.get(binding.id);
    if (!entity) throw new Error(`Missing script entity: ${binding.id}`);
    entity.addComponent('script', { enabled: binding.enabled });
    for (const script of binding.scripts) {
      const properties = { ...script.properties };
      if (typeof properties.glow === 'string') {
        const matches = byName.get(properties.glow);
        const glow =
          byGuid.get(properties.glow) ?? (matches?.length === 1 ? matches[0] : undefined);
        if (!glow) throw new Error(`Unresolved lamp glow: ${properties.glow}`);
        properties.glow = glow;
      }
      entity.script!.create(types.get(script.name)!, { enabled: script.enabled, properties });
    }
  }
}

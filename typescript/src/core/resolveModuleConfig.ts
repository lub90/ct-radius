export function resolveModuleConfig(
  cfg: Record<string, any>,
  moduleName: string,
  visited: Set<string> = new Set()
): Record<string, any> {

  // Detect inheritance cycles
  if (visited.has(moduleName)) {
    throw new Error(`Inheritance cycle detected while resolving module '${moduleName}'.`);
  }
  visited.add(moduleName);

  const moduleCfg = cfg[moduleName];
  if (!moduleCfg) {
    throw new Error(`Module '${moduleName}' does not exist in configuration.`);
  }

  // If this module defines a type, it is the root of the chain
  if (moduleCfg.type) {
    return { ...moduleCfg };
  }

  // If no type is defined, it must inherit from another module
  if (!moduleCfg.inherits) {
    throw new Error(
      `Module '${moduleName}' has neither 'type' nor 'inherits'. This should be impossible due to schema validation.`
    );
  }

  const parentName = moduleCfg.inherits;

  // Recursively resolve the parent module
  const parentResolved = resolveModuleConfig(cfg, parentName, visited);

  // Merge parent → child (child overrides parent)
  var result = {
    ...parentResolved,
    ...moduleCfg
  };
  // Remove 'inherits' from the final result, as it's not needed anymore
  delete result.inherits;

  return result;
}

import { readFileSync } from 'node:fs'

/**
 * Vite plugin for ClojureScript + shadow-cljs dev workflow:
 *
 * 1. Intercepts Tailwind's full-reload (triggered by @source .cljs changes)
 *    and converts it to CSS-only HMR updates — shadow-cljs handles JS HMR.
 *
 * 2. Suppresses Vite's HMR/reload for target/dev/ files (shadow-cljs handles
 *    JS HMR independently). Vite still watches these files so its transform
 *    cache stays fresh on manual page refresh.
 *
 * 3. Makes external.js HMR-capable (self-accepting) so dependency changes
 *    (add/remove) are handled without full page reload.
 */
export default function cljsHmrGuard() {
  let lastExternalContent = null

  return {
    name: 'cljs-hmr-guard',
    apply: 'serve',

    transform(code, id) {
      if (!id.includes('/target/dev/') || !id.endsWith('external.js')) return

      // Persist ALL across HMR re-executions so removed deps remain available
      code = code.replace(
        /\b(const|let|var)\s+(\w+)\s*=\s*\{\s*\}/,
        '$1 $2 = globalThis.__shadow$ALL ??= {}'
      )

      // Return a deep lazy proxy instead of throwing for deps not yet loaded.
      // The proxy re-reads ALL on every trap call, so it becomes transparent
      // the moment Vite populates the dependency via HMR.
      code = code.replace(
        /throw\s+new\s+Error\([^)]*not provided[^)]*\)/,
        'return globalThis.__shadow$lazyProxy(name)'
      )

      // Prepend the lazy proxy factory before the module body
      code = `
globalThis.__shadow$lazyProxy = function(depName) {
  console.warn("[cljs-hmr] dependency", depName, "loading lazily...");
  function createProxy(path) {
    const cache = new Map();
    function resolve() {
      const root = globalThis.__shadow$ALL?.[depName];
      if (root === undefined) return undefined;
      return path.reduce((o, k) => o?.[k], root);
    }
    const target = function() {};
    return new Proxy(target, {
      get(_, prop) {
        const resolved = resolve();
        if (resolved !== undefined && resolved !== null) return resolved[prop];
        if (prop === '__esModule') return true;
        if (prop === 'then' || prop === 'prototype') return undefined;
        if (prop === Symbol.toPrimitive) return () => '';
        if (prop === Symbol.toStringTag) return 'ShadowProxy';
        if (typeof prop === 'symbol') return undefined;
        let nested = cache.get(prop);
        if (!nested) { nested = createProxy([...path, prop]); cache.set(prop, nested); }
        return nested;
      },
      apply(_, thisArg, args) {
        const resolved = resolve();
        if (typeof resolved === 'function') return Reflect.apply(resolved, thisArg, args);
        return null;
      },
      construct(_, args, newTarget) {
        const resolved = resolve();
        if (typeof resolved === 'function') return Reflect.construct(resolved, args, newTarget);
        return {};
      },
      has(_, prop) {
        const resolved = resolve();
        if (resolved != null) return prop in Object(resolved);
        return prop === '__esModule';
      },
    });
  }
  return createProxy([]);
};
` + code

      // Self-accept HMR and dispatch wake-up event for React re-render
      code += [
        '',
        'if (import.meta.hot) {',
        '  import.meta.hot.accept(() => {',
        '    window.dispatchEvent(new CustomEvent("shadow-cljs:deps-ready"));',
        '  });',
        '}',
      ].join('\n')

      return code
    },

    hotUpdate({ file }) {
      if (!file.includes('/target/dev/')) return

      if (file.endsWith('/external.js')) {
        let content
        try { content = readFileSync(file, 'utf-8') } catch { return [] }
        if (lastExternalContent === null || content === lastExternalContent) {
          lastExternalContent = content
          return []
        }
        lastExternalContent = content
        // New imports added — force full-reload so all modules are eager.
        // HMR self-accept can't guarantee CLJS shims see real modules
        // (race: shadow-cljs runs before Vite processes updated external.js).
        return [{ type: 'full-reload', path: file }]
      }

      // Other target/dev/ files: shadow-cljs handles HMR, suppress Vite's
      return []
    },

    configureServer(server) {
      const originalSend = server.ws.send.bind(server.ws)

      // Intercept Tailwind's path-less full-reload → CSS-only update
      server.ws.send = function (payload) {
        if (payload?.type === 'full-reload' && !payload.path) {
          const cssModules = []
          server.moduleGraph.fileToModulesMap.forEach((mods, file) => {
            if (file.endsWith('.css')) {
              for (const mod of mods) cssModules.push(mod)
            }
          })
          if (cssModules.length) {
            originalSend({
              type: 'update',
              updates: cssModules.map(mod => ({
                type: 'css-update',
                path: mod.url,
                acceptedPath: mod.url,
                timestamp: Date.now(),
              })),
            })
          }
          return
        }
        originalSend(payload)
      }
    },
  }
}

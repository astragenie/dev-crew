import { GithubProvider } from "./providers/github-provider.mjs";
import { LinearProvider } from "./providers/linear-provider.mjs";
import { NoopProvider } from "./providers/noop-provider.mjs";
export { GithubProvider, LinearProvider, NoopProvider };
/**
 * Resolve the configured task-store provider from a merged loop.json config.
 *
 * Resolution order:
 * 1. `config.taskStore.provider` — explicit provider name ('github' | 'linear' | 'noop')
 * 2. `config.taskStore.enabled === false` — force noop regardless of provider field
 * 3. `config.github.enabled === true` — back-compat: treat as provider 'github'
 * 4. Default: NoopProvider (no external tracker configured)
 *
 * @param config - fully-resolved loop.json config (from resolveConfig)
 * @param repoPath - absolute path to the repository root
 */
export function getProvider(config, repoPath) {
    const ts = config?.taskStore;
    // Explicit disable
    if (ts?.enabled === false) {
        return new NoopProvider();
    }
    const providerName = ts?.provider ?? (config?.github?.enabled === true ? "github" : undefined);
    switch (providerName) {
        case "github":
            return new GithubProvider(repoPath, config);
        case "linear":
            return new LinearProvider(repoPath, config);
        case "noop":
            return new NoopProvider();
        default:
            if (providerName !== undefined) {
                console.warn(`[task-store] Unknown provider "${providerName}" — falling back to NoopProvider. ` +
                    `Check taskStore.provider in loop.json. Valid values: github, noop, linear.`);
            }
            return new NoopProvider();
    }
}

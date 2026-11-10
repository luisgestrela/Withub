// Cache em memória com TTL e "single flight": várias requisições simultâneas
// com o cache vencido compartilham uma única ida ao Supabase.
export function createCache(ttlMs) {
  let value, expires = 0, pending = null;
  return {
    async get(loader) {
      if (Date.now() < expires) return value;
      if (!pending) {
        pending = loader()
          .then((result) => { value = result; expires = Date.now() + ttlMs; return result; })
          .finally(() => { pending = null; });
      }
      return pending;
    },
    clear() { expires = 0; },
  };
}

// Cloudflare Turnstile, explicit rendering - shared by /login and /register.
// The widget is kept (not re-rendered) because the page stays open after a failed
// attempt and tokens are single-use: each attempt executes, then resets. It only
// becomes visible if Cloudflare asks for interaction.

// A challenge that never calls back must not leave the button spinning.
const TURNSTILE_TIMEOUT_MS = 15_000;

export function createTurnstile(containerId: string, siteKey: string, action: string) {
  let widgetId: string | null = null;
  let pending: ((token: string) => void) | null = null;
  // The widget can finish before the visitor submits (interaction-only widgets
  // clear themselves in the background), so the token is kept, not just
  // delivered to a pending submit.
  let token = "";

  const settle = (value: string) => {
    const resolve = pending;
    pending = null;
    resolve?.(value);
  };

  const render = () => {
    const container = document.getElementById(containerId);
    const turnstile = (window as any).turnstile;
    if (!container || !siteKey || widgetId) return;
    if (!turnstile?.render) return;
    try {
      widgetId = turnstile.render(container, {
        sitekey: siteKey,
        action,
        execution: "execute",
        appearance: "interaction-only",
        callback: (value: string) => {
          token = value || "";
          settle(token);
        },
        "error-callback": () => settle(""),
      });
    } catch {
      // A render that throws leaves no widget id, so the next attempt retries.
      widgetId = null;
    }
  };

  // The loader is async and can land after this module runs, so poll briefly
  // rather than depend on a global onload callback.
  if (siteKey) {
    if ((window as any).turnstile?.render) {
      render();
    } else {
      let tries = 0;
      const timer = setInterval(() => {
        if ((window as any).turnstile?.render) {
          clearInterval(timer);
          render();
        } else if (++tries > 100) {
          clearInterval(timer);
        }
      }, 100);
    }
  }

  return {
    /** One token per attempt. Resolves to "" when the challenge cannot run. */
    execute: (): Promise<string> =>
      new Promise((resolve) => {
        const turnstile = (window as any).turnstile;
        if (!siteKey || !widgetId || !turnstile?.execute) {
          resolve("");
          return;
        }

        // A token that arrived before this submit is still valid and single-use:
        // consume it instead of executing again (an execute on a finished widget
        // never calls back).
        if (token) {
          const value = token;
          token = "";
          resolve(value);
          return;
        }

        const existing = turnstile.getResponse?.(widgetId);
        if (existing) {
          resolve(existing);
          return;
        }

        let settled = false;
        const finish = (value: string) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        };
        const timer = setTimeout(() => finish(""), TURNSTILE_TIMEOUT_MS);

        pending = finish;
        try {
          turnstile.execute(widgetId);
        } catch {
          settle("");
        }
      }),

    reset: () => {
      pending = null;
      token = "";
      const turnstile = (window as any).turnstile;
      if (widgetId && turnstile?.reset) {
        turnstile.reset(widgetId);
      }
    },
  };
}

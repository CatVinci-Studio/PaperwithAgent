// Drives the ChatGPT (Codex) OAuth flow from the renderer. Generates
// PKCE, opens the user's browser, waits for the loopback callback,
// exchanges the code for tokens, and persists them via the existing
// keychain `saveKey` path under the same provider id with `:oauth`
// suffix. `loadKey(<id>)` keeps returning the API key (if set) — the
// two paths coexist; the provider picks based on which one is non-empty.

import {
  buildAuthorizeUrl,
  CODEX_LOOPBACK_PORT,
  exchangeCode,
  generatePkce,
  generateState,
  type CodexTokens,
} from '@shared/oauth/codex'
import { api } from '@/lib/ipc'

const CALLBACK_PATH = '/auth/callback'
const TIMEOUT_SECS = 5 * 60

export async function signInWithChatGpt(providerId: string): Promise<CodexTokens> {
  const { verifier, challenge } = await generatePkce()
  const state = generateState()
  const url = buildAuthorizeUrl(challenge, state)

  // Start the loopback listener BEFORE opening the browser to avoid the
  // race where the OAuth provider redirects faster than the listener binds.
  const callback = api.oauth.loopbackWait(CODEX_LOOPBACK_PORT, CALLBACK_PATH, TIMEOUT_SECS)
  await api.net.openExternal(url)
  const { code, state: returnedState } = await callback
  if (returnedState !== state) {
    throw new Error('OAuth state mismatch — possible CSRF attempt')
  }

  const tokens = await exchangeCode(code, verifier)
  await api.agent.saveKey(`${providerId}:oauth`, JSON.stringify(tokens), true)
  return tokens
}

export async function signOutChatGpt(providerId: string): Promise<void> {
  // Drop both persisted + session copies by routing through saveKey
  // with remember=false, then clearing the session entry. `agent_save_key`
  // with remember=false deletes the persisted secret.
  await api.agent.saveKey(`${providerId}:oauth`, '', false)
}

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader, Wifi } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/ipc'
import { useUIStore } from '@/store/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingSection } from '@/components/ui/setting-section'
import { SettingSegmented } from '@/components/ui/setting-segmented'
import { cn } from '@/lib/utils'
import type { AgentProfile } from '@shared/types'

export function GeneralTab() {
  return (
    <div className="space-y-6">
      <BasicSection />
      <ProviderSection />
    </div>
  )
}

// ── Basic ───────────────────────────────────────────────────────────────────

function BasicSection() {
  const { theme, toggleTheme } = useUIStore()

  return (
    <SettingSection title="Basic" description="Adjust how the interface looks.">
      <SettingRow label="Color scheme" description="Affects all surfaces and accent treatment.">
        <SettingSegmented<'dark' | 'light'>
          value={theme}
          onValueChange={(t) => {
            if (theme !== t) toggleTheme()
          }}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
      </SettingRow>
    </SettingSection>
  )
}

// ── Provider ────────────────────────────────────────────────────────────────

function ProviderSection() {
  const queryClient = useQueryClient()
  const { data: profiles, refetch } = useQuery({
    queryKey: ['agent', 'profiles'],
    queryFn: () => api.agent.getProfiles(),
  })

  const { data: activeName } = useQuery({
    queryKey: ['agent', 'config'],
    queryFn: async () => {
      const cfg = await api.agent.getConfig()
      return cfg?.defaultProfile ?? null
    },
  })

  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)

  const active = profiles?.find((p) => p.name === activeName) ?? profiles?.[0]

  // Reset transient input state when active provider changes
  useEffect(() => {
    setKeyInput('')
    setTestResult(null)
  }, [activeName])

  const switchProvider = async (name: string) => {
    if (name === activeName) return
    await api.agent.setProfile(name)
    queryClient.invalidateQueries({ queryKey: ['agent'] })
  }

  const handleSaveKey = async () => {
    if (!active || !keyInput.trim()) return
    setSaving(true)
    try {
      await api.agent.saveKey(active.name, keyInput.trim())
      setKeyInput('')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  const handleTestKey = async () => {
    if (!active) return
    setTesting(true)
    setTestResult(null)
    try {
      const ok = await api.agent.testKey(active.name)
      setTestResult(ok)
    } finally {
      setTesting(false)
    }
  }

  return (
    <SettingSection
      title="Model provider"
      description="Pick a provider, then configure its API key. Clicking a provider switches the active one."
    >
      <div className="space-y-4 pt-2">
        {/* Current provider summary */}
        {active && (
          <div className="text-[12px] text-[var(--text-muted)]">
            Current:{' '}
            <span className="font-medium text-[var(--text-primary)]">{active.name}</span>
            <span className="ml-1 text-[var(--text-dim)]">/ {active.model}</span>
          </div>
        )}

        {/* Provider pill grid */}
        {profiles && profiles.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {profiles.map((p: AgentProfile) => (
              <ProviderPill
                key={p.name}
                profile={p}
                active={p.name === active?.name}
                onClick={() => switchProvider(p.name)}
              />
            ))}
          </div>
        )}

        {/* Active provider details */}
        {active && (
          <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
            <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2 items-center text-[12px]">
              <span className="text-[var(--text-muted)]">Base URL</span>
              <span className="text-[var(--text-secondary)] truncate" title={active.baseUrl}>
                {active.baseUrl}
              </span>
              <span className="text-[var(--text-muted)]">Model</span>
              <span className="text-[var(--text-secondary)]">{active.model}</span>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                API Key
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder={active.hasKey ? '••••••••••••••••' : 'sk-...'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                  className="flex-1"
                />
                <Button
                  variant="accent"
                  size="xl"
                  onClick={handleSaveKey}
                  disabled={saving || !keyInput.trim()}
                >
                  {saving ? <Loader size={12} className="animate-spin" /> : 'Save'}
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleTestKey}
                  disabled={testing || !active.hasKey}
                  className="rounded-[8px]"
                >
                  {testing ? <Loader size={11} className="animate-spin" /> : <Wifi size={11} />}
                  Test connection
                </Button>

                {testResult !== null && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-[11.5px]',
                      testResult ? 'text-[var(--status-read)]' : 'text-[var(--danger)]'
                    )}
                  >
                    {testResult ? (
                      <>
                        <CheckCircle size={11} /> Connected
                      </>
                    ) : (
                      <>
                        <XCircle size={11} /> Failed
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingSection>
  )
}

// ── Pill ────────────────────────────────────────────────────────────────────

function ProviderPill({
  profile,
  active,
  onClick,
}: {
  profile: AgentProfile
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative px-3 py-2 rounded-full text-[12px] font-medium text-center transition-all duration-150 active:scale-[0.98]',
        active
          ? 'bg-[var(--accent-color)] text-[var(--accent-on)]'
          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      )}
    >
      <span className="block truncate">{profile.name}</span>
      {profile.hasKey && (
        <span
          className={cn(
            'absolute -top-1 -right-1 w-2 h-2 rounded-full',
            active ? 'bg-[var(--bg-surface)]' : 'bg-[var(--status-read)]'
          )}
          title="API key saved"
        />
      )}
    </button>
  )
}

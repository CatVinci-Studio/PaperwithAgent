import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Loader, Wifi } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
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
  const { data: profiles, refetch } = useQuery({
    queryKey: ['agent', 'profiles'],
    queryFn: () => api.agent.getProfiles(),
  })

  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [keyInput, setKeyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)

  const profile = profiles?.find((p) => p.name === selectedProfile)

  useEffect(() => {
    if (profiles && profiles.length > 0 && !selectedProfile) {
      setSelectedProfile(profiles[0].name)
    }
  }, [profiles, selectedProfile])

  const handleSaveKey = async () => {
    if (!selectedProfile || !keyInput.trim()) return
    setSaving(true)
    try {
      await api.agent.saveKey(selectedProfile, keyInput.trim())
      setKeyInput('')
      refetch()
    } finally {
      setSaving(false)
    }
  }

  const handleTestKey = async () => {
    if (!selectedProfile) return
    setTesting(true)
    setTestResult(null)
    try {
      const ok = await api.agent.testKey(selectedProfile)
      setTestResult(ok)
    } finally {
      setTesting(false)
    }
  }

  const handleSetActive = async (name: string) => {
    await api.agent.setProfile(name)
    refetch()
  }

  return (
    <SettingSection title="Model provider" description="Pick a provider profile and configure its API key.">
      <div className="space-y-4 pt-2">
        {profiles && profiles.length > 0 && (
          <div className="space-y-1.5">
            {profiles.map((p: AgentProfile) => {
              const active = selectedProfile === p.name
              return (
                <button
                  key={p.name}
                  onClick={() => setSelectedProfile(p.name)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-[12px] border text-left transition-all duration-150',
                    active
                      ? 'bg-[var(--bg-accent-subtle)] border-[var(--accent-color)]/25 text-[var(--text-primary)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-focus)]'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium">{p.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                      {p.baseUrl} · {p.model}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.hasKey ? (
                      <CheckCircle size={13} className="text-[var(--status-read)]" />
                    ) : (
                      <XCircle size={13} className="text-[var(--text-dim)]" />
                    )}
                    <span
                      className={cn(
                        'text-[10.5px]',
                        p.hasKey ? 'text-[var(--status-read)]' : 'text-[var(--text-muted)]'
                      )}
                    >
                      {p.hasKey ? 'Key saved' : 'No key'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {selectedProfile && (
          <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-medium text-[var(--text-secondary)]">
                API Key — <span className="text-[var(--text-primary)]">{selectedProfile}</span>
              </label>
              <button
                onClick={() => handleSetActive(selectedProfile)}
                className="text-[10.5px] font-medium text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors"
              >
                Set as active profile
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={profile?.hasKey ? '••••••••••••••••' : 'sk-...'}
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
                disabled={testing || !profile?.hasKey}
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
        )}
      </div>
    </SettingSection>
  )
}

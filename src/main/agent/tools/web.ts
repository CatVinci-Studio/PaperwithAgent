import TurndownService from 'turndown'

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' })
turndown.remove(['script', 'style', 'noscript', 'iframe'])

export async function webFetch(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    return JSON.stringify({ error: 'URL must start with http:// or https://' })
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Verko/0.1 (mailto:leonardoshen@icloud.com)' },
    })
    if (!res.ok) {
      return JSON.stringify({ error: `Fetch failed: ${res.status} ${res.statusText}` })
    }
    const ct = res.headers.get('content-type') ?? ''
    const text = await res.text()
    if (ct.includes('text/html')) {
      const md = turndown.turndown(text)
      return JSON.stringify({ url, contentType: ct, markdown: md.slice(0, 50_000) })
    }
    if (ct.includes('json')) {
      return JSON.stringify({ url, contentType: ct, body: text.slice(0, 50_000) })
    }
    return JSON.stringify({ url, contentType: ct, text: text.slice(0, 50_000) })
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
  }
}

export { turndown }

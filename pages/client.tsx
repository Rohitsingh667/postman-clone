import React from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import styles from '../styles/Client.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const PAGE_SIZE = 20;

export default function RestClient() {
  const [method, setMethod] = React.useState<'GET'|'POST'|'PUT'|'DELETE'>('GET');
  const [url, setUrl] = React.useState('');
  const [headersText, setHeadersText] = React.useState('');
  const [bodyText, setBodyText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [response, setResponse] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [bodyIsJson, setBodyIsJson] = React.useState(true);
  const [methodFilter, setMethodFilter] = React.useState<'ALL'|'GET'|'POST'|'PUT'|'DELETE'>('ALL');

  const headersIsValid = React.useMemo(() => {
    if (!headersText.trim()) return true;
    try { JSON.parse(headersText); return true; } catch { return false; }
  }, [headersText]);

  const bodyJsonIsValid = React.useMemo(() => {
    if (!bodyIsJson || !bodyText.trim()) return true;
    try { JSON.parse(bodyText); return true; } catch { return false; }
  }, [bodyIsJson, bodyText]);

  const prettyBody = React.useMemo(() => {
    if (!response?.body) return '';
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      return response.body as string;
    }
  }, [response]);

  const responseSize = React.useMemo(() => {
    if (!response?.body) return 0;
    try { return new TextEncoder().encode(String(response.body)).length; } catch { return String(response.body).length; }
  }, [response]);

  const getKey = (pageIndex: number, prev: any) => {
    if (prev && !prev.items.length) return null;
    const page = pageIndex + 1;
    return `/api/history?page=${page}&pageSize=${PAGE_SIZE}`;
  };
  const { data, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, { revalidateFirstPage: true });
  const items = React.useMemo(() => (data ? data.flatMap((d: any) => d.items) : []), [data]);
  const filteredItems = React.useMemo(() => {
    if (methodFilter === 'ALL') return items;
    return items.filter((it: any) => it.method === methodFilter);
  }, [items, methodFilter]);
  const total = data?.[0]?.total ?? 0;

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && items.length < total && !isValidating) {
        setSize(size + 1);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [items.length, total, isValidating, setSize, size]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!sending && url && headersIsValid && bodyJsonIsValid) onSend();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [sending, url, headersIsValid, bodyJsonIsValid, method, headersText, bodyText, bodyIsJson]);

  const onSend = async () => {
    setSending(true); setError(null); setResponse(null);
    try {
      let headers: Record<string, string> | undefined = undefined;
      if (headersText.trim()) headers = JSON.parse(headersText);
      let body: any = undefined;
      if (method !== 'GET' && method !== 'HEAD' && bodyText) {
        body = bodyIsJson ? JSON.parse(bodyText) : bodyText;
        headers = headers || {};
        if (bodyIsJson && !('content-type' in Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(), v])))) {
          headers['content-type'] = 'application/json';
        }
      }
      const r = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ method, url, headers, body }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Request failed');
      setResponse(data);
      mutateFirstPage();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setSending(false);
    }
  };

  const { mutate: mutateFirstPage } = useSWR(`/api/history?page=1&pageSize=${PAGE_SIZE}`, fetcher);

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.pageTitle}>REST Client</h1>
      <div className={styles.layoutGrid}>
        <section className={styles.requestPanel}>
          <div className={styles.requestRow}>
            <select className={styles.methodSelect} value={method} onChange={e => setMethod(e.target.value as any)}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <input className={styles.urlInput} placeholder="https://api.example.com/resource" value={url} onChange={e => setUrl(e.target.value)} />
            <button className={styles.sendButton} onClick={onSend} disabled={sending || !url || !headersIsValid || !bodyJsonIsValid}>{sending ? 'Sending…' : 'Send'}{sending ? <span className={styles.spinner} /> : null}</button>
          </div>
          <div className={styles.editorGroup}>
            <div className={styles.editorColumn}>
              <label className={styles.editorLabel}>Headers (JSON)</label>
              <textarea className={styles.textArea} placeholder='{"accept":"application/json"}' value={headersText} onChange={e => setHeadersText(e.target.value)} />
              {!headersIsValid && <small className={styles.helperError}>Invalid JSON</small>}
            </div>
            <div className={styles.editorColumn}>
              <label className={styles.editorLabel}>Body</label>
              <textarea className={styles.textArea} placeholder='{"name":"John"} or raw text' value={bodyText} onChange={e => setBodyText(e.target.value)} />
              <div className={styles.toggleRow}>
                <label className={styles.checkboxLabel}><input type="checkbox" checked={bodyIsJson} onChange={e => setBodyIsJson(e.target.checked)} /> JSON</label>
                {!bodyJsonIsValid && <small className={styles.helperError}>Invalid JSON</small>}
              </div>
            </div>
          </div>
          <div className={styles.responsePanel}>
            <h2 className={styles.sectionTitle}>Response</h2>
            {error && <div className={styles.errorBox}>{error}</div>}
            {response && (
              <div className={styles.responseBox}>
                <div className={styles.responseMeta}>
                  <span className={response.status < 400 ? styles.statusOk : styles.statusError}>Status: {response.status}</span>
                  <span className={styles.timeBadge}>Time: {response.durationMs} ms</span>
                  <span className={styles.timeBadge}>Size: {responseSize} B</span>
                  <button className={styles.copyButton} onClick={() => navigator.clipboard.writeText(response.body || '')}>Copy Body</button>
                  <button className={styles.copyButton} onClick={() => navigator.clipboard.writeText(JSON.stringify(response.headers, null, 2))}>Copy Headers</button>
                </div>
                <details className={styles.headersDetails}>
                  <summary>Headers</summary>
                  <pre className={styles.codeBlock}>{JSON.stringify(response.headers, null, 2)}</pre>
                </details>
                <details className={styles.bodyDetails} open>
                  <summary>Body</summary>
                  <pre className={styles.codeBlock}>{prettyBody}</pre>
                </details>
              </div>
            )}
          </div>
        </section>
        <aside className={styles.historyPanel}>
          <h2 className={styles.sectionTitle}>History</h2>
          <div className={styles.filterBar}>
            {(['ALL','GET','POST','PUT','DELETE'] as const).map(m => (
              <button key={m} className={m === methodFilter ? `${styles.filterPill} ${styles.filterPillActive}` : styles.filterPill} onClick={() => setMethodFilter(m)}>{m}</button>
            ))}
          </div>
          <ul className={styles.historyList}>
            {filteredItems.map((it: any) => (
              <li key={it.id} className={styles.historyItem}>
                <a className={styles.historyLink} href={`/api/history/${it.id}`} target="_blank" rel="noreferrer" title="Open full log">
                  <span className={`${styles.methodBadge} ${styles['badge'+it.method] || ''}`}>{it.method}</span>
                  <span className={styles.urlText}>{it.url}</span>
                  <span className={styles.metaText}>{it.status} • {it.durationMs}ms • {new Date(it.createdAt).toLocaleString()}</span>
                </a>
              </li>
            ))}
          </ul>
          <div ref={sentinelRef} className={styles.sentinel} />
          {isValidating && <div className={styles.loadingText}>Loading…</div>}
        </aside>
      </div>
    </div>
  );
}

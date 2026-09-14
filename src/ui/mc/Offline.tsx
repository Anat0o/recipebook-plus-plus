/**
 * Загрузка версии для оффлайна.
 *
 * Предупреждение показывается до загрузки, а не после: и iOS, и Android
 * вытесняют данные сайта при нехватке места или после долгого простоя.
 * Обещать вечную копию было бы враньём, поэтому мы запрашиваем постоянное
 * хранение и честно показываем, что ответил браузер.
 */
import { useState } from 'react'
import { useApp } from '../../app/context.tsx'
import { versionFiles } from '../../lib/data.ts'

type Status = 'idle' | 'working' | 'done' | 'failed'

export function OfflineSection(): React.ReactElement {
  const { t, version, shards, sprites, meta } = useApp()
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  const supported = 'caches' in globalThis && 'serviceWorker' in navigator

  async function download(): Promise<void> {
    setStatus('working')
    setProgress(0)
    try {
      // Просим постоянное хранение до загрузки: отказ — не повод не качать,
      // но пользователь должен знать, на что рассчитывать.
      if (navigator.storage?.persist) setPersisted(await navigator.storage.persist())

      const files = versionFiles(version, { shards, tiles: meta.tiles }, sprites.file)
      const cache = await caches.open(`recipebook-data-${version}`)

      let done = 0
      for (const file of files) {
        // A partial pack is not offline support: one missing atlas or shard
        // must leave the operation failed and retryable.
        await cache.add(file)
        done += 1
        setProgress(Math.round((done / files.length) * 100))
      }
      setStatus('done')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <>
      <p className="settings-group__title">{t.offline}</p>
      <div className="settings-group settings-group--padded">
        <p className="settings-note">{t.offlineWarning}</p>

        {supported ? (
          <button
            type="button"
            className="mc-button"
            onClick={download}
            disabled={status === 'working'}
          >
            {status === 'working'
              ? `${t.offlineWorking} ${progress}%`
              : status === 'done'
                ? `${t.offlineDone} ✓`
                : t.offlineDownload}
          </button>
        ) : (
          <p className="settings-note">{t.offlineUnsupported}</p>
        )}

        {status === 'failed' ? <p className="notice">{t.offlineFailed}</p> : null}
        {status === 'done' && persisted !== null ? (
          <p className="settings-note">
            {persisted ? t.offlinePersisted : t.offlineNotPersisted}
          </p>
        ) : null}
      </div>
    </>
  )
}

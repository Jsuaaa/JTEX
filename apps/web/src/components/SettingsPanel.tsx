import { X } from 'lucide-react';
import {
  ACCENT_OPTIONS,
  useSettings,
  type Density,
  type EditorFont,
  type PaperTone,
  type Theme,
} from '../store/settings';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <div className="settings-body">
          <section className="settings-section">
            <div className="settings-label">Appearance</div>
            <div className="settings-row">
              <span className="row-label">Theme</span>
              <Segmented<Theme>
                value={s.theme}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
                onChange={(v) => s.set('theme', v)}
              />
            </div>
            <div className="settings-row">
              <span className="row-label">Accent</span>
              <div className="swatch-row">
                {ACCENT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    className={'swatch' + (s.accent === c ? ' is-active' : '')}
                    style={{ background: c }}
                    onClick={() => s.set('accent', c)}
                    aria-label={`Accent ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="settings-row">
              <span className="row-label">Paper tone</span>
              <Segmented<PaperTone>
                value={s.paperTone}
                options={[
                  { value: 'cream', label: 'Cream' },
                  { value: 'white', label: 'White' },
                ]}
                onChange={(v) => s.set('paperTone', v)}
              />
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-label">Editor</div>
            <div className="settings-row">
              <span className="row-label">Font</span>
              <select
                className="select-input"
                value={s.editorFont}
                onChange={(e) => s.set('editorFont', e.target.value as EditorFont)}
              >
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="IBM Plex Mono">IBM Plex Mono</option>
                <option value="Fira Code">Fira Code</option>
                <option value="Iosevka">Iosevka</option>
              </select>
            </div>
            <div className="settings-row">
              <span className="row-label">Line numbers</span>
              <button
                className={'toggle-pill' + (s.showLineNumbers ? ' is-on' : '')}
                onClick={() => s.set('showLineNumbers', !s.showLineNumbers)}
                aria-pressed={s.showLineNumbers}
              />
            </div>
            <div className="settings-row">
              <span className="row-label">Density</span>
              <Segmented<Density>
                value={s.density}
                options={[
                  { value: 'compact', label: 'Compact' },
                  { value: 'comfortable', label: 'Comfortable' },
                ]}
                onChange={(v) => s.set('density', v)}
              />
            </div>
            <div className="settings-row">
              <span className="row-label">Auto-recompile</span>
              <button
                className={'toggle-pill' + (s.autoCompile ? ' is-on' : '')}
                onClick={() => s.set('autoCompile', !s.autoCompile)}
                aria-pressed={s.autoCompile}
              />
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-label">Privacidad</div>
            <div className="settings-row">
              <span className="row-label">
                Recordar este proyecto en este navegador
                <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 2 }}>
                  Si está activo, tus archivos se guardan en IndexedDB de este navegador. Aún así,
                  jamás tocan el servidor.
                </div>
              </span>
              <button
                className={'toggle-pill' + (s.rememberProject ? ' is-on' : '')}
                onClick={() => s.set('rememberProject', !s.rememberProject)}
                aria-pressed={s.rememberProject}
                disabled
                title="Disponible en una versión próxima"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg-control" role="radiogroup">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          className={value === opt.value ? 'is-active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

import { useState } from 'react'
import { Toggle } from '../../components/global/index.jsx'

function ToppingOptionRow({ option, onChange, onDelete }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-text-muted cursor-grab text-sm">⠿</span>
      <input
        type="text"
        value={option.name}
        onChange={e => onChange({ ...option, name: e.target.value })}
        placeholder="Option name"
        className="flex-1 text-sm border border-border rounded-lg px-2.5 py-1.5 focus:border-brand-500 focus:outline-none"
      />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-text-muted">£</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={(option.price / 100).toFixed(2)}
          onChange={e => onChange({ ...option, price: Math.round(parseFloat(e.target.value || 0) * 100) })}
          className="w-16 text-sm border border-border rounded-lg px-2 py-1.5 text-right focus:border-brand-500 focus:outline-none"
        />
      </div>
      <button onClick={onDelete} className="w-6 h-6 rounded-full hover:bg-error-100 text-text-muted hover:text-error-500 transition-colors flex items-center justify-center text-sm">✕</button>
    </div>
  )
}

export default function ToppingBuilder({ groups, onChange }) {
  const addGroup = () => {
    onChange([...groups, {
      _id:         `new_${Date.now()}`,
      name:        '',
      required:    false,
      multiSelect: false,
      min:         0,
      max:         1,
      options:     [],
    }])
  }

  const updateGroup = (idx, data) => {
    onChange(groups.map((g, i) => i === idx ? { ...g, ...data } : g))
  }

  const deleteGroup = (idx) => {
    onChange(groups.filter((_, i) => i !== idx))
  }

  const addOption = (gIdx) => {
    const g = groups[gIdx]
    updateGroup(gIdx, { options: [...g.options, { name: '', price: 0 }] })
  }

  const updateOption = (gIdx, oIdx, data) => {
    const g = groups[gIdx]
    updateGroup(gIdx, { options: g.options.map((o, i) => i === oIdx ? { ...o, ...data } : o) })
  }

  const deleteOption = (gIdx, oIdx) => {
    const g = groups[gIdx]
    updateGroup(gIdx, { options: g.options.filter((_, i) => i !== oIdx) })
  }

  return (
    <div className="space-y-4">
      {groups.map((group, gIdx) => (
        <div key={group._id || gIdx} className="border border-border rounded-xl p-4 bg-bg-section">
          {/* Group header */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={group.name}
              onChange={e => updateGroup(gIdx, { name: e.target.value })}
              placeholder="Group name (e.g. Choose a size)"
              className="flex-1 text-sm font-semibold border border-border rounded-lg px-2.5 py-1.5 focus:border-brand-500 focus:outline-none"
            />
            <button onClick={() => deleteGroup(gIdx)} className="text-xs text-error-500 hover:text-error-600 font-semibold px-2 py-1 rounded-lg hover:bg-error-50 transition-colors">
              Remove
            </button>
          </div>

          {/* Options */}
          {group.options.map((opt, oIdx) => (
            <ToppingOptionRow
              key={oIdx}
              option={opt}
              onChange={data => updateOption(gIdx, oIdx, data)}
              onDelete={() => deleteOption(gIdx, oIdx)}
            />
          ))}

          <button
            type="button"
            onClick={() => addOption(gIdx)}
            className="text-xs text-brand-500 font-semibold hover:text-brand-600 transition-colors mt-2 flex items-center gap-1"
          >
            + Add option
          </button>

          {/* Group settings */}
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border-light">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <Toggle checked={group.required} onChange={v => updateGroup(gIdx, { required: v })} size="sm" />
              Required
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <Toggle checked={group.multiSelect} onChange={v => updateGroup(gIdx, { multiSelect: v, max: v ? 99 : 1 })} size="sm" />
              Allow multiple
            </label>
            {group.multiSelect && (
              <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                Max:
                <input type="number" min="1" max="10" value={group.max} onChange={e => updateGroup(gIdx, { max: parseInt(e.target.value) || 1 })}
                  className="w-12 border border-border rounded-md px-1.5 py-1 text-center focus:border-brand-500 focus:outline-none" />
              </label>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addGroup}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-brand-300 text-sm font-semibold text-brand-500 hover:bg-brand-50 hover:border-brand-400 transition-all"
      >
        + Add Topping Group
      </button>
    </div>
  )
}

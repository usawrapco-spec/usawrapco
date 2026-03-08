'use client'

import { useState } from 'react'
import {
  CheckCircle, Circle, Plus, Phone, Star,
  MessageSquare, ClipboardList, Brain, AlertTriangle,
  Clock, X,
} from 'lucide-react'
import { C } from '@/lib/portal-theme'

interface Task {
  id: string; type: string; title: string; description: string | null
  priority: string; status: string; completed_at: string | null
  related_lead_id: string | null; related_call_id: string | null
  related_referral_id: string | null; task_date: string
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: C.red,
  high: C.amber,
  normal: C.text2,
  low: C.text3,
}

const TYPE_ICON: Record<string, any> = {
  review_call_feedback: Brain,
  follow_up: Phone,
  callback: Phone,
  check_job: ClipboardList,
  send_quote: MessageSquare,
  custom: Star,
}

export default function DailyTaskList({ initialTasks, date }: { initialTasks: Task[]; date: string }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('normal')

  const pending = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped')
  const done = tasks.filter(t => t.status === 'done' || t.status === 'skipped')
  const progress = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0

  async function toggleTask(id: string, current: string) {
    const newStatus = current === 'done' ? 'pending' : 'done'
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null } : t))
    await fetch('/api/sales-portal/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    })
  }

  async function addTask() {
    if (!newTitle.trim()) return
    const res = await fetch('/api/sales-portal/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, priority: newPriority, task_date: date }),
    })
    if (res.ok) {
      const { task } = await res.json()
      setTasks(prev => [...prev, task])
      setNewTitle('')
      setShowAdd(false)
    }
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: 0, fontFamily: 'var(--font-barlow, Barlow Condensed, sans-serif)' }}>
          Today&apos;s Tasks
        </h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: C.accent, border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {showAdd ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>
      <p style={{ fontSize: 13, color: C.text3, margin: '0 0 16px' }}>
        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Progress */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.text2 }}>{done.length} of {tasks.length} completed</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? C.green : C.accent, fontFamily: 'JetBrains Mono, monospace' }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: C.surface2 }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            borderRadius: 3, background: progress === 100 ? C.green : C.accent,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Add Task */}
      {showAdd && (
        <div style={{
          background: C.surface, border: `1px solid ${C.accent}30`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 16,
        }}>
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask() }}
            placeholder="Task title..."
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', boxSizing: 'border-box',
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.text1, fontSize: 13, outline: 'none',
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(['low', 'normal', 'high', 'urgent'] as const).map(p => (
              <button
                key={p}
                onClick={() => setNewPriority(p)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: newPriority === p ? `${PRIORITY_COLOR[p]}20` : C.surface2,
                  border: `1px solid ${newPriority === p ? PRIORITY_COLOR[p] : C.border}`,
                  color: newPriority === p ? PRIORITY_COLOR[p] : C.text3,
                  cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {p}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              onClick={addTask}
              disabled={!newTitle.trim()}
              style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: newTitle.trim() ? C.accent : C.surface2,
                color: newTitle.trim() ? '#fff' : C.text3,
                border: 'none', cursor: newTitle.trim() ? 'pointer' : 'default',
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            To Do ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pending.map(task => {
              const Icon = TYPE_ICON[task.type] || ClipboardList
              const prColor = PRIORITY_COLOR[task.priority] || C.text2
              return (
                <div key={task.id} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderLeft: `3px solid ${prColor}`,
                }}>
                  <button
                    onClick={() => toggleTask(task.id, task.status)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  >
                    <Circle size={20} color={C.text3} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{task.title}</div>
                    {task.description && (
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{task.description}</div>
                    )}
                  </div>
                  <Icon size={14} color={C.text3} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {done.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Done ({done.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {done.map(task => (
              <div key={task.id} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: 0.6,
              }}>
                <button
                  onClick={() => toggleTask(task.id, task.status)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                >
                  <CheckCircle size={20} color={C.green} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: C.text2, textDecoration: 'line-through' }}>{task.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: C.text3 }}>
          <ClipboardList size={32} strokeWidth={1} style={{ marginBottom: 10, opacity: 0.3 }} />
          <div style={{ fontSize: 14, color: C.text2, marginBottom: 4 }}>No tasks for today</div>
          <div style={{ fontSize: 12 }}>Tasks are auto-generated from call analyses and callbacks</div>
        </div>
      )}
    </div>
  )
}

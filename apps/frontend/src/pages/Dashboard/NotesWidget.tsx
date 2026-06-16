import { useEffect, useState, KeyboardEvent } from "react";
import type { DashboardNote } from "../../types";
import * as dashboardService from "../../services/dashboard.service";
import { getErrorMessage } from "../../utils/feedback";
import "../../styles/dashboard.css";

export function NotesWidget() {
  const [notes, setNotes] = useState<DashboardNote[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const items = await dashboardService.listDashboardNotes();
        if (!cancelled) {
          setNotes(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, {}, "No se pudieron cargar las notas"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleNote = async (note: DashboardNote) => {
    try {
      const updated = await dashboardService.updateDashboardNote(note.id, {
        completed: !note.completed
      });
      setNotes((current) =>
        current
          .map((item) => (item.id === note.id ? updated : item))
          .sort((a, b) => Number(a.completed) - Number(b.completed))
      );
    } catch (err) {
      setError(getErrorMessage(err, {}, "No se pudo actualizar la nota"));
    }
  };

  const deleteNote = async (id: number) => {
    try {
      await dashboardService.deleteDashboardNote(id);
      setNotes((current) => current.filter((note) => note.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, {}, "No se pudo eliminar la nota"));
    }
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      try {
        const created = await dashboardService.createDashboardNote({
          text: inputValue.trim()
        });
        setNotes((current) => [created, ...current]);
        setInputValue("");
      } catch (err) {
        setError(getErrorMessage(err, {}, "No se pudo crear la nota"));
      }
    }
  };

  return (
    <div className="dashWidget notesWidget">
      <div className="notesList hide-scrollbar">
        {error ? <div className="error" style={{ marginBottom: 12 }}>{error}</div> : null}
        {loading ? <div className="hint" style={{ padding: "16px 0", textAlign: "center" }}>Cargando notas...</div> : null}
        {notes.length === 0 ? (
          <div className="hint" style={{ padding: "16px 0", textAlign: "center" }}>No tenés notas pendientes.</div>
        ) : (
          notes.map(note => (
            <label key={note.id} className="noteItem">
              <input 
                type="checkbox" 
                checked={note.completed} 
                onChange={() => void toggleNote(note)}
                className="noteCheckbox"
              />
              <span className={`noteText ${note.completed ? 'noteText--completed' : ''}`}>
                {note.text}
              </span>
              {note.completed && (
                <button 
                  onClick={(e) => { e.preventDefault(); void deleteNote(note.id); }}
                  className="noteDeleteBtn"
                  title="Eliminar"
                >
                  ×
                </button>
              )}
            </label>
          ))
        )}
      </div>
      <div className="noteInputWrap">
        <input 
          className="input"
          placeholder="Escribir..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}

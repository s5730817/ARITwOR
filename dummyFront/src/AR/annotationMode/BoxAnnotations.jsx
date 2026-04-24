import React from "react";
import "./styles/boxAnnotations.css";

function BoxAnnotations({
  annotations = [],
  selectedId = null,
  onSelect = () => {},
  onToggleDone = () => {},
  onDelete = () => {},
  onUpdateNote = () => {},
  onUpdateTitle = () => {}
}) {
  const handleFocusScroll = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 250);
  };

  return (
    <div className="box-annotations">
      <div className="box-header">
        <h3>Annotations</h3>
        <span>{annotations.length} items</span>
      </div>

      <div className="box-list">
        {annotations.length === 0 && (
          <div className="box-empty">
            Tap a dot to create annotation
          </div>
        )}

        {annotations.map((item, index) => {
          const isSelected =
            selectedId === item.id;

          const accent =
            item.colour || "#00ff88";

          return (
            <div
              key={item.id}
              className={`box-item ${
                isSelected ? "selected" : ""
              } ${item.done ? "done" : ""}`}
              style={{
                "--accent-colour": accent
              }}
            >
              <button
                className="box-row"
                onClick={() =>
                  onSelect(item.id)
                }
              >
                <div className="box-item-left">
                  <span className="box-number">
                    {index + 1}
                  </span>

                  <div className="box-meta">
                    <div className="box-title">
                      {item.title ||
                        `Annotation ${index + 1}`}
                    </div>

                    <div className="box-sub">
                      {item.done
                        ? "Complete"
                        : "Pending"}
                    </div>
                  </div>
                </div>

                <div className="box-status">
                  {item.done ? "✓" : "•"}
                </div>
              </button>

              {isSelected && !item.done && (
                <div className="box-detail">
                  <input
                    className="box-input"
                    placeholder="Enter title..."
                    value={item.title || ""}
                    onChange={(e) =>
                      onUpdateTitle(
                        item.id,
                        e.target.value
                      )
                    }
                    onFocus={
                      handleFocusScroll
                    }
                  />

                  <textarea
                    className="box-textarea"
                    placeholder="Enter note..."
                    value={item.note || ""}
                    onChange={(e) =>
                      onUpdateNote(
                        item.id,
                        e.target.value
                      )
                    }
                    onFocus={
                      handleFocusScroll
                    }
                  />

                  <div className="box-actions">
                    <button
                      className="box-btn"
                      onClick={() =>
                        onToggleDone(item.id)
                      }
                    >
                      Complete
                    </button>

                    <button
                      className="box-btn danger"
                      onClick={() =>
                        onDelete(item.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BoxAnnotations;
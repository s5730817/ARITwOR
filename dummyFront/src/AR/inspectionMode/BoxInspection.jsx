import "./styles/BoxInspection.css";

function formatDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "—";
  }
}

function BoxInspection({
  annotations = [],
  inspections = [],

  selectedItem = null,
  onSelect = () => {},

  onUpdateTitle = () => {},
  onUpdateNote = () => {},
  onUpdateAnnotationNote = () => {},
  onUpdateAnnotationResult = () => {},

  onComplete = () => {},
  onDelete = () => {}
}) {

  // -----------------------------
  // SPLIT DATA
  // -----------------------------
  const pending = annotations.filter(a => a.status !== "checked");
  const checked = annotations.filter(a => a.status === "checked");

  const selectedAnnotation =
    selectedItem?.type === "annotation"
      ? annotations.find(a => a.id === selectedItem.id)
      : null;

  const selectedInspection =
    selectedItem?.type === "inspection"
      ? inspections.find(i => i.id === selectedItem.id)
      : null;

  const selected = selectedAnnotation || selectedInspection;

  // -----------------------------
  // LIST VIEW
  // -----------------------------
  if (!selected) {
    return (
      <div className="inspection-container">

        {/* CHECKLIST */}
        <div className="inspection-box-group">
          <div className="group-header">Pending</div>

          {pending.length === 0 ? (
            <div className="empty">No pending</div>
          ) : (
            pending.map(item => (
              <button
                key={item.id}
                className="list-item"
                onClick={() => onSelect(item.id, "annotation")}
              >
                {item.title}
              </button>
            ))
          )}
        </div>

        <div className="inspection-box-group">
          <div className="group-header">Checked</div>

          {checked.length === 0 ? (
            <div className="empty">No checked</div>
          ) : (
            checked.map(item => (
              <button
                key={item.id}
                className="list-item checked"
                onClick={() => onSelect(item.id, "annotation")}
              >
                {item.title}
              </button>
            ))
          )}
        </div>

        {/* FAULTS */}
        <div className="inspection-box-group">
          <div className="group-header">Faults Found</div>

          {inspections.length === 0 ? (
            <div className="empty">No faults</div>
          ) : (
            inspections.map(item => (
              <button
                key={item.id}
                className="list-item fault"
                onClick={() => onSelect(item.id, "inspection")}
              >
                {item.title || `Fault #${item.id}`}
              </button>
            ))
          )}
        </div>

      </div>
    );
  }

  // -----------------------------
  // DATE (UNIFIED)
  // -----------------------------
  const displayDate = selected.updatedAt || selected.createdAt;

  // -----------------------------
  // DETAIL VIEW
  // -----------------------------
  return (
    <div className="inspection-container">

      <button className="back" onClick={() => onSelect(null)}>
        ← Back
      </button>

      {/* TYPE */}
      <div className="card">
        <div className="label">
          {selectedAnnotation ? "Checklist Item" : "Fault"}
        </div>
      </div>

      {/* -----------------------------
          ANNOTATION VIEW
      ----------------------------- */}
      {selectedAnnotation && (
        <>
          <div className="card">
            <div className="label">Title</div>
            <div className="readonly">{selectedAnnotation.title}</div>

            <div className="label">Instructions</div>
            <div className="readonly">
              {selectedAnnotation.note || "No notes"}
            </div>
          </div>

          {/* RESULT TOGGLE */}
          <div className="card">
            <div className="label">Result</div>

            <div className="result-toggle">
              <button
                className={
                  selectedAnnotation.inspectionResult === "functional"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  onUpdateAnnotationResult(
                    selectedAnnotation.id,
                    "functional"
                  )
                }
              >
                Functional
              </button>

              <button
                className={
                  selectedAnnotation.inspectionResult === "defective"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  onUpdateAnnotationResult(
                    selectedAnnotation.id,
                    "defective"
                  )
                }
              >
                Defective
              </button>
            </div>
          </div>

          {/* NOTES */}
          <div className="card">
            <div className="label">Inspection Notes</div>
            <textarea
              value={selectedAnnotation.inspectionNote || ""}
              onChange={(e) =>
                onUpdateAnnotationNote(
                  selectedAnnotation.id,
                  e.target.value
                )
              }
            />
          </div>

          {/* DATE */}
          <div className="card">
            <div className="label">Last Updated</div>
            <div className="readonly">
              {formatDate(displayDate)}
            </div>
          </div>

          <button
            className="action complete"
            onClick={() =>
              onComplete(selectedAnnotation.id, "annotation")
            }
          >
            Mark Complete
          </button>
        </>
      )}

      {/* -----------------------------
          FAULT VIEW
      ----------------------------- */}
      {selectedInspection && (
      <>
        {/* TITLE */}
        <div className="card">
          <div className="label">Title</div>
          <input
            value={selectedInspection.title}
            onChange={(e) =>
              onUpdateTitle(
                selectedInspection.id,
                e.target.value
              )
            }
          />
        </div>

        {/* NOTES */}
        <div className="card">
          <div className="label">Notes</div>
          <textarea
            value={selectedInspection.inspectionNote || ""}
            onChange={(e) =>
              onUpdateNote(
                selectedInspection.id,
                e.target.value
              )
            }
          />
        </div>

        {/* DATE */}
        <div className="card">
          <div className="label">Date</div>
          <div className="readonly">
            {formatDate(selectedInspection.createdAt)}
          </div>
        </div>

        {/* ACTIONS */}
        <button
          className="action complete"
          onClick={() =>
            onComplete(selectedInspection.id, "inspection")
          }
        >
          Complete
        </button>

        <button
          className="action delete"
          onClick={() =>
            onDelete(selectedInspection.id)
          }
        >
          Delete
        </button>
      </>
    )}
    </div>
  );
}

export default BoxInspection;
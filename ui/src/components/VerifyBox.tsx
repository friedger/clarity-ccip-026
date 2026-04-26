import { useState } from "react";

interface Step {
  label: string;
  detail: string;
  code?: string;
}

interface Props {
  title: string;
  steps: Step[];
}

export function VerifyBox({ title, steps }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`verify ${open ? "open" : ""}`}>
      <button className="verify-toggle" onClick={() => setOpen(!open)}>
        <span className="verify-icon" aria-hidden>
          {open ? "−" : "+"}
        </span>
        <span>How to verify · {title}</span>
      </button>
      {open && (
        <ol className="verify-list">
          {steps.map((s, i) => (
            <li key={i}>
              <div className="verify-label">{s.label}</div>
              <div className="verify-detail">{s.detail}</div>
              {s.code && <pre className="verify-code">{s.code}</pre>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

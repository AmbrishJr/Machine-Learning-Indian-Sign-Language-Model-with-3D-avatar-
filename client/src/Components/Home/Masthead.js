import React from "react";
import { Link } from "react-router-dom";
import avatarPreview from "../../Assets/avatar-preview.png";

function Masthead() {
  return (
    <header className="hero">
      <div className="container-narrow">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">3D Avatar • ISL Toolkit</span>
            <h1 className="hero-title">ISL <span className="gradient-text">Genie</span></h1>
            <p className="hero-subtitle">
              Convert speech and text into Indian Sign Language.
            </p>
            <p className="hero-subtitle" style={{ marginTop: "-0.5rem" }}>
              Translate English/Hindi to ISL, practice common signs, and create shareable ISL videos.
            </p>

            <div className="hero-actions">
              <Link to="/sign-kit/convert" className="btn btn-brand pressable">
                Start Converting
              </Link>
              <Link to="/sign-kit/learn-sign" className="btn btn-surface pressable">
                Learn Signs
              </Link>
              <a href="#intro" className="btn btn-surface pressable">
                Explore Features
              </a>
            </div>
            <div className="helper-text">No signup. Works in your browser.</div>
          </div>

          <aside className="surface-card preview-card">
            <div className="preview-header">
              <div style={{ fontWeight: 700 }}>Preview</div>
              <div className="chips" aria-label="Key features">
                <span className="chip">Speech</span>
                <span className="chip">Text</span>
                <span className="chip">Videos</span>
              </div>
            </div>
            <img
              src={avatarPreview}
              className="avatar-preview"
              alt="3D avatar preview"
              loading="lazy"
            />
            <div className="helper-text" style={{ marginBottom: 0 }}>
              A clean, avatar-first experience designed for clarity.
            </div>
          </aside>
        </div>
      </div>
    </header>
  );
}

export default Masthead;

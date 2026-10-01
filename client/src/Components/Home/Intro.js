import React from "react";

function Intro() {
  return (
    <section id="intro">
      <div className="section">
        <div className="container-narrow text-center">
          <h2 className="section-title">Everything you need for ISL</h2>
          <p className="section-lead">
            A simple, avatar-first toolkit for translation, practice, and creating shareable ISL videos.
          </p>

          <div className="grid-3" role="list">
            <div className="surface-card mini-card" role="listitem">
              <div className="mini-icon"><i className="fa fa-bolt" /></div>
              <div className="mini-title">Convert instantly</div>
              <p className="mini-text">Speak or type, then watch the avatar sign.</p>
            </div>
            <div className="surface-card mini-card" role="listitem">
              <div className="mini-icon"><i className="fa fa-graduation-cap" /></div>
              <div className="mini-title">Learn by practice</div>
              <p className="mini-text">Explore alphabets and common words with replay.</p>
            </div>
            <div className="surface-card mini-card" role="listitem">
              <div className="mini-icon"><i className="fa fa-share-alt" /></div>
              <div className="mini-title">Create and share</div>
              <p className="mini-text">Generate videos and share them using a video ID.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Intro;

import React from 'react';
import { Link } from 'react-router-dom';

// Animation speed and the pause between signs, shared by the signing pages.
function PlaybackControls({ speed, setSpeed, pause, setPause }) {
  return (
    <div className="surface-card playback">
      <div>
        <label className="form-label" htmlFor="speed-range">
          Animation speed <span>{Math.round(speed * 100) / 100}</span>
        </label>
        <input id="speed-range" type="range" className="form-range" min={0.05} max={0.5} step={0.01}
               value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
      </div>
      <div>
        <label className="form-label" htmlFor="pause-range">
          Pause time <span>{pause} ms</span>
        </label>
        <input id="pause-range" type="range" className="form-range" min={0} max={2000} step={100}
               value={pause} onChange={(e) => setPause(Number(e.target.value))} />
      </div>
      <Link to="/sign-kit/avatar" className="btn btn-soft btn-sm">
        <i className="fa fa-paint-brush" />Customise avatar
      </Link>
    </div>
  );
}

export default PlaybackControls;

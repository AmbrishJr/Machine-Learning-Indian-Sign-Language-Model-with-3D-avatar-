import React from 'react';

// The 3D avatar card. The page mounts its renderer into #canvas (mountAvatarCanvas);
// `caption` is shown under the avatar.
function AvatarStage({ captionLabel = 'Signing', caption, emptyCaption = 'Nothing signed yet', children }) {
  return (
    <div className="surface-card stage-card">
      <div id="canvas" className="stage-canvas" aria-label="3D signing avatar" role="img" />
      <div className="stage-caption" aria-live="polite">
        <span className="caption-label">{captionLabel}</span>
        <span className={`caption-text${caption ? '' : ' empty'}`}>{caption || emptyCaption}</span>
        {children}
      </div>
    </div>
  );
}

export default AvatarStage;

import React from "react";

function VideoCard({ video, handleClick }) {
  return (
    <button type="button" className="surface-card video-card" onClick={() => handleClick(video._id)}>
      <h3>{video.title}</h3>
      <p>{video.desc}</p>
      <div className="video-card-footer">
        <span><i className="fa fa-user-o me-1" /> {video.createdBy}</span>
        <span className="text-nowrap">Play <i className="fa fa-play-circle ms-1" /></span>
      </div>
    </button>
  );
}

export default VideoCard;

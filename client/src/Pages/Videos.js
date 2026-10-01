import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form } from "react-bootstrap";
import VideoCard from "../Components/Videos/VideoCard";
import PageHeader from "../Components/Layout/PageHeader";
import { baseURL } from "../Config/config";

function Videos() {
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [videoId, setVideoId] = useState("");
  const [validated, setValidated] = useState(false);
  const navigate = useNavigate();

  const retrieveVideos = () => {
    axios
      .get(`${baseURL}/videos/all-videos`)
      .then((res) => {
        setVideos(res.data);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        console.error(err);
      });
  };

  useEffect(retrieveVideos, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!videoId) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    setValidated(true);
    navigate(`/sign-kit/video/${videoId}`, { replace: false });
  };

  const handleClick = (videoId) => {
    navigate(`/sign-kit/video/${videoId}`, { replace: false });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="ISL videos"
        subtitle="Create public or private ISL videos, share them by ID, or browse what the community has made."
      >
        <Link to="/sign-kit/create-video" className="btn btn-primary">
          <i className="fa fa-plus" />Create video
        </Link>
      </PageHeader>

      <div className="feature-grid">
        <section className="surface-card feature-card">
          <div className="feature-icon"><i className="fa fa-magic" /></div>
          <h2>Create a new video</h2>
          <p>
            Provide your content as text, speech or a file and keep the video private or share it with
            everyone. Each video gets an ID that opens it directly.
          </p>
          <div className="mt-auto">
            <Link to="/sign-kit/create-video" className="btn btn-soft">
              Start creating <i className="fa fa-arrow-right ms-1" />
            </Link>
          </div>
        </section>

        <section className="surface-card feature-card">
          <div className="feature-icon"><i className="fa fa-link" /></div>
          <h2>Open a video</h2>
          <p>Have a video ID? Open the video directly.</p>
          <Form noValidate validated={validated} onSubmit={handleSubmit} className="mt-auto">
            <Form.Group controlId="videoId">
              <Form.Label className="visually-hidden">Video ID</Form.Label>
              <div className="d-flex gap-2 align-items-start">
                <div className="flex-grow-1">
                  <Form.Control
                    required
                    type="text"
                    placeholder="Enter the video ID"
                    value={videoId}
                    name="title"
                    onChange={(e) => setVideoId(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Please enter a video ID.
                  </Form.Control.Feedback>
                </div>
                <button type="submit" className="btn btn-primary text-nowrap">Open</button>
              </div>
            </Form.Group>
          </Form>
        </section>
      </div>

      <section>
        <div className="section-heading-row">
          <h2>Community videos</h2>
          {status === "ready" && <span className="chip">{videos.length} videos</span>}
        </div>
        {status === "ready" && videos.length > 0 && (
          <div className="video-grid">
            {videos.map((video, index) => (
              <VideoCard key={index} video={video} handleClick={handleClick} />
            ))}
          </div>
        )}
        {status !== "ready" || videos.length === 0 ? (
          <div className="surface-card empty-state">
            <div><i className={`fa ${status === "loading" ? "fa-circle-o-notch fa-spin" : status === "error" ? "fa-cloud" : "fa-film"}`} /></div>
            {status === "loading" && <p className="mb-0">Loading videos…</p>}
            {status === "error" && <p className="mb-0">Couldn't reach the video service. You can still open a video by its ID.</p>}
            {status === "ready" && <p className="mb-0">No public videos yet. Be the first to create one!</p>}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default Videos;

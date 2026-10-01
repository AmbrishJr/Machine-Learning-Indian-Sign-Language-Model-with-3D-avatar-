import React, { useState } from "react";
import { useNavigate } from 'react-router-dom'
import { Form } from "react-bootstrap";
import { baseURL } from "../Config/config";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axios from "axios";
import ConfirmModal from "../Components/CreateVideo/ConfirmModal";
import PageHeader from "../Components/Layout/PageHeader";

const MODES = [
  ["text", "fa-keyboard-o", "Type"],
  ["speech", "fa-microphone", "Speak"],
  ["file", "fa-file-text-o", "Upload"],
];

function CreateVideo() {
  const [video, setVideo] = useState({
    title: "",
    desc: "",
    createdBy: "",
    type: "PUBLIC"
  });
  const [validated, setValidated] = useState(false);
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState("");
  const [videoId, setVideoId] = useState("")
  const [showModal, setShowModal] = useState(false)
  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  const navigate = useNavigate()

  const handleInputChanges = (event) => {
    setVideo((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const startListening = () => {
    SpeechRecognition.startListening({ continuous: true });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const validateVideo = () => {
    if (!video.title || !video.desc || !video.createdBy) return false;
    else if (mode === "text" && !text) return false;
    else if (mode === "file" && !file) return false;
    else if (mode === "speech" && !transcript) return false;
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (validateVideo() === false) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    setValidated(true);

    let content = "";
    if (mode === "text") content = text;
    else if (mode === "file") content = await file.text();
    else if (mode === "speech") content = transcript;

    const newVideo = {
      ...video,
      content: content,
    };

    axios
      .post(`${baseURL}/videos/create-video`, newVideo)
      .then((res) => {
        setVideoId(res.data.videoId)
        setShowModal(true)
      })
      .catch((err) => {
        console.error(err);
      });
  };

  return (
    <div className="page-container narrow">
      <PageHeader
        title="Create a video"
        subtitle="Fill in the details and provide your content. The avatar signs it whenever someone opens the video."
      />

      <Form noValidate validated={validated} onSubmit={handleSubmit} className="surface-card form-card">
        <div className="form-section-title">Details</div>
        <Form.Group controlId="title" className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            required
            type="text"
            placeholder="e.g. Greetings in ISL"
            value={video.title}
            name="title"
            onChange={handleInputChanges}
          />
          <Form.Control.Feedback type="invalid">Please enter a title.</Form.Control.Feedback>
        </Form.Group>

        <Form.Group controlId="desc" className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            required
            type="text"
            placeholder="What is this video about?"
            name="desc"
            onChange={handleInputChanges}
            as="textarea"
            rows={3}
          />
          <Form.Control.Feedback type="invalid">Please enter a description.</Form.Control.Feedback>
        </Form.Group>

        <div className="row g-3">
          <Form.Group controlId="createdBy" className="col-md-6">
            <Form.Label>Your name</Form.Label>
            <Form.Control
              required
              type="text"
              placeholder="Name of creator"
              name="createdBy"
              onChange={handleInputChanges}
            />
            <Form.Control.Feedback type="invalid">Please enter your name as the creator.</Form.Control.Feedback>
          </Form.Group>

          <Form.Group controlId="type" className="col-md-6">
            <Form.Label>Visibility</Form.Label>
            <Form.Select required value={video.type} name="type" onChange={handleInputChanges}>
              <option value="PUBLIC">Public: visible to everyone</option>
              <option value="PRIVATE">Private: only people with the ID</option>
            </Form.Select>
          </Form.Group>
        </div>

        <div className="form-section-title">Content</div>
        <div className="mode-tabs mb-3" role="tablist" aria-label="Content source">
          {MODES.map(([value, icon, label]) => (
            <button key={value} type="button" role="tab" aria-selected={mode === value}
                    className={`btn${mode === value ? " active" : ""}`} onClick={() => setMode(value)}>
              <i className={`fa ${icon}`} />{label}
            </button>
          ))}
        </div>

        {mode === "text" && (
          <Form.Group controlId="text">
            <Form.Label>Your content</Form.Label>
            <Form.Control
              required
              type="text"
              placeholder="Type the sentences the avatar should sign…"
              name="content"
              onChange={(e) => setText(e.target.value)}
              as="textarea"
              rows={7}
            />
            <Form.Control.Feedback type="invalid">Please type your content.</Form.Control.Feedback>
          </Form.Group>
        )}

        {mode === "file" && (
          <Form.Group controlId="formFile">
            <Form.Label>Text file (.txt)</Form.Label>
            <Form.Control
              type="file"
              accept=".txt"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
            <Form.Control.Feedback type="invalid">Please upload a text file.</Form.Control.Feedback>
          </Form.Group>
        )}

        {mode === "speech" && (
          <Form.Group controlId="speech-text">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <Form.Label className="mb-0">Speak through your mic</Form.Label>
              <span className={`status-pill ${listening ? "live" : ""}`}>Mic {listening ? "on" : "off"}</span>
            </div>
            <div className="btn-row mb-2">
              <button type="button" className="btn btn-soft" onClick={startListening}>
                <i className="fa fa-microphone" />Start
              </button>
              <button type="button" className="btn btn-soft" onClick={stopListening}>
                <i className="fa fa-stop" />Stop
              </button>
              <button type="button" className="btn btn-soft" onClick={resetTranscript}>
                <i className="fa fa-eraser" />Clear
              </button>
            </div>
            <Form.Control
              required
              readOnly
              type="text"
              placeholder="Your speech appears here…"
              name="content"
              value={transcript}
              as="textarea"
              rows={6}
            />
            <Form.Control.Feedback type="invalid">Please speak through your mic.</Form.Control.Feedback>
          </Form.Group>
        )}

        <div className="d-flex justify-content-end mt-4">
          <button type="submit" className="btn btn-primary px-4">
            <i className="fa fa-check" />Create video
          </button>
        </div>
      </Form>

      <ConfirmModal show={showModal} onHide={(e) => {
        setShowModal(false)
        navigate('/sign-kit/all-videos', { replace: true })
      }} videoId={videoId} />
    </div>
  );
}

export default CreateVideo;

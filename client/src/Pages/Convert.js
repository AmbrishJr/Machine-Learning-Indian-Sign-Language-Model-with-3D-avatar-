import React, { useState, useEffect, useRef } from "react";

import { AVATAR_MODEL, applyAvatarStyle, styleScene, mountAvatarCanvas } from '../Avatar/avatar';
import PageHeader from '../Components/Layout/PageHeader';
import AvatarStage from '../Components/Workspace/AvatarStage';
import PlaybackControls from '../Components/Workspace/PlaybackControls';

import { defaultPose } from '../Animations/defaultPose';
import { translate } from '../Translation/translate';
import { performPlan } from '../Translation/signPlanner';
import { semanticWorker, describeProgress } from '../Translation/mlWorker';
import { useWhisperRecorder } from '../Translation/useWhisperRecorder';

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

function Convert() {
  const [text, setText] = useState("");
  const bot = AVATAR_MODEL;
  const [speed, setSpeed] = useState(0.1);
  const [pause, setPause] = useState(800);

  const componentRef = useRef({});
  const { current: ref } = componentRef;

  const [inputText, setInputText] = useState("");
  const [gloss, setGloss] = useState("");
  const [useGrammar, setUseGrammar] = useState(true);
  const [useSemantic, setUseSemantic] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [mlStatus, setMlStatus] = useState(null);
  const [warning, setWarning] = useState(null);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const [speechEngine, setSpeechEngine] = useState(
    browserSupportsSpeechRecognition ? 'browser' : 'whisper'
  );
  const whisper = useWhisperRecorder();
  const speechText = speechEngine === 'whisper' ? whisper.transcript : transcript;

  useEffect(() => semanticWorker.onProgress((data) => setMlStatus(describeProgress(data))), []);

  useEffect(() => {

    ref.flag = false;
    ref.pending = false;

    ref.animations = [];

    ref.scene = new THREE.Scene();
    styleScene(ref.scene);
    const unmountCanvas = mountAvatarCanvas(ref, document.getElementById("canvas"));

    let loader = new GLTFLoader();
    const onLoad = (gltf) => {
      applyAvatarStyle(gltf.scene);
      
      // Remove existing avatar if it exists
      if (ref.avatar) {
        ref.scene.remove(ref.avatar);
      }
      
      ref.avatar = gltf.scene;
      ref.scene.add(ref.avatar);
      ref.renderOnce();
      defaultPose(ref);
    };

    const onError = (error) => {
      console.error('Error loading model:', error);
    };

    loader.load(bot, onLoad, undefined, onError);

    return unmountCanvas;
  }, [ref, bot]);

  ref.animate = () => {
    if(ref.animations.length === 0){
        ref.pending = false;
      return ;
    }
    requestAnimationFrame(ref.animate);
    if(ref.animations[0].length){
        if(!ref.flag) {
          if(ref.animations[0][0]==='add-text'){
            setText(text + ref.animations[0][1]);
            ref.animations.shift();
          }
          else{
            for(let i=0;i<ref.animations[0].length;){
              let [boneName, action, axis, limit, sign] = ref.animations[0][i]
              if(sign === "+" && ref.avatar.getObjectByName(boneName)[action][axis] < limit){
                  ref.avatar.getObjectByName(boneName)[action][axis] += speed;
                  ref.avatar.getObjectByName(boneName)[action][axis] = Math.min(ref.avatar.getObjectByName(boneName)[action][axis], limit);
                  i++;
              }
              else if(sign === "-" && ref.avatar.getObjectByName(boneName)[action][axis] > limit){
                  ref.avatar.getObjectByName(boneName)[action][axis] -= speed;
                  ref.avatar.getObjectByName(boneName)[action][axis] = Math.max(ref.avatar.getObjectByName(boneName)[action][axis], limit);
                  i++;
              }
              else{
                  ref.animations[0].splice(i, 1);
              }
            }
          }
        }
    }
    else {
      ref.flag = true;
      setTimeout(() => {
        ref.flag = false
      }, pause);
      ref.animations.shift();
    }
    ref.renderer.render(ref.scene, ref.camera);
  }

  const sign = async (str) => {
    if (!str.trim() || translating) return;
    setText('');
    setWarning(null);
    setTranslating(true);
    try {
      const result = await translate(str, { grammar: useGrammar, semantic: useSemantic });
      setGloss(result.tokens.map((t) => t.gloss.replace(/_/g, '-')).join(' '));
      setWarning(result.warning || null);
      performPlan(result.plan, ref);
      // On narrow screens the avatar sits above the controls; bring it into view.
      if (window.innerWidth < 992) document.getElementById('canvas').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      setTranslating(false);
      setMlStatus(null);
    }
  }

  const startListening = () =>{
    if (speechEngine === 'whisper') whisper.start();
    else SpeechRecognition.startListening({continuous: true});
  }

  const stopListening = () =>{
    if (speechEngine === 'whisper') whisper.stop();
    else SpeechRecognition.stopListening();
  }

  const clearSpeech = () => {
    if (speechEngine === 'whisper') whisper.reset();
    else resetTranscript();
  }

  const speechStatus = speechEngine === 'whisper'
    ? { idle: 'off', recording: 'recording', transcribing: 'transcribing…' }[whisper.status]
    : (listening ? 'on' : 'off');
  const speechPill = { on: 'live', recording: 'live', 'transcribing…': 'busy' }[speechStatus] || '';

  return (
    <div className='page-container'>
      <PageHeader
        title='Convert to ISL'
        subtitle='Type or speak in English and the avatar signs it in Indian Sign Language.'
      />
      <div className='workspace'>
        <div className='workspace-panel'>
          <section className='surface-card panel-card'>
            <h2 className='panel-title'><span><i className='fa fa-keyboard-o' />Type text</span></h2>
            <textarea rows={4} value={inputText} onChange={(e) => setInputText(e.target.value)}
                      placeholder='e.g. Hello, how are you?' className='form-control' aria-label='Text to sign' />
            <button onClick={() => {sign(inputText)}} disabled={translating || !inputText.trim()}
                    className='btn btn-primary w-100 mt-3'>
              <i className='fa fa-play' />{translating ? 'Translating…' : 'Sign this text'}
            </button>
          </section>

          <section className='surface-card panel-card'>
            <h2 className='panel-title'>
              <span><i className='fa fa-microphone' />Speak</span>
              <span className={`status-pill ${speechPill}`}>Mic {speechStatus}</span>
            </h2>
            <select
              className='form-select'
              aria-label='Speech recognition engine'
              value={speechEngine}
              onChange={(e) => { stopListening(); setSpeechEngine(e.target.value); }}
            >
              <option value='browser' disabled={!browserSupportsSpeechRecognition}>
                Browser speech API{browserSupportsSpeechRecognition ? '' : ' (not supported)'}
              </option>
              <option value='whisper'>Whisper ML model (on-device)</option>
            </select>
            <div className='btn-row mt-2'>
              <button className="btn btn-soft" onClick={startListening}>
                <i className="fa fa-microphone"/>Start
              </button>
              <button className="btn btn-soft" onClick={stopListening}>
                <i className="fa fa-stop"/>Stop
              </button>
              <button className="btn btn-soft" onClick={clearSpeech}>
                <i className="fa fa-eraser"/>Clear
              </button>
            </div>
            <textarea rows={3} value={speechText} placeholder='Your speech appears here…'
                      className='form-control mt-2' readOnly aria-label='Speech transcript' />
            {speechEngine === 'whisper' && (whisper.progress || whisper.error) &&
              <p className={whisper.error ? 'ml-status error' : 'ml-status'}>{whisper.error || whisper.progress}</p>}
            <button onClick={() => {sign(speechText)}} disabled={translating || !speechText.trim()}
                    className='btn btn-primary w-100 mt-3'>
              <i className='fa fa-play' />Sign speech
            </button>
          </section>

          <section className='surface-card panel-card'>
            <h2 className='panel-title'><span><i className='fa fa-sliders' />Translation</span></h2>
            <div className='form-check form-switch'>
              <input className='form-check-input' type='checkbox' role='switch' id='use-grammar' checked={useGrammar} onChange={(e) => setUseGrammar(e.target.checked)} />
              <label className='form-check-label' htmlFor='use-grammar'>ISL grammar (NLP reordering)</label>
            </div>
            <div className='form-check form-switch mt-1'>
              <input className='form-check-input' type='checkbox' role='switch' id='use-semantic' checked={useSemantic} onChange={(e) => setUseSemantic(e.target.checked)} />
              <label className='form-check-label' htmlFor='use-semantic'>Smart sign matching (ML model)</label>
            </div>
            {(mlStatus || warning) &&
              <p className={warning ? 'ml-status warn' : 'ml-status'}>{warning || mlStatus}</p>}
          </section>
        </div>

        <div className='workspace-stage'>
          <AvatarStage captionLabel='Signing' caption={text} emptyCaption='Type or speak something to start'>
            {gloss &&
              <div className='chips' aria-label='ISL gloss'>
                {gloss.split(' ').map((g, i) => <span key={i} className='chip'>{g}</span>)}
              </div>}
          </AvatarStage>
          <PlaybackControls speed={speed} setSpeed={setSpeed} pause={pause} setPause={setPause} />
        </div>
      </div>
    </div>
  )
}

export default Convert;
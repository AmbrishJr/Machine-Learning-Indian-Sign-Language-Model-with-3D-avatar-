import axios from 'axios';
import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from 'react-router-dom'

import { AVATAR_MODEL, applyAvatarStyle, styleScene, mountAvatarCanvas } from '../Avatar/avatar';
import { defaultPose } from '../Animations/defaultPose';
import PageHeader from '../Components/Layout/PageHeader';
import AvatarStage from '../Components/Workspace/AvatarStage';
import PlaybackControls from '../Components/Workspace/PlaybackControls';

import { translate } from '../Translation/translate';
import { performPlan } from '../Translation/signPlanner';

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Button, Modal } from "react-bootstrap";
import { baseURL } from '../Config/config'


function Video() {
  const [text, setText] = useState("");
  const bot = AVATAR_MODEL;
  const [speed, setSpeed] = useState(0.1);
  const [pause, setPause] = useState(800);
  const [invalidId, setInvalidId] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')

  const params = useParams()
  const [videoId, setVideoId] = useState(params.videoId || '')

  const componentRef = useRef({});
  const { current: ref } = componentRef;

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

  useEffect(() => setVideoId(params.videoId || ''), [params.videoId]);

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
    setText('')
    const { plan } = await translate(str || '');
    performPlan(plan, ref);
  }

  const animateFromID = () => {
      const videoID = videoId.trim();
      axios.get(`${baseURL}/videos/${videoID}`).then((res) => {
        setTitle(res.data.title)
        setDesc(res.data.desc)
        sign(res.data.content);
      }).catch(err => {
        console.error(err)
        setInvalidId(true)
      });
  }

  return (
    <div className='page-container'>
      <PageHeader title='Play a video' subtitle='Open an ISL video by its ID and the avatar signs its content.'>
        <Link to='/sign-kit/all-videos' className='btn btn-soft'><i className='fa fa-th-large' />All videos</Link>
      </PageHeader>
      <div className='workspace'>
        <div className='workspace-panel'>
          <section className='surface-card panel-card'>
            <h2 className='panel-title'><span><i className='fa fa-film' />Video ID</span></h2>
            <form onSubmit={(e) => { e.preventDefault(); animateFromID(); }}>
              <input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder='Paste a video ID'
                     className='form-control' aria-label='Video ID' />
              <button type='submit' disabled={!videoId.trim()} className='btn btn-primary w-100 mt-3'>
                <i className='fa fa-play' />Start video
              </button>
            </form>
          </section>
          {title &&
            <section className='surface-card panel-card'>
              <h2 className='video-meta-title'>{title}</h2>
              <p className='video-meta-desc'>{desc}</p>
            </section>}
        </div>
        <div className='workspace-stage'>
          <AvatarStage captionLabel='Signing' caption={text} emptyCaption='Start a video to see it signed' />
          <PlaybackControls speed={speed} setSpeed={setSpeed} pause={pause} setPause={setPause} />
        </div>
      </div>
      <Modal show={invalidId} onHide={() => setInvalidId(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Invalid Video ID</Modal.Title>
        </Modal.Header>
        <Modal.Body>Please make sure that the video ID that your have entered is valid!</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setInvalidId(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

export default Video;
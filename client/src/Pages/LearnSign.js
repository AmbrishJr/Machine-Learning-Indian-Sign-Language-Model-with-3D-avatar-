import React, { useState, useEffect, useRef } from "react";

import { AVATAR_MODEL, applyAvatarStyle, styleScene, mountAvatarCanvas } from '../Avatar/avatar';
import PageHeader from '../Components/Layout/PageHeader';
import AvatarStage from '../Components/Workspace/AvatarStage';
import PlaybackControls from '../Components/Workspace/PlaybackControls';

import * as words from '../Animations/words';
import * as alphabets from '../Animations/alphabets';
import { defaultPose } from '../Animations/defaultPose';

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

function LearnSign() {
  const bot = AVATAR_MODEL;
  const [speed, setSpeed] = useState(0.1);
  const [pause, setPause] = useState(800);
  const [current, setCurrent] = useState('');

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
    loader.load(
      bot,
      (gltf) => {
        applyAvatarStyle(gltf.scene);
        ref.avatar = gltf.scene;
        ref.scene.add(ref.avatar);
        ref.renderOnce();
        defaultPose(ref);
      }
    );

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
    else {
      ref.flag = true;
      setTimeout(() => {
        ref.flag = false
      }, pause);
      ref.animations.shift();
    }
    ref.renderer.render(ref.scene, ref.camera);
  }

  // Clicks are ignored while a sign is still playing (same as before the redesign).
  const play = (label, animation) => {
    if (ref.animations.length === 0) {
      setCurrent(label);
      animation(ref);
    }
  };

  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(i + 65));

  return (
    <div className='page-container'>
      <PageHeader
        title='Learn signs'
        subtitle='Pick a letter or a word to watch the avatar sign it. Slow it down below to follow each movement.'
      />
      <div className='workspace'>
        <div className='workspace-panel'>
          <section className='surface-card panel-card'>
            <h2 className='panel-title'><span><i className='fa fa-font' />Alphabet</span><span className='chip'>A–Z</span></h2>
            <div className='sign-grid'>
              {letters.map((letter) => (
                <button key={letter} className={`sign-key${current === letter ? ' active' : ''}`}
                        onClick={() => play(letter, alphabets[letter])}>
                  {letter}
                </button>
              ))}
            </div>
          </section>
          <section className='surface-card panel-card'>
            <h2 className='panel-title'><span><i className='fa fa-comments' />Words &amp; phrases</span><span className='chip'>{words.wordList.length}</span></h2>
            <div className='sign-chips'>
              {words.wordList.map((word) => {
                const label = word.replace(/_/g, " ");
                return (
                  <button key={word} className={`sign-chip${current === label ? ' active' : ''}`}
                          onClick={() => play(label, words[word])}>
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <div className='workspace-stage'>
          <AvatarStage captionLabel='Now signing' caption={current} emptyCaption='Choose a letter or word' />
          <PlaybackControls speed={speed} setSpeed={setSpeed} pause={pause} setPause={setPause} />
        </div>
      </div>
    </div>
  )
}

export default LearnSign;

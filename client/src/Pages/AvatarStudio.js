import React, { useState, useEffect, useRef } from "react";
import PageHeader from '../Components/Layout/PageHeader';

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import {
  AVATAR_MODEL, PRESETS, DEFAULT_STYLE, applyAvatarStyle, styleScene,
  loadAvatarStyle, saveAvatarStyle, clearAvatarStyle,
} from '../Avatar/avatar';

const COLOR_FIELDS = [
  ['skin', 'Skin'],
  ['top', 'Top'],
  ['bottom', 'Trousers'],
  ['shoes', 'Shoes'],
];

// The resting pose the signing pages use (Animations/defaultPose.js).
const REST_POSE = [
  ['mixamorigNeck', 'x', Math.PI / 12],
  ['mixamorigLeftArm', 'z', -Math.PI / 3],
  ['mixamorigLeftForeArm', 'y', -Math.PI / 1.5],
  ['mixamorigRightArm', 'z', Math.PI / 3],
  ['mixamorigRightForeArm', 'y', Math.PI / 1.5],
];

const sameStyle = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function AvatarStudio() {
  const [style, setStyle] = useState(loadAvatarStyle);
  const [savedStyle, setSavedStyle] = useState(loadAvatarStyle);
  const [exported, setExported] = useState('');
  const canvasRef = useRef(null);
  const sceneRef = useRef({});

  useEffect(() => {
    const s = sceneRef.current;
    const container = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    s.scene = new THREE.Scene();
    styleScene(s.scene, style);
    s.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    s.camera.position.set(0, 1.35, 2.6);
    s.renderer = new THREE.WebGLRenderer({ antialias: true });
    s.renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(s.renderer.domElement);

    s.controls = new OrbitControls(s.camera, s.renderer.domElement);
    s.controls.target.set(0, 1.15, 0);
    s.controls.enablePan = false;
    s.controls.minDistance = 1;
    s.controls.maxDistance = 4;
    s.controls.update();

    const onResize = () => {
      s.camera.aspect = container.clientWidth / container.clientHeight;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    new GLTFLoader().load(AVATAR_MODEL, (gltf) => {
      s.avatar = gltf.scene;
      REST_POSE.forEach(([bone, axis, value]) => { s.avatar.getObjectByName(bone).rotation[axis] = value; });
      applyAvatarStyle(s.avatar, s.style);
      s.scene.add(s.avatar);
    });

    let frame;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      s.controls.update();
      s.renderer.render(s.scene, s.camera);
    };
    loop();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frame);
      s.controls.dispose();
      s.renderer.dispose();
    };
    // The scene is built once; style changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = sceneRef.current;
    s.style = style;
    if (s.scene) s.scene.background = new THREE.Color(style.background);
    if (s.avatar) applyAvatarStyle(s.avatar, style);
  }, [style]);

  const setColor = (region, value) => setStyle((prev) => ({ ...prev, colors: { ...prev.colors, [region]: value } }));

  const save = () => {
    saveAvatarStyle(style);
    setSavedStyle(style);
  };

  const reset = () => {
    clearAvatarStyle();
    setStyle(DEFAULT_STYLE);
    setSavedStyle(DEFAULT_STYLE);
  };

  const exportDefault = () => {
    const { colors, sleeves, shading, background } = style;
    const code = `export const DEFAULT_STYLE = ${JSON.stringify({ name: 'Custom', colors, sleeves, shading, background }, null, 2)};`;
    setExported(code);
    if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
  };

  return (
    <div className='page-container'>
      <PageHeader
        title='Avatar Studio'
        subtitle='Choose how the signing avatar looks. Drag the preview to rotate it and scroll to zoom. Saved looks apply to every page in this browser.'
      />
      <div className='workspace'>
        <div className='workspace-panel'>
          <section className='surface-card panel-card'>
            <h2 className='panel-title'><span><i className='fa fa-magic' />Presets</span></h2>
            <div className='studio-presets'>
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button key={key} className={`btn ${sameStyle(preset, style) ? 'btn-primary' : 'btn-soft'}`}
                        onClick={() => setStyle(preset)}>
                  <span className='preset-dots' aria-hidden='true'>
                    {['skin', 'top', 'bottom'].map((r) => <span key={r} style={{ background: preset.colors[r] }} />)}
                  </span>
                  {preset.name}
                </button>
              ))}
            </div>
          </section>

          <section className='surface-card panel-card'>
            <h2 className='panel-title'><span><i className='fa fa-tint' />Colours</span></h2>
            <div className='swatch-grid'>
              {COLOR_FIELDS.map(([region, label]) => (
                <div key={region}>
                  <label className='form-label d-block' htmlFor={`color-${region}`}>{label}</label>
                  <input type='color' id={`color-${region}`} className='form-control form-control-color w-100'
                         value={style.colors[region]} onChange={(e) => setColor(region, e.target.value)} />
                </div>
              ))}
              <div>
                <label className='form-label d-block' htmlFor='color-background'>Background</label>
                <input type='color' id='color-background' className='form-control form-control-color w-100'
                       value={style.background} onChange={(e) => setStyle((prev) => ({ ...prev, background: e.target.value }))} />
              </div>
            </div>
            <div className='row g-2 mt-2'>
              <div className='col-6'>
                <label className='form-label' htmlFor='sleeves'>Sleeves</label>
                <select id='sleeves' className='form-select' value={style.sleeves}
                        onChange={(e) => setStyle((prev) => ({ ...prev, sleeves: e.target.value }))}>
                  <option value='long'>Long</option>
                  <option value='short'>Short</option>
                </select>
              </div>
              <div className='col-6'>
                <label className='form-label' htmlFor='shading'>Shading</label>
                <select id='shading' className='form-select' value={style.shading}
                        onChange={(e) => setStyle((prev) => ({ ...prev, shading: e.target.value }))}>
                  <option value='smooth'>Smooth</option>
                  <option value='toon'>Cartoon</option>
                </select>
              </div>
            </div>
          </section>

          <section className='surface-card panel-card'>
            <div className='btn-row'>
              <button className='btn btn-primary' onClick={save} disabled={sameStyle(style, savedStyle)}>
                <i className={`fa ${sameStyle(style, savedStyle) ? 'fa-check' : 'fa-floppy-o'}`} />
                {sameStyle(style, savedStyle) ? 'Saved' : 'Save look'}
              </button>
              <button className='btn btn-soft' onClick={reset}><i className='fa fa-undo' />Reset</button>
            </div>
            <button className='btn btn-link px-0 mt-2' onClick={exportDefault}>
              <i className='fa fa-code' />Copy as default for everyone
            </button>
            {exported &&
              <>
                <p className='ml-status'>
                  Copied. Replace <code>DEFAULT_STYLE</code> in <code>client/src/Avatar/avatar.js</code> with:
                </p>
                <textarea className='form-control export-code mt-2' rows={8} value={exported} readOnly />
              </>}
          </section>
        </div>
        <div className='workspace-stage'>
          <div className='surface-card stage-card'>
            <div id='avatar-studio-canvas' ref={canvasRef} className='stage-canvas studio-stage' />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvatarStudio;

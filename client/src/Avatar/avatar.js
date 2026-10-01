import * as THREE from 'three';
import avatarModel from '../Models/avatar/avatar.glb';

// The app's single signing avatar (Mixamo rig; every sign in Animations/ targets its bones).
export const AVATAR_MODEL = avatarModel;

// Body regions are derived from the bone that moves each vertex, so the one-piece mesh
// can be coloured like skin / top / trousers / shoes without a new model.
export const REGIONS = ['skin', 'top', 'bottom', 'shoes'];

export const PRESETS = {
  classic: {
    name: 'Classic Blue',
    colors: { skin: '#4e8cff', top: '#4e8cff', bottom: '#4e8cff', shoes: '#4e8cff' },
    sleeves: 'long', shading: 'toon', background: '#dddddd',
  },
  teacher: {
    name: 'Teacher',
    colors: { skin: '#c68863', top: '#1f3a68', bottom: '#4a4f57', shoes: '#2b2118' },
    sleeves: 'long', shading: 'smooth', background: '#e9eef5',
  },
  casual: {
    name: 'Casual',
    colors: { skin: '#8d5a3b', top: '#e8743b', bottom: '#2f4a7a', shoes: '#f2f2f2' },
    sleeves: 'short', shading: 'smooth', background: '#f4efe6',
  },
  contrast: {
    name: 'High Contrast',
    colors: { skin: '#f1c27d', top: '#111111', bottom: '#111111', shoes: '#111111' },
    sleeves: 'long', shading: 'toon', background: '#ffffff',
  },
};

// Change this to make a different look the default for everyone (Avatar Studio's
// "Copy as default" button produces the replacement).
export const DEFAULT_STYLE = PRESETS.teacher;

const STORAGE_KEY = 'avatar-style';

export const loadAvatarStyle = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.colors) return { ...DEFAULT_STYLE, ...saved, colors: { ...DEFAULT_STYLE.colors, ...saved.colors } };
  } catch (e) {
    // Storage unavailable or corrupt: fall back to the default look.
  }
  return DEFAULT_STYLE;
};

export const saveAvatarStyle = (style) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
  } catch (e) {
    // Not persisted (private mode etc.); the style still applies for this page.
  }
};

export const clearAvatarStyle = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Nothing stored.
  }
};

const regionOfBone = (name, sleeves) => {
  if (/Head|Neck|Hand/.test(name)) return 'skin';
  if (/ForeArm/.test(name)) return sleeves === 'short' ? 'skin' : 'top';
  if (/Spine|Shoulder|Arm/.test(name)) return 'top';
  if (/Foot|Toe/.test(name)) return 'shoes';
  return 'bottom'; // Hips, UpLeg, Leg
};

// three r136 has no BufferAttribute.getComponent(); these read component k of item v.
const COMPONENT = ['getX', 'getY', 'getZ', 'getW'];
const component = (attribute, v, k) => attribute[COMPONENT[k]](v);

// Joint rings take their body part's colour, slightly darker, so they read as seams.
const JOINT_SHADE = 0.72;

const colorByRegion = (mesh, style, shade = 1) => {
  const { skinIndex, skinWeight } = mesh.geometry.attributes;
  const bones = mesh.skeleton.bones;
  const palette = Object.fromEntries(REGIONS.map((r) => [r, new THREE.Color(style.colors[r]).multiplyScalar(shade)]));
  const colors = new Float32Array(skinIndex.count * 3);
  for (let v = 0; v < skinIndex.count; v++) {
    let best = 0;
    for (let k = 1; k < 4; k++) if (component(skinWeight, v, k) > component(skinWeight, v, best)) best = k;
    const bone = bones[component(skinIndex, v, best)];
    palette[regionOfBone(bone ? bone.name : '', style.sleeves)].toArray(colors, v * 3);
  }
  mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
};

const makeMaterial = (style, options) => (style.shading === 'toon'
  ? new THREE.MeshToonMaterial(options)
  : new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0.05, ...options }));

/**
 * Apply a look to a loaded avatar (gltf.scene): both meshes (body plates and joint
 * rings) are coloured per body region.
 */
export const applyAvatarStyle = (root, style = loadAvatarStyle()) => {
  root.traverse((child) => {
    if (!child.isSkinnedMesh) return;
    child.frustumCulled = false;
    colorByRegion(child, style, /Joints/i.test(child.name) ? JOINT_SHADE : 1);
    child.material = makeMaterial(style, { vertexColors: true });
  });
};

/**
 * Background and lights for a scene showing the avatar. Returns the lights added.
 */
export const styleScene = (scene, style = loadAvatarStyle()) => {
  scene.background = new THREE.Color(style.background);
  const key = new THREE.SpotLight(0xffffff, 0.9);
  key.position.set(0, 5, 5);
  const fill = new THREE.HemisphereLight(0xffffff, 0x667788, 0.45);
  scene.add(key, fill);
  return [key, fill];
};

/**
 * Create the camera and renderer for a signing page inside `container`, sized to the
 * container and kept in sync when it resizes. Sets ref.camera, ref.renderer and
 * ref.renderOnce (draws one frame; the animation loop renders while signing).
 * Returns a cleanup function.
 */
export const mountAvatarCanvas = (ref, container) => {
  const size = () => [Math.max(1, container.clientWidth), Math.max(1, container.clientHeight)];
  const [width, height] = size();

  ref.camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
  ref.camera.position.z = 1.6;
  ref.camera.position.y = 1.4;

  ref.renderer = new THREE.WebGLRenderer({ antialias: true });
  ref.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  ref.renderer.setSize(width, height);
  container.innerHTML = '';
  container.appendChild(ref.renderer.domElement);

  ref.renderOnce = () => ref.renderer.render(ref.scene, ref.camera);

  const onResize = () => {
    const [w, h] = size();
    ref.camera.aspect = w / h;
    ref.camera.updateProjectionMatrix();
    ref.renderer.setSize(w, h);
    ref.renderOnce();
  };
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  if (observer) observer.observe(container);
  else window.addEventListener('resize', onResize);

  return () => {
    if (observer) observer.disconnect();
    else window.removeEventListener('resize', onResize);
    ref.renderer.dispose();
  };
};

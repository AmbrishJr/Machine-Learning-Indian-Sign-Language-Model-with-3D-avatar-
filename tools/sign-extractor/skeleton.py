"""Avatar skeleton (the Mixamo rig of client/src/Models/avatar/avatar.glb) and landmark -> bone-rotation retargeting.

All arm/hand bones of the rig have identity rest rotations in a T-pose: the avatar faces +Z,
its left arm points along +X and palms face down. A bone's local rotation is therefore
parent_world^-1 * world, and its rest "pointing" direction is the offset to its child bone.
Rotations are returned as three.js Euler angles (order XYZ), the format used by
client/src/Animations.
"""
import numpy as np
from pygltflib import GLTF2
from scipy.spatial.transform import Rotation as R

SIDES = ('Left', 'Right')

# MediaPipe hand landmark indices: [base, joint, joint, tip] per finger.
HAND_CHAINS = {
    'Thumb': (1, 2, 3, 4),
    'Index': (5, 6, 7, 8),
    'Middle': (9, 10, 11, 12),
    'Ring': (13, 14, 15, 16),
    'Pinky': (17, 18, 19, 20),
}
# MediaPipe pose landmark indices per side: shoulder, elbow, wrist.
POSE_ARM = {'Left': (11, 13, 15), 'Right': (12, 14, 16)}

FORWARD = np.array([0.0, 0.0, 1.0])


def bone(side, part):
    return f'mixamorig{side}{part}'


class Skeleton:
    def __init__(self, glb_path):
        gltf = GLTF2().load(glb_path)
        self.offset = {}  # bone name -> child offsets by child name (local == world dirs at rest)
        names = [(n.name or '').replace(':', '') for n in gltf.nodes]
        for node, name in zip(gltf.nodes, names):
            for child in node.children or []:
                self.offset.setdefault(name, {})[names[child]] = np.array(gltf.nodes[child].translation or [0, 0, 0])
            if node.rotation and not np.allclose(node.rotation, [0, 0, 0, 1], atol=1e-4) and name.startswith(('mixamorigLeft', 'mixamorigRight')):
                raise ValueError(f'{name} has a non-identity rest rotation; retargeting assumes a T-pose rig')

    def rest_dir(self, parent, child):
        v = self.offset[parent][child]
        return v / np.linalg.norm(v)

    def rest_pos(self, side, part):
        """Position of a hand-level bone relative to the Hand bone."""
        hand = bone(side, 'Hand')
        return self.offset[hand].get(bone(side, part), np.zeros(3))


def _unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def _arc(a, b):
    """Shortest rotation taking unit vector a onto unit vector b."""
    a, b = _unit(a), _unit(b)
    axis = np.cross(a, b)
    s, c = np.linalg.norm(axis), np.dot(a, b)
    if s < 1e-8:
        if c > 0:
            return R.identity()
        perp = _unit(np.cross(a, [1, 0, 0] if abs(a[0]) < 0.9 else [0, 1, 0]))
        return R.from_rotvec(perp * np.pi)
    return R.from_rotvec(axis / s * np.arctan2(s, c))


def _basis(x, across):
    """Orthonormal frame with first axis x and second axis close to `across`."""
    x = _unit(x)
    y = _unit(across - np.dot(across, x) * x)
    return np.column_stack([x, y, np.cross(x, y)])


def _twist(rot, axis):
    """Twist component of `rot` about `axis` (swing-twist decomposition)."""
    x, y, z, w = rot.as_quat()
    proj = np.dot([x, y, z], axis) * axis
    q = np.array([*proj, w])
    n = np.linalg.norm(q)
    return R.identity() if n < 1e-9 else R.from_quat(q / n)


def torso_frame(pose_world):
    """Rotation taking avatar-convention vectors into the person's torso frame (x=left, y=up, z=forward)."""
    p = to_avatar_axes(pose_world)
    left = _unit(p[11] - p[12])
    up = (p[11] + p[12]) / 2 - (p[23] + p[24]) / 2
    up = _unit(up - np.dot(up, left) * left)
    return np.vstack([left, up, np.cross(left, up)])


def to_avatar_axes(points):
    """MediaPipe world coords (x right in image, y down, z away) -> avatar axes (x = signer's left, y up, z toward camera)."""
    return np.asarray(points) * np.array([1.0, -1.0, -1.0])


class Retargeter:
    def __init__(self, skeleton):
        self.sk = skeleton
        self.prev_hinge = {}

    def frame(self, pose_world, hands):
        """
        pose_world: (33, 3) MediaPipe pose world landmarks.
        hands: {'Left': (21, 3) | None, 'Right': ...} MediaPipe hand world landmarks per signer side.
        Returns {bone_name: Rotation} of local rotations.
        """
        T = torso_frame(pose_world)
        pose = to_avatar_axes(pose_world) @ T.T  # into torso frame == avatar world frame
        out = {}
        for side in SIDES:
            sh, el, wr = (pose[i] for i in POSE_ARM[side])
            hand = None if hands.get(side) is None else to_avatar_axes(hands[side]) @ T.T
            out.update(self._arm(side, el - sh, wr - el, hand))
        return out

    def _arm(self, side, upper, fore, hand):
        sk, out = self.sk, {}
        arm, forearm, hand_b = bone(side, 'Arm'), bone(side, 'ForeArm'), bone(side, 'Hand')
        r_arm = sk.rest_dir(arm, forearm)
        r_fore = sk.rest_dir(forearm, hand_b)

        # Upper arm: align direction, and choose its twist so the elbow bends about the
        # rig's natural hinge (forearm folding forward from the T-pose).
        a, f = _unit(upper), _unit(fore)
        bend = np.cross(a, f)
        if np.linalg.norm(bend) > 0.15:
            hinge = _unit(bend)
        else:  # arm nearly straight: keep last hinge, or the one implied by a pure swing
            hinge = self.prev_hinge.get(side, _arc(r_arm, a).apply(_unit(np.cross(r_arm, FORWARD))))
            hinge = _unit(hinge - np.dot(hinge, a) * a)
        self.prev_hinge[side] = hinge
        r_hinge = _unit(np.cross(r_arm, FORWARD))
        W_arm = R.from_matrix(_basis(a, hinge) @ _basis(r_arm, r_hinge).T)
        out[arm] = W_arm

        # Forearm: swing to the wrist direction.
        W_fore = _arc(W_arm.apply(r_fore), f) * W_arm

        if hand is None:
            out[forearm] = W_arm.inv() * W_fore
            return out

        # Hand: full orientation from the palm (wrist -> middle knuckle, pinky -> index knuckle).
        target = _basis(hand[9] - hand[0], hand[5] - hand[17])
        rest = _basis(sk.rest_pos(side, 'HandMiddle1'), sk.rest_pos(side, 'HandIndex1') - sk.rest_pos(side, 'HandPinky1'))
        W_hand = R.from_matrix(target @ rest.T)

        # Move the palm's roll about the forearm axis into the forearm so the wrist doesn't candy-wrap.
        local_hand = W_fore.inv() * W_hand
        twist = _twist(local_hand, r_fore)
        W_fore = W_fore * twist
        out[forearm] = W_arm.inv() * W_fore
        out[hand_b] = W_fore.inv() * W_hand

        # Fingers: swing each joint toward the next landmark.
        for finger, idx in HAND_CHAINS.items():
            parent_world = W_hand
            for j in range(3):
                b = bone(side, f'Hand{finger}{j + 1}')
                child = bone(side, f'Hand{finger}{j + 2}')
                current = parent_world.apply(sk.rest_dir(b, child))
                W = _arc(current, hand[idx[j + 1]] - hand[idx[j]]) * parent_world
                out[b] = parent_world.inv() * W
                parent_world = W
        return out


def to_euler(rotations):
    """{bone: Rotation} -> {bone: (x, y, z)} three.js XYZ Euler angles."""
    return {b: r.as_euler('XYZ') for b, r in rotations.items()}

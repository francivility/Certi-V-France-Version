import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let landmarker = null;

const EYE_BLINK_THRESHOLD = 0.5;

async function init() {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks('/wasm/');
  const baseOptions = { modelAssetPath: '/models/face_landmarker.task' };
  const options = {
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
  };
  try {
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...baseOptions, delegate: 'GPU' },
    });
  } catch {
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...baseOptions, delegate: 'CPU' },
    });
  }
  return landmarker;
}

/**
 * Detect the face in a live <video>.
 * Returns normalized face bounds + eye-closure state, or null when no face.
 */
export async function analyzeFace(video) {
  try {
    const lm = await init();
    if (!video || video.readyState < 2 || video.paused || video.ended) return null;
    const result = lm.detectForVideo(video, performance.now());
    if (!result?.faceLandmarks?.length) return null;
    const pts = result.faceLandmarks[0];
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    let closed = false;
    let blendsOk = false;
    if (result.faceBlendshapes?.length) {
      blendsOk = true;
      const cats = result.faceBlendshapes[0].categories;
      const score = (name) => cats.find((c) => c.categoryName === name)?.score ?? 0;
      closed = (score('eyeBlinkLeft') + score('eyeBlinkRight')) / 2 > EYE_BLINK_THRESHOLD;
    }
    return { minX, minY, maxX, maxY, closed, blendsOk };
  } catch {
    return null;
  }
}
import { useState, Fragment, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Building2, MapPin, Hash, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ScanFace, ShieldCheck, FileCheck2, RefreshCcw, QrCode, Smartphone, CreditCard, Check, Info, Camera, LogIn } from 'lucide-react';
import api from '../api/axios';
import QRCode from 'qrcode';
import { verificationBridgeUrl } from '../config';
import { analyzeFace } from '../face/faceDetector';
import { GoogleLogin } from '@react-oauth/google';
import PasswordInput from '../components/PasswordInput';

function detectIdCard(video) {
  try {
    if (!video || video.readyState < 2) return false;
    const W = 128;
    const H = Math.max(1, Math.round(W * (video.videoHeight / video.videoWidth)));
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    const x1 = Math.floor(W * 0.15);
    const x2 = Math.floor(W * 0.85);
    const y1 = Math.floor(H * 0.18);
    const y2 = Math.floor(H * 0.82);
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    let edges = 0;
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const i = (y * W + x) * 4;
        const b = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sum += b;
        sumSq += b * b;
        n++;
        if (x > x1) {
          const j = (y * W + x - 1) * 4;
          const pb = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
          if (Math.abs(b - pb) > 28) edges++;
        }
      }
    }
    if (!n) return false;
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
    const edgeRatio = edges / n;
    return mean > 55 && mean < 230 && std > 16 && edgeRatio > 0.04;
  } catch {
    return false;
  }
}

function Register() {
  const [step, setStep] = useState(1);
  const [accessToken, setAccessToken] = useState(
    () => (typeof window !== 'undefined' ? localStorage.getItem('access') || '' : '')
  );
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [tin, setTin] = useState('');

  const [idType, setIdType] = useState('driver');
  const [capturedSelfie, setCapturedSelfie] = useState(false);
  const [capturedId, setCapturedId] = useState(false);
  const [mobileStage, setMobileStage] = useState('id-type');

  const idOptions = [
    { key: 'driver', label: "Driver's License" },
    { key: 'passport', label: 'Passport' },
    { key: 'umid', label: 'UMID' },
    { key: 'postal', label: 'Postal ID' },
    { key: 'prc', label: 'PRC ID' },
    { key: 'national', label: 'National ID / PhilSys' },
  ];

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('accounts/register/step1/', { username, password, email });
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('register_code', res.data.code);
      setAccessToken(res.data.access);
      sessionCodeRef.current = res.data.code;
      setIsLoading(false);
      setStep(2);
    } catch (err) {
      setIsLoading(false);
      setError(
        err.response?.data?.error ||
        err.response?.data?.username ||
        'Registration failed. Check your inputs.'
      );
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('accounts/google/', {
        credential: credentialResponse.credential,
      });

      if (res.data.mode === 'login') {
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('refresh', res.data.refresh);
        navigate('/');
      } else if (res.data.mode === 'register') {
        localStorage.setItem('access', res.data.access);
        localStorage.setItem('register_code', res.data.code);
        setAccessToken(res.data.access);
        sessionCodeRef.current = res.data.code;
        setUsername(res.data.username || '');
        setEmail(res.data.email || '');
        setBusinessName(res.data.business_name || '');
        setAddress(res.data.address || '');
        setTin(res.data.tin || '');
        setIsLoading(false);
        setStep(2);
      } else {
        setIsLoading(false);
        setError('Unexpected response from server.');
      }
    } catch (err) {
      setIsLoading(false);
      setError(
        err.response?.data?.error || 'Google sign-up failed. Please try again.'
      );
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access');
    if (!token) return;
    let cancelled = false;
    api
      .get('accounts/register/state/', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (cancelled) return;
        setStep(res.data.step);
        setBusinessName(res.data.business_name || '');
        setAddress(res.data.address || '');
        setTin(res.data.tin || '');
        localStorage.setItem('register_code', res.data.code || '');
      })
      .catch(() => {
        localStorage.removeItem('register_code');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.post(
        'accounts/register/step2/',
        { business_name: businessName, address, tin },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setIsLoading(false);
      setStep(3);
    } catch {
      setIsLoading(false);
      setError('Could not save applicant info.');
    }
  };

  const goToLogin = () => {
    navigate('/login', { state: { registered: true } });
  };

  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const selfieVideoRef = useRef(null);
  const idVideoRef = useRef(null);
  const streamRef = useRef(null);
  const idStreamRef = useRef(null);
  const captureFramesRef = useRef([]);
  const pollTimerRef = useRef(null);
  const sessionCodeRef = useRef('');
  const idBlobRef = useRef(null);
  const idFramesRef = useRef([]);
  const idPreviewUrlRef = useRef(null);
  const selfieLoopRef = useRef(null);
  const blinkStateRef = useRef('open');
  const blinksRef = useRef(0);
  const fittedRef = useRef(false);
  const lastSnapshotRef = useRef(0);
  const autoAdvanceRef = useRef(false);
  const cameraStartedRef = useRef(false);
  const idDetectTimerRef = useRef(null);

  const [qrDataUrl, setQrDataUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyState, setVerifyState] = useState('idle');
  const [verifyProgress, setVerifyProgress] = useState('');
  const [faceFitted, setFaceFitted] = useState(false);
  const [blinksDetected, setBlinksDetected] = useState(0);
  const [idPreviewUrl, setIdPreviewUrl] = useState('');
  const [idAligned, setIdAligned] = useState(false);

  const verifyChecks = [
    { label: 'Face scan', done: capturedSelfie },
    { label: 'Government ID', done: capturedId },
    { label: 'Automated check', done: verifyState === 'done' },
  ];

  const faceStatus = !faceFitted
    ? 'Center your face in the oval'
    : blinksDetected === 0
    ? 'Face detected \u2713 \u2014 Blink once now'
    : blinksDetected === 1
    ? 'Blink again'
    : 'Face captured \u2713';

  const ensureSession = async () => {
    if (sessionCodeRef.current) return sessionCodeRef.current;
    const saved = localStorage.getItem('register_code');
    if (saved) {
      sessionCodeRef.current = saved;
      return saved;
    }
    const res = await api.post('verification/session/');
    sessionCodeRef.current = res.data.code;
    return res.data.code;
  };

  const startFrontCamera = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    streamRef.current = stream;
    const vid = selfieVideoRef.current;
    if (vid) {
      vid.srcObject = stream;
      await vid.play().catch(() => {});
    }
    cameraStartedRef.current = true;
    return stream;
  }, []);

  const startIdCamera = useCallback(async () => {
    if (idStreamRef.current) return idStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    idStreamRef.current = stream;
    const vid = idVideoRef.current;
    if (vid) {
      vid.srcObject = stream;
      await vid.play().catch(() => {});
    }
    return stream;
  }, []);

  const stopFrontCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (selfieVideoRef.current) selfieVideoRef.current.srcObject = null;
    cameraStartedRef.current = false;
  }, []);

  const stopIdCamera = useCallback(() => {
    if (idStreamRef.current) {
      idStreamRef.current.getTracks().forEach((t) => t.stop());
      idStreamRef.current = null;
    }
    if (idVideoRef.current) idVideoRef.current.srcObject = null;
  }, []);

  const stopAllCameras = useCallback(() => {
    stopFrontCamera();
    stopIdCamera();
  }, [stopFrontCamera, stopIdCamera]);

  const waitForVideoFrame = (video, timeout = 3000) =>
    new Promise((resolve, reject) => {
      if (!video) {
        reject(new Error('Camera preview is unavailable'));
        return;
      }
      const isReady = () => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
      if (isReady()) {
        resolve();
        return;
      }
      const cleanup = () => {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', ready);
        video.removeEventListener('playing', ready);
      };
      const ready = () => {
        if (!isReady()) return;
        cleanup();
        resolve();
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Camera did not provide a frame in time'));
      }, timeout);
      video.addEventListener('loadeddata', ready);
      video.addEventListener('playing', ready);
    });

  const snapshotVideo = async (video) => {
    await waitForVideoFrame(video);
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create ID image'))), 'image/jpeg', 0.85);
    });
  };

  const createDecodedPreviewUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not load ID preview'));
      reader.readAsDataURL(blob);
    });

  const computeFaceFit = (analysis) => {
    const bx = (analysis.maxX + analysis.minX) / 2;
    const by = (analysis.minY + analysis.maxY) / 2;
    const bw = analysis.maxX - analysis.minX;
    const bh = analysis.maxY - analysis.minY;
    const ovalH = 2 * 0.32;
    const ovalW = 2 * 0.29;
    return (
      Math.abs(bx - 0.5) < 0.1 &&
      Math.abs(by - 0.5) < 0.12 &&
      bh / ovalH > 0.85 &&
      bh / ovalH < 1.18 &&
      bw / ovalW > 0.7
    );
  };

  const restartSelfieCapture = () => {
    cancelAnimationFrame(selfieLoopRef.current);
    selfieLoopRef.current = null;
    stopFrontCamera();
    captureFramesRef.current = [];
    autoAdvanceRef.current = false;
    blinkStateRef.current = 'open';
    blinksRef.current = 0;
    fittedRef.current = false;
    lastSnapshotRef.current = 0;
    setFaceFitted(false);
    setBlinksDetected(0);
    setCapturedSelfie(false);
    setMobileStage('selfie');
  };

  const completeSelfie = useCallback(() => {
    if (autoAdvanceRef.current) return;
    autoAdvanceRef.current = true;
    setTimeout(() => {
      cancelAnimationFrame(selfieLoopRef.current);
      selfieLoopRef.current = null;
      stopFrontCamera();
      setCapturedSelfie(true);
      setTimeout(() => setMobileStage('id'), 650);
    }, 1000);
  }, [stopFrontCamera]);

  const selfieLoopNextRef = useRef(() => {});

  const runSelfieLoop = useCallback(async () => {
    const video = selfieVideoRef.current;
    if (!video) {
      selfieLoopRef.current = requestAnimationFrame(selfieLoopNextRef.current);
      return;
    }
    const analysis = await analyzeFace(video);
    let fit = false;
    if (analysis) {
      fit = computeFaceFit(analysis);
      if (analysis.closed) {
        if (blinkStateRef.current === 'open') {
          blinkStateRef.current = 'closed';
          if (fit && blinksRef.current < 2) {
            blinksRef.current += 1;
            setBlinksDetected(blinksRef.current);
            if (blinksRef.current >= 2) completeSelfie();
          }
        }
      } else {
        blinkStateRef.current = 'open';
      }
    }
    if (fit !== fittedRef.current) {
      fittedRef.current = fit;
      setFaceFitted(fit);
    }
    if (cameraStartedRef.current && performance.now() - lastSnapshotRef.current > 80) {
      lastSnapshotRef.current = performance.now();
      const blob = await snapshotVideo(video);
      if (blob) {
        captureFramesRef.current.push(blob);
        if (captureFramesRef.current.length > 90) captureFramesRef.current.shift();
      }
    }
    selfieLoopRef.current = requestAnimationFrame(selfieLoopNextRef.current);
  }, [completeSelfie]);

  useEffect(() => {
    selfieLoopNextRef.current = runSelfieLoop;
  }, [runSelfieLoop]);

  useEffect(() => {
    if (step === 3 && mobileStage === 'selfie' && !capturedSelfie && !isDesktop) {
      const timer = setTimeout(() => {
        startFrontCamera()
          .then(() => {
            if (!selfieLoopRef.current) {
              lastSnapshotRef.current = performance.now();
              selfieLoopRef.current = requestAnimationFrame(runSelfieLoop);
            }
          })
          .catch(() =>
            setError(
              'Camera is not available. Allow camera access in your browser, or use the QR flow on desktop.'
            )
          );
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [step, mobileStage, capturedSelfie, isDesktop, startFrontCamera, runSelfieLoop]);

  useEffect(() => {
    if (mobileStage !== 'selfie') {
      cancelAnimationFrame(selfieLoopRef.current);
      selfieLoopRef.current = null;
      stopFrontCamera();
      blinkStateRef.current = 'open';
      blinksRef.current = 0;
      fittedRef.current = false;
      lastSnapshotRef.current = 0;
      const timer = setTimeout(() => setBlinksDetected(0), 0);
      return () => clearTimeout(timer);
    }
  }, [mobileStage, stopFrontCamera]);

  useEffect(() => {
    if (step === 3 && mobileStage === 'id' && !capturedId) {
      const timer = setTimeout(() => {
        startIdCamera().catch(() => setError('Could not access the back camera. Check camera permissions.'));
        idDetectTimerRef.current = setInterval(() => {
          const v = idVideoRef.current;
          if (v) setIdAligned(detectIdCard(v));
        }, 250);
      }, 80);
      return () => {
        clearTimeout(timer);
        if (idDetectTimerRef.current) {
          clearInterval(idDetectTimerRef.current);
          idDetectTimerRef.current = null;
        }
        setIdAligned(false);
      };
    }
  }, [step, mobileStage, capturedId, startIdCamera]);

  const handleVerificationDone = () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('register_code');
    setVerifyState('done');
    setTimeout(() => setRegistered(true), 800);
  };

  const pollStatus = async (code) => {
    try {
      const res = await api.get(`accounts/register/verify/status/${code}/`);
      const s = res.data;
      if (s.status === 'done') {
        clearInterval(pollTimerRef.current);
        handleVerificationDone();
      } else if (s.status === 'failed') {
        clearInterval(pollTimerRef.current);
        setVerifyState('failed');
        setError(s.error_message || 'Verification did not pass.');
      } else if (s.status === 'expired') {
        clearInterval(pollTimerRef.current);
        setVerifyState('failed');
        setError('The QR code expired. Regenerate it to try again.');
      }
    } catch {
      // transient errors are ignored; polling continues
    }
  };

  const startDesktopFlow = useCallback(async () => {
    clearInterval(pollTimerRef.current);
    try {
      const code = await ensureSession();
      const dataUrl = await QRCode.toDataURL(verificationBridgeUrl(code), {
        width: 200,
        margin: 1,
      });
      setQrDataUrl(dataUrl);
      pollTimerRef.current = setInterval(() => pollStatus(code), 2500);
    } catch {
      setError('Could not start the verification session. Is the backend running?');
    }
  }, []);

  useEffect(() => {
    if (step === 3 && isDesktop) {
      const timer = setTimeout(startDesktopFlow, 0);
      return () => {
        clearTimeout(timer);
        clearInterval(pollTimerRef.current);
      };
    }
  }, [step, isDesktop, startDesktopFlow]);

  useEffect(() => {
    if (step !== 3) {
      cancelAnimationFrame(selfieLoopRef.current);
      selfieLoopRef.current = null;
      stopAllCameras();
      clearInterval(pollTimerRef.current);
    }
  }, [step, stopAllCameras]);

  useEffect(
    () => () => {
      cancelAnimationFrame(selfieLoopRef.current);
      stopAllCameras();
      clearInterval(pollTimerRef.current);
      idPreviewUrlRef.current = null;
    },
    [stopAllCameras]
  );

  const submitVerification = async () => {
    const code = sessionCodeRef.current || (await ensureSession());
    cancelAnimationFrame(selfieLoopRef.current);
    selfieLoopRef.current = null;
    stopAllCameras();
    setVerifying(true);
    setVerifyState('running');
    setVerifyProgress('Verifying your identity…');
    const fd = new FormData();
    captureFramesRef.current.forEach((blob, i) => fd.append('frame', blob, `selfie_${i}.jpg`));
    const idFrames = idFramesRef.current.length ? idFramesRef.current : [idBlobRef.current];
    idFrames.filter(Boolean).forEach((blob, index) => fd.append('id_image', blob, `id_${index}.jpg`));
    fd.append('id_type', idType);
    fd.append('blink_count', String(blinksRef.current));
    try {
      const res = await api.post(`verification/submit/${code}/`, fd);
      if (res.data.status === 'done') {
        handleVerificationDone();
      } else {
        setVerifyState('failed');
        setError(res.data.message || 'Verification did not pass.');
      }
    } catch (err) {
      setVerifyState('failed');
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
      setVerifyProgress('');
    }
  };

  const handleCaptureId = async () => {
    setVerifying(true);
    setError('');
    try {
      const frames = [];
      for (let index = 0; index < 3; index += 1) {
        const blob = await snapshotVideo(idVideoRef.current);
        if (blob) frames.push(blob);
        if (index < 2) await new Promise((resolve) => setTimeout(resolve, 180));
      }
      if (!frames.length) throw new Error('No ID frame captured');
      idFramesRef.current = frames;
      idBlobRef.current = frames[0];
      const url = await createDecodedPreviewUrl(frames[0]);
      idPreviewUrlRef.current = url;
      setIdPreviewUrl(url);
      stopIdCamera();
      setCapturedId(true);
    } catch {
      setError('Could not capture the ID. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const retakeId = () => {
    idPreviewUrlRef.current = null;
    setIdPreviewUrl('');
    idBlobRef.current = null;
    idFramesRef.current = [];
    setCapturedId(false);
    setVerifyState('idle');
    setError('');
  };

  const resetVerification = () => {
    cancelAnimationFrame(selfieLoopRef.current);
    selfieLoopRef.current = null;
    stopAllCameras();
    clearInterval(pollTimerRef.current);
    captureFramesRef.current = [];
    idBlobRef.current = null;
    idFramesRef.current = [];
    idPreviewUrlRef.current = null;
    setIdPreviewUrl('');
    autoAdvanceRef.current = false;
    blinkStateRef.current = 'open';
    blinksRef.current = 0;
    fittedRef.current = false;
    setQrDataUrl('');
    setVerifyState('idle');
    setVerifyProgress('');
    setError('');
    setFaceFitted(false);
    setBlinksDetected(0);
    setIdAligned(false);
    setVerifying(false);
    setMobileStage('id-type');
    setCapturedSelfie(false);
    setCapturedId(false);
  };

  const steps = [
    { n: 1, label: 'Account', desc: 'Your login credentials' },
    { n: 2, label: 'Applicant info', desc: 'Business details' },
    { n: 3, label: 'Verification', desc: 'Face & ID check' },
  ];

  const inputBase =
    'w-full bg-transparent border-b border-gray-300 pl-6 pr-1 py-2.5 text-[15px] text-[#0E2036] placeholder-gray-400 focus:outline-none focus:border-[#C9A227] transition-colors';

  const iconBase = 'absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400';

  if (registered) {
    return (
      <div className="min-h-screen bg-[#F2F3F1] flex">
        <div
          className="hidden lg:flex w-[42%] bg-[#0E2036] text-white flex-col justify-between p-12 xl:p-14 relative overflow-hidden"
          style={{ backgroundImage: 'url(/login-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-[#0E2036]/95" aria-hidden="true" />
          <div className="absolute -right-16 -bottom-16 opacity-[0.06]">
            <svg width="320" height="320" viewBox="0 0 320 320" fill="none">
              <circle cx="160" cy="160" r="158" stroke="#C9A227" strokeWidth="2" />
              <circle cx="160" cy="160" r="128" stroke="#C9A227" strokeWidth="1.5" />
              <circle cx="160" cy="160" r="98" stroke="#C9A227" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative flex items-center gap-3">
            <img src="/logo.png" alt="LTFRB Region V Logo" className="w-12 h-12 object-contain" />
            <div className="leading-tight">
              <div className="font-serif text-lg font-semibold">Certi-V</div>
              <div className="text-xs text-white/50">LTFRB Region V</div>
            </div>
          </div>

          <div className="relative my-auto py-14 max-w-md">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-5">
              <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
              Official government portal
            </div>
            <h1 className="font-serif text-3xl xl:text-4xl font-semibold leading-tight mb-5">
              Welcome to Certi-V
            </h1>
            <p className="text-white/70 text-[15px] leading-relaxed">
              Your identity has been verified and your account is ready. Sign in to begin your CPC application.
            </p>
          </div>

          <p className="relative text-xs text-white/40">
            &copy; {new Date().getFullYear()} LTFRB Region V. All rights reserved.
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 lg:py-16">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex flex-col items-center mb-8">
              <img src="/logo.png" alt="Certi-V Logo" className="w-14 h-14 object-contain mb-3" />
              <span className="font-serif text-lg font-semibold text-[#0E2036]">Certi-V &middot; LTFRB Region V</span>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 md:p-10 text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[#1B7F37]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-[#1B7F37]" />
                </div>
              </div>

              <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">
                You are now verified
              </h2>

              <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                You can now log in using your user credentials. Your account has been created
                and your identity has been successfully verified.
              </p>

              <div className="mt-6 rounded-lg bg-[#0E2036]/5 border border-[#0E2036]/10 px-4 py-3 text-left">
                <p className="flex items-start gap-2 text-xs text-[#0E2036]/80 leading-relaxed">
                  <Info className="w-4 h-4 text-[#C9A227] shrink-0 mt-0.5" />
                  <span>
                    Verification is a one-time process. When you sign in again, you'll be logged in
                    directly — no QR scan, no face scan, no ID capture needed.
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={goToLogin}
                className="mt-7 w-full py-3.5 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Back to Login
              </button>

              <p className="mt-4 text-xs text-gray-400">
                Sign in using the same Google account you just registered with.
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F3F1] flex">
      <div
        className="hidden lg:flex w-[42%] bg-[#0E2036] text-white flex-col justify-between p-12 xl:p-14 relative overflow-hidden"
        style={{ backgroundImage: 'url(/login-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-[#0E2036]/95" aria-hidden="true" />
        <div className="absolute -right-16 -bottom-16 opacity-[0.06]">
          <svg width="320" height="320" viewBox="0 0 320 320" fill="none">
            <circle cx="160" cy="160" r="158" stroke="#C9A227" strokeWidth="2" />
            <circle cx="160" cy="160" r="128" stroke="#C9A227" strokeWidth="1.5" />
            <circle cx="160" cy="160" r="98" stroke="#C9A227" strokeWidth="1" />
          </svg>
        </div>

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="LTFRB Region V Logo" className="w-12 h-12 object-contain" />
          <div className="leading-tight">
            <div className="font-serif text-lg font-semibold">Certi-V</div>
            <div className="text-xs text-white/50">LTFRB Region V</div>
          </div>
        </div>

        <div className="relative my-auto py-14 max-w-md">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-5">
            <ShieldCheck className="w-4 h-4 text-[#C9A227]" />
            Official government portal
          </div>
          <h1 className="font-serif text-3xl xl:text-4xl font-semibold leading-tight mb-5">
            Apply for a Certificate of Public Convenience
          </h1>
          <p className="text-white/70 text-[15px] leading-relaxed mb-10">
            Create your account to begin the digital CPC application process with the Land Transportation Franchising and Regulatory Board, Regional Office No. 5.
          </p>

          <ul className="space-y-4">
            {[
              { icon: FileCheck2, text: 'Fully online document submission' },
              { icon: RefreshCcw, text: 'Real-time application status tracking' },
              { icon: ShieldCheck, text: 'Secure and verified government processing' },
            ].map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <f.icon className="w-4 h-4 text-[#C9A227]" />
                </div>
                <span className="text-sm text-white/80 leading-relaxed pt-1.5">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          &copy; {new Date().getFullYear()} LTFRB Region V. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 lg:py-16">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src="/logo.png" alt="Certi-V Logo" className="w-14 h-14 object-contain mb-3" />
            <span className="font-serif text-lg font-semibold text-[#0E2036]">Certi-V &middot; LTFRB Region V</span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8 md:p-10">
            <h2 className="font-serif text-2xl font-semibold text-[#0E2036]">Create account</h2>
            <p className="mt-1.5 text-sm text-gray-500">{steps.find((s) => s.n === step)?.desc}</p>

            <div className="flex items-center mt-7 mb-8">
              {steps.map((s, idx) => (
                <Fragment key={s.n}>
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${
                        step === s.n
                          ? 'bg-[#0E2036] border-[#0E2036] text-white ring-2 ring-[#C9A227]/50 ring-offset-2'
                          : step > s.n
                          ? 'bg-[#0E2036] border-[#0E2036] text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
                    </div>
                    <span className={`text-[11px] text-center ${step === s.n ? 'text-[#0E2036] font-medium' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`h-px flex-1 mx-2 -mt-5 ${step > s.n ? 'bg-[#C9A227]' : 'bg-gray-200'}`} />
                  )}
                </Fragment>
              ))}
            </div>

            {error && step !== 3 && (
              <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-[#0E2036]">Username</label>
                  <div className="mt-1.5 relative">
                    <User className={iconBase} />
                    <input className={inputBase} placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2036]">Email</label>
                  <div className="mt-1.5 relative">
                    <Mail className={iconBase} />
                    <input className={inputBase} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2036]">Password</label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                    icon={Lock}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to applicant info <ArrowRight className="w-4 h-4" /></>}
                </button>

                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-gray-400">
                      or sign up with Google
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google sign-up failed. Please try again.')}
                    width="320"
                    text="signup_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    locale="en"
                  />
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-[#0E2036]">Business name</label>
                  <div className="mt-1.5 relative">
                    <Building2 className={iconBase} />
                    <input className={inputBase} placeholder="Registered business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2036]">Address</label>
                  <div className="mt-1.5 relative">
                    <MapPin className={iconBase} />
                    <input className={inputBase} placeholder="Business address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-[#0E2036]">TIN</label>
                  <div className="mt-1.5 relative">
                    <Hash className={iconBase} />
                    <input className={inputBase} placeholder="Taxpayer Identification Number" value={tin} onChange={(e) => setTin(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0E2036] transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to verification <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div>
                <div className="lg:hidden">
                  <div className="mb-6 space-y-3">
                    {verifyChecks.map((c) => (
                      <div key={c.label} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${c.done ? 'bg-[#1B7F37] text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {c.done ? <Check className="w-3.5 h-3.5" /> : <span className="text-[11px] font-semibold">{verifyChecks.findIndex((x) => x.label === c.label) + 1}</span>}
                        </div>
                        <span className={`text-sm font-medium ${c.done ? 'text-[#0E2036]' : 'text-gray-400'}`}>{c.label}</span>
                        {c.label === 'Automated check' && verifyState === 'running' && (
                          <span className="ml-auto text-[11px] font-medium text-[#C9A227]">in progress…</span>
                        )}
                        {c.label === 'Automated check' && verifyState === 'failed' && (
                          <span className="ml-auto text-[11px] font-medium text-red-500">failed — retry</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {mobileStage === 'id-type' && (
                    <div>
                      <div className="flex items-center justify-center mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#0E2036]/5 flex items-center justify-center">
                          <ScanFace className="w-6 h-6 text-[#0E2036]" />
                        </div>
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-[#0E2036] text-center">Verify your identity</h3>
                      <p className="text-center text-sm text-gray-500 mt-1.5 mb-5">
                        Select the government ID you'll show to confirm it's really you.
                      </p>

                      <div className="space-y-2.5">
                        {idOptions.map((o) => (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => setIdType(o.key)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left text-sm font-medium transition-colors cursor-pointer ${
                              idType === o.key
                                ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#0E2036]'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <CreditCard className={`w-4 h-4 ${idType === o.key ? 'text-[#C9A227]' : 'text-gray-400'}`} />
                              {o.label}
                            </span>
                            {idType === o.key && <Check className="w-4 h-4 text-[#C9A227]" />}
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 rounded-lg bg-[#0E2036]/5 border border-[#0E2036]/10 px-4 py-3 flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-[#0E2036] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#0E2036]/70 leading-relaxed">
                          Your photo and ID are used only to verify your identity and are kept securely.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={restartSelfieCapture}
                        className="mt-5 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md hover:bg-[#152C48] transition-colors cursor-pointer"
                      >
                        Start camera
                      </button>
                    </div>
                  )}

                  {mobileStage === 'selfie' && (
                    <div>
                      <div className="relative selfie-frame rounded-xl overflow-hidden bg-[#0E2036] text-white">
                        <video
                          ref={selfieVideoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{ transform: 'scaleX(-1)' }}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <ellipse
                            cx="50"
                            cy="50"
                            rx="29"
                            ry="32"
                            fill="none"
                            stroke={faceFitted ? '#22C55E' : 'rgba(255, 255, 255, 0.72)'}
                            strokeWidth="0.65"
                            strokeDasharray={faceFitted ? undefined : '3 2.25'}
                            className={`transition-all duration-200 ${
                              faceFitted ? 'drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]' : ''
                            }`}
                          />
                        </svg>
                        <div className="absolute inset-x-4 top-0 bottom-0 border-x-2 border-[#C9A227]/60 [mask-image:linear-gradient(to_bottom,black,transparent_25%,transparent_75%,black)]" />
                        <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                          <p
                            className={`text-[11px] tracking-widest uppercase font-medium ${
                              faceFitted ? 'text-[#22C55E]' : 'text-white/80'
                            }`}
                          >
                            {faceStatus}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-2">
                        {[1, 2].map((n) => (
                          <div
                            key={n}
                            className={`w-3 h-3 rounded-full transition-colors ${
                              blinksDetected >= n ? 'bg-[#22C55E]' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-xs text-gray-500">
                          {blinksDetected === 0
                            ? 'Blink twice to verify'
                            : blinksDetected === 1
                            ? 'Blink again'
                            : 'Verified \u2713'}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setMobileStage('id-type')}
                          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0E2036] bg-transparent border-0 cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <p className="text-xs text-gray-400 text-right max-w-[60%]">
                          The camera captures automatically after your second blink
                        </p>
                      </div>
                    </div>
                  )}

                  {mobileStage === 'id' && (
                    <div>
                      <div className="relative rounded-xl overflow-hidden bg-[#0E2036] aspect-[16/10] text-white">
                        {capturedId && idPreviewUrl ? (
                          <img
                            src={idPreviewUrl}
                            alt="Captured ID preview"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <video
                              ref={idVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div
                              className={`absolute inset-x-7 top-1/2 -translate-y-1/2 h-[84%] border-2 rounded-md pointer-events-none transition-all duration-300 ${
                                idAligned
                                  ? 'border-solid border-[#22C55E] shadow-[0_0_14px_rgba(34,197,94,0.55)]'
                                  : 'border-dashed border-white/50'
                              }`}
                            />
                            <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                              <p
                                className={`text-[11px] tracking-widest uppercase font-medium transition-colors ${
                                  idAligned ? 'text-[#22C55E]' : 'text-white/80'
                                }`}
                              >
                                {idAligned
                                  ? 'ID aligned \u2713'
                                  : `Align your ${idOptions.find((o) => o.key === idType)?.label}`}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {capturedId ? (
                        <>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={retakeId}
                              disabled={verifying}
                              className="flex items-center justify-center gap-1.5 py-3 border border-gray-300 text-sm font-medium text-gray-600 rounded-md hover:border-gray-400 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <RefreshCcw className="w-4 h-4" /> Retake
                            </button>
                            <button
                              type="button"
                              onClick={submitVerification}
                              disabled={verifying}
                              className="flex items-center justify-center gap-1.5 py-3 bg-[#0E2036] text-white text-sm font-medium rounded-md hover:bg-[#152C48] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {verifying ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  Use this photo <Check className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                          <p className="mt-2.5 text-center text-xs text-gray-400">
                            ID looks good? Tap "Use this photo" to verify. Not clear? Retake it.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-center mt-4">
                            <button
                              type="button"
                              onClick={handleCaptureId}
                              disabled={verifying}
                              className="w-24 h-24 rounded-full border-4 border-[#C9A227] bg-white flex items-center justify-center shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Capture ID"
                            >
                              <div className="w-16 h-16 rounded-full bg-[#0E2036] flex items-center justify-center text-white">
                                <Camera className={`w-6 h-6 ${verifying ? 'animate-pulse' : ''}`} />
                              </div>
                            </button>
                          </div>
                          <p className="mt-2.5 text-center text-xs text-gray-400">Tap the button to capture your ID</p>
                          <div className="flex items-center justify-between mt-4">
                            <button
                              type="button"
                              onClick={restartSelfieCapture}
                              className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0E2036] bg-transparent border-0 cursor-pointer"
                            >
                              <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            <span className="w-[76px]" />
                          </div>
                        </>
                      )}

                      {verifyState === 'running' && (
                        <div className="mt-6 w-full py-3 bg-[#0E2036] text-white text-[15px] font-medium rounded-md flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> {verifyProgress || 'Verifying your identity…'}
                        </div>
                      )}

                      {verifyState === 'failed' && (
                        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {error}
                          <p className="mt-1 text-xs text-red-500">
                            The take wasn't usable — tap Retake ID and try again with better light.
                          </p>
                          <div className="mt-3 flex gap-3">
                            <button
                              type="button"
                              onClick={resetVerification}
                              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#0E2036] bg-transparent border-0 cursor-pointer"
                            >
                              Start over
                            </button>
                            <button
                              type="button"
                              onClick={retakeId}
                              className="flex items-center gap-1.5 text-xs font-medium text-[#0E2036] hover:text-[#C9A227] bg-transparent border-0 cursor-pointer"
                            >
                              <RefreshCcw className="w-3.5 h-3.5" /> Retake ID
                            </button>
                          </div>
                        </div>
                      )}

                      {verifyState === 'done' && (
                        <div className="mt-4 rounded-lg bg-[#1B7F37]/10 border border-[#1B7F37]/20 px-4 py-3">
                          <p className="flex items-center gap-2 text-sm font-medium text-[#1B7F37]">
                            <CheckCircle2 className="w-4 h-4" /> Identity verified
                          </p>
                          <p className="text-xs text-[#1B7F37]/70 mt-1">
                            Loading your confirmation…
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="hidden lg:flex flex-col items-center text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 px-3 py-1 text-xs font-semibold text-[#8a6d14] mb-5">
                    <Smartphone className="w-3.5 h-3.5" /> Continue on your phone
                  </div>

                  <div className="flex items-center justify-center mb-5">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Face & ID verification QR code"
                        className="w-44 h-44 bg-white border-2 border-[#0E2036]/10 rounded-xl p-1 shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-white border-2 border-[#0E2036]/10 rounded-xl flex items-center justify-center shadow-sm">
                        <QrCode className="w-14 h-14 text-[#0E2036] animate-pulse" />
                      </div>
                    )}
                  </div>

                  <h3 className="font-serif text-xl font-semibold text-[#0E2036]">Face & ID verification</h3>
                  <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                    Scan the QR code with your phone to verify your identity securely.
                  </p>

                  <div className="mt-5 w-full max-w-xs bg-[#0E2036]/5 border border-[#0E2036]/10 rounded-xl p-4 text-left">
                    <p className="text-xs font-semibold text-[#0E2036] uppercase tracking-widest mb-3">On your phone</p>
                    <ol className="space-y-2.5">
                      {[
                        'Open your phone camera and point it at the QR code',
                        'Tap the link that appears to open Certi-V verification',
                        'Follow the on-screen steps to capture your face and ID',
                      ].map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-[#0E2036] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-600 leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {verifyState === 'done' ? (
                    <div className="mt-3 w-full max-w-xs rounded-lg bg-[#1B7F37]/10 border border-[#1B7F37]/20 px-4 py-3">
                      <p className="text-sm font-semibold text-[#1B7F37] flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" /> Identity verified
                      </p>
                      <p className="text-xs text-[#1B7F37]/70 mt-1 text-center">
                        Loading your confirmation…
                      </p>
                    </div>
                  ) : verifyState === 'failed' ? (
                    <div className="mt-3 w-full max-w-xs rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  ) : (
                    <div className="mt-3 w-full max-w-xs rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-[#C9A227] animate-pulse shrink-0" />
                      <p className="text-xs text-gray-500">Awaiting verification from your phone…</p>
                    </div>
                  )}

                  {verifyState === 'failed' && (
                    <button
                      type="button"
                      onClick={() => {
                        resetVerification();
                        startDesktopFlow();
                      }}
                      className="mt-5 flex items-center gap-1.5 text-sm font-medium text-[#0E2036] hover:text-[#C9A227] transition-colors bg-transparent border-0 cursor-pointer"
                    >
                      <RefreshCcw className="w-4 h-4" /> Regenerate QR code
                    </button>
                  )}
                  {(verifyState === 'idle' || verifyState === 'running') && (
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="mt-5 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0E2036] bg-transparent border-0 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to applicant info
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already registered?{' '}
            <Link to="/login" className="text-[#0E2036] font-medium hover:text-[#C9A227] transition-colors">
              Sign in
            </Link>
            <span className="mx-2 text-gray-300">|</span>
            <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
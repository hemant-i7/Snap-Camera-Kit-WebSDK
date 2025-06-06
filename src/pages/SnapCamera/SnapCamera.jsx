import React, { useEffect, useRef, useCallback } from 'react';
import { bootstrapCameraKit, createMediaStreamSource, Transform2D } from "@snap/camera-kit";
import './SnapCamera.css';

let mediaStream;

const SnapCamera = () => {
  const canvasRef = useRef(null);
  const apiToken = process.env.REACT_APP_API_TOKEN;
  const lensGroupId = process.env.REACT_APP_LENS_GROUP_ID;
  const cameraSelectRef = useRef(null);
  const lensSelectRef = useRef(null);

  const setCameraKitSource = useCallback(async (session, deviceId) => {
    if (mediaStream) {
      session.pause();
      mediaStream.getVideoTracks()[0].stop();
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId } });
    const source = createMediaStreamSource(mediaStream);
    await session.setSource(source);
    source.setTransform(Transform2D.MirrorX);
    session.play();
  }, []);

  const attachCamerasToSelect = useCallback(async (session) => {
    if (!cameraSelectRef.current) return;
    
    cameraSelectRef.current.innerHTML = '';
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(({ kind }) => kind === 'videoinput');

    cameras.forEach((camera) => {
      const option = document.createElement('option');
      option.value = camera.deviceId;
      option.text = camera.label;
      cameraSelectRef.current?.appendChild(option);
    });

    cameraSelectRef.current.addEventListener('change', (event) => {
      const deviceId = event.target.selectedOptions[0].value;
      setCameraKitSource(session, deviceId);
    });
  }, [setCameraKitSource]);

  const attachLensesToSelect = useCallback(async (lenses, session) => {
    if (!lensSelectRef.current) return;
    
    lensSelectRef.current.innerHTML = '';
    lenses.forEach((lens) => {
      const option = document.createElement('option');
      option.value = lens.id;
      option.text = lens.name;
      lensSelectRef.current?.appendChild(option);
    });

    lensSelectRef.current.addEventListener('change', (event) => {
      const lensId = event.target.selectedOptions[0].value;
      const lens = lenses.find((lens) => lens.id === lensId);
      if (lens) session.applyLens(lens);
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const cameraKit = await bootstrapCameraKit({ apiToken });
      const session = await cameraKit.createSession();

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.replaceWith(session.output.live);
      }
      const { lenses } = await cameraKit.lenses.repository.loadLensGroups([lensGroupId]);
      session.applyLens(lenses[19]);
      await setCameraKitSource(session);
      await attachCamerasToSelect(session);
      await attachLensesToSelect(lenses, session);
    };

    init();
  }, [apiToken, lensGroupId, setCameraKitSource, attachCamerasToSelect, attachLensesToSelect]);

  return (
    <div className="container">
      <canvas ref={canvasRef} id="canvas-container" width="1920" height="1080"></canvas>
      <div className="footer">
        <select ref={cameraSelectRef} className="styled-select"></select>
        <select ref={lensSelectRef} className="styled-select"></select>
      </div>
    </div>
  );
};

export default SnapCamera;

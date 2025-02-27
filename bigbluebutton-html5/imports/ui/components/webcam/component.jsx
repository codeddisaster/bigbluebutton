import React, { useState, useEffect } from 'react';
import Resizable from 're-resizable';
import Draggable from 'react-draggable';
import cx from 'classnames';
import styles from './styles.scss';
import { ACTIONS, CAMERADOCK_POSITION } from '../layout/enums';
import DropAreaContainer from './drop-areas/container';
import VideoProviderContainer from '/imports/ui/components/video-provider/container';
import Storage from '/imports/ui/services/storage/session';

const WebcamComponent = ({
  cameraDock,
  swapLayout,
  layoutContextDispatch,
  fullscreen,
  isPresenter,
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullScreen] = useState(false);
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0 });
  const [cameraMaxWidth, setCameraMaxWidth] = useState(0);

  const lastSize = Storage.getItem('webcamSize') || { width: 0, height: 0 };
  const { width: lastWidth, height: lastHeight } = lastSize;

  const isCameraTopOrBottom = cameraDock.position === CAMERADOCK_POSITION.CONTENT_TOP
    || cameraDock.position === CAMERADOCK_POSITION.CONTENT_BOTTOM;
  const isCameraLeftOrRight = cameraDock.position === CAMERADOCK_POSITION.CONTENT_LEFT
    || cameraDock.position === CAMERADOCK_POSITION.CONTENT_RIGHT;

  useEffect(() => {
    setIsFullScreen(fullscreen.group === 'webcams');
  }, [fullscreen]);

  useEffect(() => {
    if (isCameraTopOrBottom && lastHeight > 0) {
      layoutContextDispatch(
        {
          type: ACTIONS.SET_CAMERA_DOCK_SIZE,
          value: {
            width: cameraDock.width,
            height: lastHeight,
            browserWidth: window.innerWidth,
            browserHeight: window.innerHeight,
          },
        },
      );
    }
    if (isCameraLeftOrRight && lastWidth > 0) {
      layoutContextDispatch(
        {
          type: ACTIONS.SET_CAMERA_DOCK_SIZE,
          value: {
            width: lastWidth,
            height: cameraDock.height,
            browserWidth: window.innerWidth,
            browserHeight: window.innerHeight,
          },
        },
      );
    }
  }, [cameraDock.position, lastWidth, lastHeight]);

  useEffect(() => {
    const newCameraMaxWidth = (isPresenter && cameraDock.presenterMaxWidth) ? cameraDock.presenterMaxWidth: cameraDock.maxWidth;
    setCameraMaxWidth(newCameraMaxWidth);

    if (isCameraLeftOrRight && cameraDock.width > newCameraMaxWidth) {
      layoutContextDispatch(
        {
          type: ACTIONS.SET_CAMERA_DOCK_SIZE,
          value: {
            width: newCameraMaxWidth,
            height: cameraDock.height,
            browserWidth: window.innerWidth,
            browserHeight: window.innerHeight,
          },
        },
      );
      Storage.setItem('webcamSize', { width: newCameraMaxWidth, height: lastHeight });
    }
  }, [cameraDock.position, isPresenter]);

  const onResizeHandle = (deltaWidth, deltaHeight) => {
    if (cameraDock.resizableEdge.top || cameraDock.resizableEdge.bottom) {
      layoutContextDispatch(
        {
          type: ACTIONS.SET_CAMERA_DOCK_SIZE,
          value: {
            width: cameraDock.width,
            height: resizeStart.height + deltaHeight,
            browserWidth: window.innerWidth,
            browserHeight: window.innerHeight,
          },
        },
      );
    }
    if (cameraDock.resizableEdge.left || cameraDock.resizableEdge.right) {
      layoutContextDispatch(
        {
          type: ACTIONS.SET_CAMERA_DOCK_SIZE,
          value: {
            width: resizeStart.width + deltaWidth,
            height: cameraDock.height,
            browserWidth: window.innerWidth,
            browserHeight: window.innerHeight,
          },
        },
      );
    }
  };

  const handleWebcamDragStart = () => {
    setIsDragging(true);
    document.body.style.overflow = 'hidden';
    layoutContextDispatch({
      type: ACTIONS.SET_CAMERA_DOCK_IS_DRAGGING,
      value: true,
    });
  };

  const handleWebcamDragStop = (e) => {
    setIsDragging(false);
    document.body.style.overflow = 'auto';

    if (Object.values(CAMERADOCK_POSITION).includes(e.target.id)) {
      layoutContextDispatch({
        type: ACTIONS.SET_CAMERA_DOCK_POSITION,
        value: e.target.id,
      });
    }

    layoutContextDispatch({
      type: ACTIONS.SET_CAMERA_DOCK_IS_DRAGGING,
      value: false,
    });
  };

  const draggableClassName = cx({
    [styles.draggable]: cameraDock.isDraggable && !isFullscreen && !isDragging,
    [styles.draggingBg]: isDragging,
  });
  const resizableClassName = cx({
    [styles.resizeWrapperH]: cameraDock.position === CAMERADOCK_POSITION.CONTENT_TOP
      || cameraDock.position === CAMERADOCK_POSITION.CONTENT_BOTTOM,
    [styles.resizeWrapperV]: cameraDock.position === CAMERADOCK_POSITION.CONTENT_LEFT
      || cameraDock.position === CAMERADOCK_POSITION.CONTENT_RIGHT,
  });

  return (
    <>
      {isDragging ? <DropAreaContainer /> : null}
      <Draggable
        handle="video"
        bounds="html"
        onStart={handleWebcamDragStart}
        onStop={handleWebcamDragStop}
        onMouseDown={
          cameraDock.isDraggable ? (e) => e.preventDefault() : undefined
        }
        disabled={!cameraDock.isDraggable || isResizing || isFullscreen}
        position={
          {
            x: cameraDock.left - cameraDock.right,
            y: cameraDock.top,
          }
        }
      >
        <Resizable
          minWidth={cameraDock.minWidth}
          minHeight={cameraDock.minHeight}
          maxWidth={cameraMaxWidth}
          size={{
            width: cameraDock.width,
            height: cameraDock.height,
          }}
          handleWrapperClass={resizableClassName}
          onResizeStart={() => {
            setIsResizing(true);
            setResizeStart({ width: cameraDock.width, height: cameraDock.height });
          }}
          onResize={(e, direction, ref, d) => {
            onResizeHandle(d.width, d.height);
          }}
          onResizeStop={() => {
            if (isCameraTopOrBottom) {
              Storage.setItem('webcamSize', { width: lastWidth, height: cameraDock.height });
            }
            if (isCameraLeftOrRight) {
              Storage.setItem('webcamSize', { width: cameraDock.width, height: lastHeight });
            }
            setResizeStart({ width: 0, height: 0 });
            setTimeout(() => setIsResizing(false), 500);
          }}
          enable={{
            top: !isFullscreen && !isDragging && !swapLayout && cameraDock.resizableEdge.top,
            bottom: !isFullscreen && !isDragging && !swapLayout && cameraDock.resizableEdge.bottom,
            left: !isFullscreen && !isDragging && !swapLayout && cameraDock.resizableEdge.left,
            right: !isFullscreen && !isDragging && !swapLayout && cameraDock.resizableEdge.right,
            topLeft: false,
            topRight: false,
            bottomLeft: false,
            bottomRight: false,
          }}
          style={{
            position: 'absolute',
            zIndex: cameraDock.zIndex,
          }}
        >
          <div
            id="cameraDock"
            className={draggableClassName}
            draggable={cameraDock.isDraggable && !isFullscreen ? 'true' : undefined}
            style={{
              width: cameraDock.width,
              height: cameraDock.height,
              opacity: isDragging ? 0.5 : undefined,
            }}
          >
            <VideoProviderContainer
              {...{
                swapLayout,
                cameraDock,
              }}
            />
          </div>
        </Resizable>
      </Draggable>
    </>
  );
};

export default WebcamComponent;

import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { createResourceLocatorString } from '../../util/routes';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';

import {
  WRONG_TYPE_MESSAGE,
  createDragCounter,
  hasFiles,
  isPhoto,
  offerPhoto,
  wasDropHandled,
} from './photoDrop';

import css from './PhotoDropOverlay.module.css';

const TOAST_MS = 3000;

/**
 * Drop a photo anywhere on any page to search with it. Mounted once for the
 * whole app. The photo goes to the search bar on this page; a page without a
 * search bar opens the search page, whose bar then runs the photo search.
 * A drop on the search bar itself is handled there, not here.
 *
 * @component
 * @returns {JSX.Element|null}
 */
const PhotoDropOverlay = () => {
  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const counter = useRef(createDragCounter());
  const toastTimer = useRef(null);
  // The listeners are added once; they read the latest props through this.
  const latest = useRef({});
  latest.current = { history, routeConfiguration };

  // Window listeners only here, so server rendering never touches window.
  useEffect(() => {
    const showToast = message => {
      clearTimeout(toastTimer.current);
      setToast(message);
      toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
    };

    const onEnter = e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(counter.current.enter());
    };
    const onOver = e => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // allows the drop
      e.dataTransfer.dropEffect = 'copy';
    };
    const onLeave = e => {
      if (!hasFiles(e)) return;
      setDragging(counter.current.leave());
    };
    const onDrop = e => {
      if (!hasFiles(e)) return;
      setDragging(counter.current.reset());
      // The search bar already took this drop.
      if (wasDropHandled(e)) return;
      e.preventDefault(); // stops the browser from opening the file
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (!isPhoto(file)) {
        showToast(WRONG_TYPE_MESSAGE);
        return;
      }
      if (offerPhoto(file)) return;
      const { history: h, routeConfiguration: routes } = latest.current;
      h.push(createResourceLocatorString('SearchPage', routes, {}, {}), {
        smartSearch: { pendingPhoto: file },
      });
    };
    // Drag ended outside the window (e.g. Escape): no drop event comes.
    const onDragEnd = () => setDragging(counter.current.reset());

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    window.addEventListener('dragend', onDragEnd);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', onDragEnd);
      clearTimeout(toastTimer.current);
    };
  }, []);

  if (!dragging && !toast) return null;

  return (
    <>
      {dragging ? (
        <div className={css.overlay} aria-hidden="true">
          <div className={css.card}>
            <span className={css.icon}>📷</span>
            <p className={css.title}>Drop your photo to find similar items</p>
            <p className={css.hint}>JPG, PNG or WEBP</p>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div role="alert" className={css.toast}>
          {toast}
        </div>
      ) : null}
    </>
  );
};

export default PhotoDropOverlay;

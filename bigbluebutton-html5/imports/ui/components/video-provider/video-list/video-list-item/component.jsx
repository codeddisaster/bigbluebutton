import React, { Component } from 'react';
import browserInfo from '/imports/utils/browserInfo';
import { Meteor } from 'meteor/meteor';
import PropTypes from 'prop-types';
import _ from 'lodash';
import cx from 'classnames';
import Dropdown from '/imports/ui/components/dropdown/component';
import Icon from '/imports/ui/components/icon/component';
import FullscreenService from '/imports/ui/components/fullscreen-button/service';
import FullscreenButtonContainer from '/imports/ui/components/fullscreen-button/container';
import { styles } from '../styles';
import VideoService from '../../service';
import {
  isStreamStateUnhealthy,
  subscribeToStreamStateChange,
  unsubscribeFromStreamStateChange,
} from '/imports/ui/services/bbb-webrtc-sfu/stream-state-service';
import deviceInfo from '/imports/utils/deviceInfo';

const ALLOW_FULLSCREEN = Meteor.settings.public.app.allowFullscreen;

class VideoListItem extends Component {
  constructor(props) {
    super(props);
    this.videoTag = null;

    this.state = {
      videoIsReady: false,
      isFullscreen: false,
      isStreamHealthy: false,
    };

    this.mirrorOwnWebcam = VideoService.mirrorOwnWebcam(props.userId);

    this.setVideoIsReady = this.setVideoIsReady.bind(this);
    this.onFullscreenChange = this.onFullscreenChange.bind(this);
    this.onStreamStateChange = this.onStreamStateChange.bind(this);
    this.updateOrientation = this.updateOrientation.bind(this);
  }

  componentDidMount() {
    const { onVideoItemMount, cameraId } = this.props;

    onVideoItemMount(this.videoTag);
    this.videoTag.addEventListener('loadeddata', this.setVideoIsReady);
    this.videoContainer.addEventListener('fullscreenchange', this.onFullscreenChange);
    subscribeToStreamStateChange(cameraId, this.onStreamStateChange);
    window.addEventListener('resize', this.updateOrientation);
  }

  componentDidUpdate() {
    const playElement = (elem) => {
      if (elem.paused) {
        elem.play().catch((error) => {
          // NotAllowedError equals autoplay issues, fire autoplay handling event
          if (error.name === 'NotAllowedError') {
            const tagFailedEvent = new CustomEvent('videoPlayFailed', { detail: { mediaTag: elem } });
            window.dispatchEvent(tagFailedEvent);
          }
        });
      }
    };

    // This is here to prevent the videos from freezing when they're
    // moved around the dom by react, e.g., when  changing the user status
    // see https://bugs.chromium.org/p/chromium/issues/detail?id=382879
    if (this.videoTag) {
      playElement(this.videoTag);
    }
  }

  componentWillUnmount() {
    const { cameraId, onVideoItemUnmount } = this.props;

    this.videoTag.removeEventListener('loadeddata', this.setVideoIsReady);
    this.videoContainer.removeEventListener('fullscreenchange', this.onFullscreenChange);
    unsubscribeFromStreamStateChange(cameraId, this.onStreamStateChange);
    onVideoItemUnmount(cameraId);
    window.removeEventListener('resize', this.updateOrientation);
  }

  onStreamStateChange(e) {
    const { streamState } = e.detail;
    const { isStreamHealthy } = this.state;

    const newHealthState = !isStreamStateUnhealthy(streamState);
    e.stopPropagation();

    if (newHealthState !== isStreamHealthy) {
      this.setState({ isStreamHealthy: newHealthState });
    }
  }

  onFullscreenChange() {
    const { isFullscreen } = this.state;
    const serviceIsFullscreen = FullscreenService.isFullScreen(this.videoContainer);

    if (isFullscreen !== serviceIsFullscreen) {
      this.setState({ isFullscreen: serviceIsFullscreen });
    }
  }

  setVideoIsReady() {
    const { videoIsReady } = this.state;
    if (!videoIsReady) this.setState({ videoIsReady: true });
    window.dispatchEvent(new Event('resize'));

    /* used when re-sharing cameras after leaving a breakout room.
    it is needed in cases where the user has more than one active camera
    so we only share the second camera after the first
    has finished loading (can't share more than one at the same time) */
    Session.set('canConnect', true);
  }

  getAvailableActions() {
    const {
      actions,
      cameraId,
      name,
    } = this.props;

    return _.compact([
      <Dropdown.DropdownListTitle className={styles.hiddenDesktop} key="name">{name}</Dropdown.DropdownListTitle>,
      <Dropdown.DropdownListSeparator className={styles.hiddenDesktop} key="sep" />,
      ...actions.map((action) => (<Dropdown.DropdownListItem key={`${cameraId}-${action.actionName}`} {...action} />)),
    ]);
  }

  updateOrientation() {
    this.setState({ isPortrait: deviceInfo.isPortrait() });
  }

  renderFullscreenButton() {
    const { name, cameraId } = this.props;
    const { isFullscreen } = this.state;

    if (!ALLOW_FULLSCREEN) return null;

    return (
      <FullscreenButtonContainer
        data-test="webcamsFullscreenButton"
        fullscreenRef={this.videoContainer}
        elementName={name}
        elementId={cameraId}
        elementGroup="webcams"
        isFullscreen={isFullscreen}
        dark
      />
    );
  }

  render() {
    const {
      videoIsReady,
      isFullscreen,
      isStreamHealthy,
      isPortrait,
    } = this.state;
    const {
      name,
      voiceUser,
      numOfStreams,
      swapLayout,
      mirrored,
      isFullscreenContext,
    } = this.props;
    const availableActions = this.getAvailableActions();
    const enableVideoMenu = Meteor.settings.public.kurento.enableVideoMenu || false;
    const shouldRenderReconnect = !isStreamHealthy && videoIsReady;

    const { isFirefox } = browserInfo;
    const { isPhone } = deviceInfo;
    const isTethered = isPhone && isPortrait;

    return (
      <div
        data-test={voiceUser.talking ? 'webcamItemTalkingUser' : 'webcamItem'}
        className={cx({
          [styles.content]: true,
          [styles.talking]: voiceUser.talking,
          [styles.fullscreen]: isFullscreenContext,
        })}
      >
        {
          !videoIsReady
          && (
            <div
              data-test="webcamConnecting"
              className={cx({
                [styles.connecting]: true,
                [styles.content]: true,
                [styles.talking]: voiceUser.talking,
              })}
            >
              <span className={styles.loadingText}>{name}</span>
            </div>
          )

        }

        {
          shouldRenderReconnect
          && <div className={styles.reconnecting} />
        }

        <div
          className={styles.videoContainer}
          ref={(ref) => { this.videoContainer = ref; }}
        >
          <video
            muted
            data-test={this.mirrorOwnWebcam ? 'mirroredVideoContainer' : 'videoContainer'}
            className={cx({
              [styles.media]: true,
              [styles.mirroredVideo]: (this.mirrorOwnWebcam && !mirrored)
                || (!this.mirrorOwnWebcam && mirrored),
              [styles.unhealthyStream]: shouldRenderReconnect,
            })}
            ref={(ref) => { this.videoTag = ref; }}
            autoPlay
            playsInline
          />
          {videoIsReady && this.renderFullscreenButton()}
        </div>
        {videoIsReady
          && (
            <div className={styles.info}>
              {enableVideoMenu && availableActions.length >= 3
                ? (
                  <Dropdown tethered={isTethered} placement="right bottom" className={isFirefox ? styles.dropdownFireFox : styles.dropdown}>
                    <Dropdown.DropdownTrigger className={styles.dropdownTrigger}>
                      <span>{name}</span>
                    </Dropdown.DropdownTrigger>
                    <Dropdown.DropdownContent placement="top left" className={styles.dropdownContent}>
                      <Dropdown.DropdownList className={styles.dropdownList}>
                        {availableActions}
                      </Dropdown.DropdownList>
                    </Dropdown.DropdownContent>
                  </Dropdown>
                )
                : (
                  <div className={isFirefox ? styles.dropdownFireFox
                    : styles.dropdown}
                  >
                    <span className={cx({
                      [styles.userName]: true,
                      [styles.noMenu]: numOfStreams < 3,
                    })}
                    >
                      {name}
                    </span>
                  </div>
                )}
              {voiceUser.muted && !voiceUser.listenOnly ? <Icon className={styles.muted} iconName="unmute_filled" /> : null}
              {voiceUser.listenOnly ? <Icon className={styles.voice} iconName="listen" /> : null}
              {voiceUser.joined && !voiceUser.muted ? <Icon className={styles.voice} iconName="unmute" /> : null}
            </div>
          )}
      </div>
    );
  }
}

export default VideoListItem;

VideoListItem.defaultProps = {
  numOfStreams: 0,
};

VideoListItem.propTypes = {
  actions: PropTypes.arrayOf(PropTypes.object).isRequired,
  cameraId: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  numOfStreams: PropTypes.number,
};

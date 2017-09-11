var ZoomMeetingStatus = {
	MEETING_STATUS_IDLE:0,///< Idle status, no meeting running
	MEETING_STATUS_CONNECTING:1,///< Connecting meeting server status
	MEETING_STATUS_WAITINGFORHOST:2,///< Waiting for host to start meeting
	MEETING_STATUS_INMEETING:3,///< Meeting is ready, in meeting status
	MEETING_STATUS_DISCONNECTING:4,///< Disconnecting meeting server status
	MEETING_STATUS_RECONNECTING:5,///< Reconnecting meeting server status
	MEETING_STATUS_FAILED:6,///< Meeting connection error
	MEETING_STATUS_ENDED:7,///< Meeting is ended
	MEETING_STATUS_UNKNOW:8,
	MEETING_STATUS_LOCKED:9,
	MEETING_STATUS_UNLOCKED:10,
	MEETING_STATUS_IN_WAITING_ROOM:11,
	MEETING_STATUS_WEBINAR_PROMOTE:12,
	MEETING_STATUS_WEBINAR_DEPROMOTE:13,
	MEETING_STATUS_JOIN_BREAKOUT_ROOM:14,
	MEETING_STATUS_LEAVE_BREAKOUT_ROOM:15,
};

var ZoomMeetingFailCode = {
	MEETING_SUCCESS							: 0,
	MEETING_FAIL_NETWORK_ERR				: 1,
	MEETING_FAIL_RECONNECT_ERR				: 2,
	MEETING_FAIL_MMR_ERR					: 3,
	MEETING_FAIL_PASSWORD_ERR				: 4,
	MEETING_FAIL_SESSION_ERR				: 5,
	MEETING_FAIL_MEETING_OVER				: 6,
	MEETING_FAIL_MEETING_NOT_START			: 7,
	MEETING_FAIL_MEETING_NOT_EXIST			: 8,
	MEETING_FAIL_MEETING_USER_FULL			: 9,
	MEETING_FAIL_CLIENT_INCOMPATIBLE		: 10,///< RESULT_ZC_INCOMPATIBLE
	MEETING_FAIL_NO_MMR						: 11,
	MEETING_FAIL_CONFLOCKED					: 12,
	MEETING_FAIL_MEETING_RESTRICTED			: 13,
	MEETING_FAIL_MEETING_RESTRICTED_JBH		: 14,
	MEETING_FAIL_CANNOT_EMIT_WEBREQUEST		: 15,
	MEETING_FAIL_CANNOT_START_TOKENEXPIRE	: 16,
	SESSION_VIDEO_ERR						: 17,
	SESSION_AUDIO_AUTOSTARTERR				: 18,
	MEETING_FAIL_REGISTERWEBINAR_FULL		: 19,
	MEETING_FAIL_REGISTERWEBINAR_HOSTREGISTER		: 20,
	MEETING_FAIL_REGISTERWEBINAR_PANELISTREGISTER	: 21,
	MEETING_FAIL_REGISTERWEBINAR_DENIED_EMAIL		: 22,
	MEETING_FAIL_ENFORCE_LOGIN		: 23,
	MEETING_FAIL_WRITE_CONFIG_FILE			: 50,	///< Failed to write configure file
}; 

var ZoomMeetingUIViewType = {
	MEETINGUI_FIRST_MONITOR:0,
	MEETINGUI_SECOND_MONITOR:1,
};

var ZOOMSDKMOD_4MEET = require('./zoom_sdk.js')
var ZoomMeetingUIMOD = require('./zoom_meeting_ui_ctrl.js')
var ZoomAnnotationMOD = require('./zoom_annotation_ctrl.js')
var ZoomMeetingConfigurationMOD = require('./zoom_meeting_configuration.js')
var ZoomMeetingAudioMOD = require('./zoom_meeting_audio.js')
var ZoomMeetingVideoMOD = require('./zoom_meeting_video.js')
var ZoomMeetingShareMOD = require('./zoom_meeting_share.js')

var ZoomMeeting = (function () {
  var instance;
   /**
 * Zoom SDK Meeting Service Init
 * @param {{
 *  addon: zoom sdk module
 *  meetingstatuscb: function, The logincb method specifies a callback method to call on meeting status changed.
 * }} opts
 * @return {ZoomMeeting}
 */
  function init(opts) {
 
    var clientOpts = opts || {};

    // Private methods and variables
    var _addon = clientOpts.addon || null
    var _meetingstatuscb = clientOpts.meetingstatuscb || null
    var _meetinguserjoincb = clientOpts.meetinguserjoincb || null
    var _meetinguserleftcb = clientOpts.meetinguserleftcb || null
    var _meetinghostchangecb = clientOpts.meetinghostchangecb || null
    var _isInmeeting = false
    var _lasthostid = 0
    if (_addon){
        _addon.SetMeetingStatusCB(onMeetingStatus)
        _addon.SetMeetingUserJoinCB(onUserJoin)
        _addon.SetMeetingUserLeftCB(onUserLeft)
        _addon.SetMeetingHostChangeCB(onHostChange)
    }

    var userlist = new Map();

    function UpdateHostId(newid, oldid) {
        var newhost = userlist.get(newid)
        if (newhost === undefined)
            return
        newhost.ishost = 'true'

        _lasthostid = newid

        var oldhost = userlist.get(oldid)
        if (oldhost === undefined)
            return
        oldhost.ishost = 'false'
    }
    function onHostChange(userid) {
        if (_lasthostid == userid)
            return
        UpdateHostId(userid, _lasthostid)
        if (_meetinghostchangecb)
            _meetinghostchangecb(userid)
    }

    function onMeetingStatus(status, errorcode) {
        if (ZoomMeetingStatus.MEETING_STATUS_INMEETING == status
        || ZoomMeetingStatus.MEETING_STATUS_LOCKED == status
        || ZoomMeetingStatus.MEETING_STATUS_UNLOCKED == status){
            _isInmeeting = true
        } else {
            _isInmeeting = false
            userlist.clear()
        }
        if (null != _meetingstatuscb)
            _meetingstatuscb(status, errorcode)
    }

    function onUserJoin(userinfolist) {
        var userarray = JSON.parse(userinfolist);
        userarray.userlist.forEach(function (item, index) {
            var useritem = new Object();
            useritem.userid = parseInt(item.userid, 10)
            useritem.username = item.username
            useritem.isme = item.isme
            useritem.ishost = item.ishost
            if (useritem.ishost === 'true')
                _lasthostid = useritem.userid
            useritem.audiostatus = ZoomMeetingAudioMOD.ZoomMeetingAudioStatus.Audio_None
            useritem.videostatus = ZoomMeetingVideoMOD.ZoomMeetingVideoStatus.Video_OFF
            userlist.set(useritem.userid, useritem)
             if (null != _meetinguserjoincb){
                _meetinguserjoincb(useritem)
        }
        });
    }

    function onUserLeft(userinfolist, nouse) {
        var userarray = JSON.parse(userinfolist);
        userarray.userlist.forEach(function (item, index) {
            var userid = parseInt(item.userid, 10)
            userlist.delete(userid)
            if (null != _meetinguserleftcb){
                _meetinguserleftcb(userid)
            }
        });
    }

    return {
 
      // Public methods and variables
      /** Start meeting
        * @param {{
        *  meetingnum: Number, A number to the meeting to be started.
        * }} opts
        * @return {ZoomSDKError}
        */
       StartMeeting: function (opts) {
            if (_addon){
                var clientOpts = opts || {}
                var meetingnum = clientOpts.meetingnum || 0
                return _addon.StartMeeting(meetingnum)
            }

            return ZOOMSDKMOD_4MEET.ZoomSDKError.SDKERR_UNINITIALIZE
        },

      /** Join meeting
        * @param {{
        *  meetingnum: Number, A number to the meeting to be started.
        *  username: String, 
        * }} opts
        * @return {ZoomSDKError}
        */
        JoinMeeting: function (opts) {
            if (_addon) {
                var clientOpts = opts || {}
                var meetingnum = clientOpts.meetingnum || 0
                var username = clientOpts.username || ''
                return _addon.JoinMeeting(meetingnum, username)
            }

            return ZOOMSDKMOD_4MEET.ZoomSDKError.SDKERR_UNINITIALIZE
        },

      /** Leave meeting
        * @param {{
        *  endMeeting: Boolean,
        * }} opts
        * @return {ZoomSDKError}
        */
        LeaveMeeting: function (opts) {
            if (_addon) {
                var clientOpts = opts || {}
                var endMeeting = clientOpts.endMeeting || false
                return _addon.LeaveMeeting(endMeeting)
            }

            return ZOOMSDKMOD_4MEET.ZoomSDKError.SDKERR_UNINITIALIZE
        },

        GetUserList :function () {
            return userlist
        },

        GetMeetingUICtrl: function(opts) {
            if (_addon){
                var clientOpts = opts || {}
                clientOpts.addon = _addon
                clientOpts.zoommeeting = instance
                return ZoomMeetingUIMOD.ZoomMeetingUICtrl.getInstance(clientOpts)
            }
        },
        
        GetAnnotationCtrl: function(opts) {
            if (_addon){
                var clientOpts = opts || {}
                clientOpts.addon = _addon
                clientOpts.zoommeeting = instance
                return ZoomAnnotationMOD.ZoomAnnotationCtrl.getInstance(clientOpts)
            }
        },

        GetMeetingConfiguration : function(opts) {
            if (_addon){
                var clientOpts = opts || {}
                clientOpts.addon = _addon
                clientOpts.zoommeeting = instance
                return ZoomMeetingConfigurationMOD.ZoomMeetingConfiguration.getInstance(clientOpts)
            }
        },

        GetMeetingAudio : function(opts) {
           if (_addon){
                var clientOpts = opts || {}
                clientOpts.addon = _addon
                clientOpts.zoommeeting = instance
                return ZoomMeetingAudioMOD.ZoomMeetingAudio.getInstance(clientOpts)
            } 
        },

        GetMeetingVideo : function(opts) {
           if (_addon){
                var clientOpts = opts || {}
                clientOpts.addon = _addon
                clientOpts.zoommeeting = instance
                return ZoomMeetingVideoMOD.ZoomMeetingVideo.getInstance(clientOpts)
            } 
        },

        GetMeetingShare : function(opts) {
           if (_addon){
                var clientOpts = opts || {}
                clientOpts.addon = _addon
                clientOpts.zoommeeting = instance
                return ZoomMeetingShareMOD.ZoomMeetingShare.getInstance(clientOpts)
            } 
        },

         //internal interface
        UpdateAudioStatus: function (userid, status) {
            var useritem = userlist.get(userid)
            if (useritem === undefined)
                return
            
            useritem.audiostatus = status
            userlist.set(userid, useritem)
        },

        UpdateVideoStatus : function(userid, status) {
            var useritem = userlist.get(userid)
            if (useritem === undefined)
                return
            
            useritem.videostatus = status
            userlist.set(userid, useritem)
        },
    };
  };
 
  return {
    /**
     * Get Zoom SDK Meeting Service Module
     * @return {ZoomMeeting}
    */
    getInstance: function (opts) {
 
      if ( !instance ) {
        instance = init(opts)
      }
 
      return instance
    }
 
  };
 
})();

module.exports = {
    ZoomMeetingStatus: ZoomMeetingStatus,
    ZoomMeetingFailCode: ZoomMeetingFailCode,
    ZoomAnnotationMOD: ZoomAnnotationMOD,
    ZoomMeetingUIViewType: ZoomMeetingUIViewType,
    ZoomMeeting: ZoomMeeting,
}
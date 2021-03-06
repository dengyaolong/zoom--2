
var ZoomAuthResult = {
	AUTHRET_SUCCESS:0,///< Auth Success 
	AUTHRET_KEYORSECRETEMPTY:1,///< Key or Secret is empty
	AUTHRET_KEYORSECRETWRONG:2,///< Key or Secret is wrong
	AUTHRET_ACCOUNTNOTSUPPORT:3,///< Client Account does not support
	AUTHRET_ACCOUNTNOTENABLESDK:4,///< Client account does not enable SDK
	AUTHRET_UNKNOWN:5,///< Auth Unknown error
	AUTHRET_NONE:6,///< Initial status
};

var ZoomLoginStatus = {
	LOGIN_IDLE:0,///< Not login
	LOGIN_PROCESSING:1,///< Login in processing
	LOGIN_SUCCESS:2,///< Login success
	LOGIN_FAILED:3,///< Login failed
};
var ZOOMSDKMOD_4AUTH = require('./zoom_sdk.js')

var ZoomAuth = (function () {
  var instance;

  /**
 * Zoom SDK Authentication Service Init
 * @param {{
 *  authcb: function, The authcb method specifies a callback method to call on sdk authentication request return.
 *  logincb: function, The logincb method specifies a callback method to call on login request return.
 *  logoutcb: function, The logoutcb method specifies a callback method to call on logout request return.
 * }} opts
 * @return {ZoomAuth}
 */
  function init(opts) {
 
    var clientOpts = opts || {};

    // Private methods and variables
    var _addon = clientOpts.addon || null
    var _authcb = clientOpts.authcb || null
    var _logincb = clientOpts.logincb || null
    var _logoutcb = clientOpts.logoutcb || null
    var _isSDKAuthentication = false

    if (_addon){
        _addon.SetLoginCB(onLoginResult)
        _addon.SetLogoutCB(onLogOutResult)
    }

    function onAuthResult(result) {
        if (ZoomAuthResult.AUTHRET_SUCCESS == result) {
            _isSDKAuthentication = true
        } else {
            _isSDKAuthentication = false
        }
        if (null != _authcb)
            _authcb(result)
    }

    function onLoginResult(status) {
        if (null != _logincb)
            _logincb(status)
    }

    function onLogOutResult() {
        if (null != _logoutcb)
            _logoutcb()
    }

    return {
 
      // Public methods and variables
     /**
     * SDK Auth
     *  @param appkey: String,
     *  @param appsecret: String,
     * @return {ZoomSDKError}
     */
        SDKAuth: function (appkey, appsecret){
            if (_addon){
               return  _addon.SDKAuth(appkey, appsecret, onAuthResult)
            }

            return ZOOMSDKMOD_4AUTH.ZoomSDKError.SDKERR_UNINITIALIZE;
        },

     /**
     * Login
     * @param username: String
     * @param psw: String
     * @param rememberme: Boolean
     * @return {ZoomSDKError}
     */
        Login: function (username, psw, rememberme){
            if (_isSDKAuthentication && _addon)
                return _addon.Login(username, psw, rememberme)
            
            return _isSDKAuthentication ? ZOOMSDKMOD_4AUTH.ZoomSDKError.SDKERR_UNAUTHENTICATION : ZOOMSDKMOD_4AUTH.ZoomSDKError.SDKERR_UNINITIALIZE;
        },

     /**
     * Logout
     * @return {ZoomSDKError}
     */
        Logout: function (){
            if (_isSDKAuthentication && _addon)
                return _addon.Logout()

            return _isSDKAuthentication ? ZOOMSDKMOD_4AUTH.ZoomSDKError.SDKERR_UNAUTHENTICATION : ZOOMSDKMOD_4AUTH.ZoomSDKError.SDKERR_UNINITIALIZE;
        },
    };
 
  };
 
  return {
    /**
     * Get Zoom SDK Auth Service Module
     * @return {ZoomAuth}
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
  ZoomAuthResult: ZoomAuthResult,
  ZoomLoginStatus: ZoomLoginStatus,

  ZoomAuth: ZoomAuth,
}
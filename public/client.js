// Show joining Modal
$('#join_room_modal').modal('show', { backdrop: 'static', keyboard: false });



var constraints = {
    audio: true,
    video: {
        frameRate: {
            min: 1, ideal: 15, max: 30
        },
    }
};

// Global Variables
var roomName;
var userName;
var participants = {};
var students = [];
var is_screen_shared=false;

// User Information
var user_info = {
    id: null,       // Socket ID
    username: null, // User input name
    roomName: null, // User input room key
    role: null,     // Will be decided by server
    chat: true,     // Chat is allowed
    stream : null
}


console.clear();


// Let's do this
var socket = io();

/****************************************************************************
 *** Handle Message/Events
*****************************************************************************/
socket.on('message', message => {
    console.log('Message received: ' + message.event);

    switch (message.event) {
        case 'newParticipantArrived':
            receiveVideo(message.userid, message.username, message.role);
            break;

        case 'existingParticipants':
            onExistingParticipants(message.userid, message.existingUsers, message.role);
            break;

        case 'receiveVideoAnswer':
            onReceiveVideoAnswer(message.senderid, message.sdpAnswer);
            break;

        case 'candidate':
            addIceCandidate(message.userid, message.candidate);
            break;

        case 'chat':
            if(message.status)
                $('.chatting-wrapper').append(receive_msg_popup(message.text, message.name));
            else
                web_alert('Message not deliverd. You are blocked by teacher');
            console.log('Chat Message Received');
            break;

        case 'mic-cam-screen':
            console.clear();
            console.log('Someone turned off microphone/Camera/screen');
            console.log(participants);
            $.each(participants, function (key, value) {
                console.log('User : ' + message.userId);
                console.log('Serching in participant list');
                if (key == message.userId) {
                    console.log('participant found');
                    let pc = value.rtcPeer.peerConnection;
                    let sender = pc.getSenders();
                    // for camera
                    if (message.type == 'camera') {
                        console.log('participant camera event detected');
                        
                        let Vtrack  = sender[1].track;
                        Vtrack.enabled = message.status;
                        // Show/Hide Icons
                        if (message.status) {
                            console.log('participant camera status : true');
                            document.getElementById('video-cam-' + message.userId).style.display = 'block';
                            web_alert(message.name+"'s Camera enabled");
                        }
                        else {
                            console.log('participant camera status : false');
                            document.getElementById('video-cam-' + message.userId).style.display = 'none';
                            web_alert(message.name + "'s Camera disabled");
                        }
                    }
                    // for microphone
                    else if (message.type == 'microphone') {
                        console.log('participant microphone event detected');
                        let Atrack = sender[0].track;
                        Atrack.enabled = message.status;
                        if (message.status){
                            console.log('participant microphone status : true');
                            document.getElementById('video-mic-' + message.userId).style.display = 'block';
                            web_alert(message.name + "'s microphone un-muted");
                        }
                        else{
                            console.log('participant microphone status : false');
                            document.getElementById('video-mic-' + message.userId).style.display = 'none';
                            web_alert(message.name + "'s microphone muted");
                        }
                    }
                    // Screen Sharing
                    else if(message.type =='screen'){
                        if(message.status){
                            web_alert(message.name + " stopped screen sharing");
                        }else{
                            web_alert(message.name + " started screen sharing");
                        }
                    }
                }else{
                    console.log('Not found in participant list');
                }
            });
            break;

        case 'dashboard-activities':
            //##########################################################
            // Ban Chat for One User
            //##########################################################
            if (message.type == 'chat-ban-all') {
                web_alert(message.text);
            }
            //##########################################################
            // Ban Chat for One User
            //##########################################################
            else if (message.type=='chat-ban'){
                web_alert(message.text);
            }
            //##########################################################
            // Raise Hand
            //##########################################################
            else if (message.type == 'raise-hand') {
                if(message.permission){
                    $('.wave-hand-'+message.userId).addClass('active');
                    web_alert(message.name+' raised hand');
                }else{
                    $('.wave-hand-'+message.userId).removeClass('active');
                }
            }
            //##########################################################
            // Receieve Medal
            //##########################################################
            else if (message.type == 'send-recv-medal') {
                send_recv_medal(message.user, message.medal);
                web_alert(message.text);
            }
            break;

        case 'error':
            console.log(message.error);
            web_alert(message.error);
            break;

        case 'class-left':
            web_alert(message.name + ' left class');
            location.reload();
            break;

        case 'class-end':
            location.reload();
            break;

        case 'disconnected':
            try{
                $.each(participants, function (key, value) {
                    // If perticipent ID/Key is equal to SELF ID
                    if (key == message.userid) {
                        console.log(value);
                        delete participants[key];
                        $('.user-chat-' + message.userid + '').remove();
                        $('.user-video-' + message.userid + '').remove();
                        web_alert(message.name + ' left');
                    }
                });
            }catch(error){
                web_alert(message.name + ' left');
                web_alert(error.message);
            }
            break;

        case 'dont':
            console.log(message);
    }
});


function removeTrack(pc, stream) {
    pc.getSenders().forEach(function (sender) {
        stream.getTracks.forEach(function (track) {
            if (track == sender.track) {
                pc.removeTrack(sender);
            }
        })
    });
}

// Crate Video HTML
function genrate_video(userid, is_muted) {
    let html = `
                <div class="individual-class user-video-`+ userid + `">
                      <span class="delete-class kick-user" data-id="`+ userid + `"><img src="assets/img/times.svg" alt=""></span>
                      <div class="microphone-and-webcam">
                        <button id="video-mic-`+ userid + `" class="cmn-btn-design"><img src="assets/img/microphone-3.png" alt=""></button>
                        <button id="video-cam-`+ userid + `" class="cmn-btn-design"><img src="assets/img/webcam.png" alt=""></button>
                      </div>

                      <video id=`+ userid + ` ` + is_muted + ` autoplay class="videoContainer" poster="assets/img/img-1.png"></video>

                      <div class="v-crud-button">
                        <div class="v-crud-left">
                          <button data-id=`+ userid + ` data-medal="like" class="cmn-btn-design send-medal"><img src="assets/img/like.png" alt=""></button>
                          <button data-id=`+ userid + ` data-medal="heart" class="cmn-btn-design send-medal"><img src="assets/img/heart.png" alt=""></button>
                        </div>
                        <div class="v-crud-right">
                          <button data-id=`+ userid + ` data-medal="trophy" class="cmn-btn-design send-medal"><img src="assets/img/rating-trophi.png" alt=""></button>
                          <button data-id=`+ userid + ` data-medal="rating" class="cmn-btn-design send-medal"><img src="assets/img/rating-base.png" alt=""></button>
                        </div>
                      </div>
                  </div>`;
    return html;
}

// Create Student List HTML
function genrate_student_list(userid, userName) {
    html = `
    <tr class="user-chat-` + userid + `">
        <td>
            <div class="user-design place-2">
                <div class="user-img active-status"><img src="assets/img/user.png" alt="">
                </div> <span class="user-name">`+ userName + `</span>
            </div>
        </td>
        <td>
            <button class="waiving-in-table wave-hand-` + userid + `"><img src="assets/img/hand.svg" alt=""></button>
        </td>
        <td>
            <div class="table-action-btns">
                <div class="student-checkbox-btn">
                    <label data-id='`+ userid + `' data-name='` + userName + `' data-value="camera-ban"><i class="fal fa-eye-slash"></i></label>
                </div>
                <div class="student-checkbox-btn">
                    <label data-id='`+ userid + `' data-name='` + userName + `' data-value="microphone-ban"><i class="fal fa-microphone-slash"></i></label>
                </div>
                <div class="student-checkbox-btn">
                    <label data-id='`+ userid + `' data-name='` + userName + `' data-value="chat-ban"><i class="fal fa-comment-alt-slash"></i></label>
                </div>
            </div>
        </td>
    </tr>`;
    return html;
}

// Receieve Message HTML Popup
function receive_msg_popup(message, name) {
    let html = `
    <div class="chatting-row">
        <div class="msg-sender-thumb">
            <img src="assets/img/s-1.png" alt="">
        </div>
        <div class="msg-sender-text">
            <p class="font-weight-bold">`+ name + `:</p>
            <p>`+ message + `</p>
        </div>
    </div>`;
    return html;
}

// Send Message Popup
function send_msg_popup(message) {
    let html = `
    <div class="chatting-row reverse">
        <div class="msg-sender-text">
            <p class="font-weight-bold">Me:</p>
            <p>`+ message + `</p>
        </div>
        <div class="msg-sender-thumb">
            <img src="assets/img/s-1.png" alt="">
        </div>
    </div>`;
    return html;
}

// handlers functions
function receiveVideo(userid, username, role) {
    console.log(students);
    if (jQuery.inArray(userid, students)) {
        $('.user-video-' + userid).remove();
    }
    students.push(userid);

    let is_muted = '';
    $('#meetingRoom').append(genrate_video(userid, is_muted));
    // Append User Detail List
    $('.student-table tbody').append(genrate_student_list(userid, username + ' (' + role + ')'));
    let video = document.getElementById(userid);
    $('.individual-class').draggable();
    $('#videoContainer').draggable();
    $('.individual-class').resizable();

    var user = {
        id: userid,
        username: username,
        role: role,
        video: video,
        rtcPeer: null
    }

    participants[user.id] = user;

    var options = {
        remoteVideo: video,
        onicecandidate: onIceCandidate
    }

    /*******************************************************************************************
    1) Sent an SDP offer to a remote peer
    2) Received an SDP answer from the remote peer, and have the webRtcPeer process that answer.
    3) Exchanged ICE candidates between both peer, by sending the ones generated in the browser, 
        and processing the candidates received by the remote peer.
    ********************************************************************************************/

    // the library takes care of creating the RTCPeerConnection, 
    // and invoking getUserMedia in the browser if needed
    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options,
        function (err) {
            if (err) {
                return console.error(err);
            }
            //The only argument passed is a function, that will be invoked 
            //one the browser’s peer connection has generated that offer. 
            this.generateOffer(onOffer);
        }
    );

    var onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    // Send the candidate to the remote peer
    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

function onExistingParticipants(userid, existingUsers, role) {
    if (jQuery.inArray(userid, students)) {
        $('.user-video-' + userid).remove();
    }
    /******************************************************************** 
     * Add User video Locally
    *********************************************************************/
    let is_muted = 'muted';
    // Append User Video
    $('#meetingRoom').html('');
    $('#meetingRoom').prepend(genrate_video(userid, is_muted));
    // Append User Detail List
    $('.student-table tbody').html(genrate_student_list(userid, userName + ' ('+ role+')'));
    let video = document.getElementById(userid);
    $('.individual-class').draggable();
    $('#videoContainer').draggable();
    $('.individual-class').resizable();
    // Hide the loader
    loading(false, '');
    // Hide Room Join Modal
    $('#join_room_modal').modal('hide');
    // Hide/Show Buttons
    $('.start-class').hide();
    $('.end-class').removeClass('d-none');
    $('.end-class').show();
    // Start the timer
    meeting_clock();

    /********************************************************************
     * Store User Information & Send Data
    *********************************************************************/
    user_info.id       = userid;
    user_info.username = userName;
    user_info.role     = role;
    user_info.roomName = roomName;

    var user = {
        id: userid,
        username: userName,
        role : role,
        video: video,
        rtcPeer: null
    }

    participants[user.id] = user;

    var options = {
        localVideo: video,
        mediaConstraints: constraints,
        onicecandidate: onIceCandidate
    }

    user.rtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options,
        function (err) {
            if (err) {
                return console.error(err);
            }
            this.generateOffer(onOffer)
        }
    );

    existingUsers.forEach(function (element) {
        receiveVideo(element.id, element.name, element.role);
    });

    var onOffer = function (err, offer, wp) {
        console.log('sending offer');
        var message = {
            event: 'receiveVideoFrom',
            userid: user.id,
            roomName: roomName,
            sdpOffer: offer
        }
        sendMessage(message);
    }

    function onIceCandidate(candidate, wp) {
        console.log('sending ice candidates');
        var message = {
            event: 'candidate',
            userid: user.id,
            roomName: roomName,
            candidate: candidate
        }
        sendMessage(message);
    }
}

// We've made this function up sendOfferToRemotePeer(sdpOffer,
function onReceiveVideoAnswer(senderid, sdpAnswer) {
    participants[senderid].rtcPeer.processAnswer(sdpAnswer);
    console.log('Processing Answer');
}

function addIceCandidate(userid, candidate) {
    participants[userid].rtcPeer.addIceCandidate(candidate);
}

// utilities
function sendMessage(message) {
    console.log('sending ' + message.event + ' message to server');
    socket.emit('message', message);
}


/****************************************************************************
 *** Create/Join Room - [Complete]
*****************************************************************************/
$(document).on('submit', '.room-join-form', function () {
    event.preventDefault();
    let form = $(this);
    roomName = form[0].room_key.value;
    userName = form[0].fullname.value;

    if (roomName == undefined || userName == undefined) {
        web_alert('Room and Name are required!');
    } else {
        loading(true, '<i class="fal fa-spinner fa-spin"></i> Joining Class');

        var message = {
            event: 'joinRoom',
            userName: userName,
            roomName: roomName,
            chat: user_info.chat
        }
        sendMessage(message);
    }
});

/****************************************************************************
 *** [Chat Message] - [Complete]
*****************************************************************************/
$(document).on('submit', '.class-chat-form', function () {
    event.preventDefault();
    let reset_form = this;
    let form = $(this);
    let text = form[0].message.value;

    if (userName == undefined || roomName == undefined) {
        web_alert('Join Room First');
        return false;
    }

    $('.chatting-wrapper').append(send_msg_popup(text));
    reset_form.reset();
    var message = {
        event: 'chat',
        room: roomName,
        text: text,
        name: userName
    }
    sendMessage(message);
});

/****************************************************************************
 *** Ban Chat For All Users - [Complete]
*****************************************************************************/
$(document).on('click', '.forbidden-chat-btn', function () {
    if (user_info.id == null || user_info.id == undefined)
        return false;
    if (user_info.role != 'Teacher') {
        web_alert('Only Teacher can block chat');
        return false;
    }

    let permission = true;
    // Update button status
    if ($(this).hasClass('banned')) {
        $(this).removeClass('banned');
        $('.forbidden-chat-btn i').removeClass('fa-comment-alt-slash');
        $('.forbidden-chat-btn i').addClass('fa-comment-alt');
        permission = true;
    } else {
        $(this).addClass('banned');
        $('.forbidden-chat-btn i').removeClass('fa-comment-alt');
        $('.forbidden-chat-btn i').addClass('fa-comment-alt-slash');
        permission = false;
    }

    message = {
        event: 'dashboard-activities',
        type: 'chat-ban-all',
        room: roomName,
        permission: permission,
        role: user_info.role
    };
    sendMessage(message);
});

/****************************************************************************
 *** [End Class]
*****************************************************************************/
$(document).on('click', '.end-class', function () {
    if (user_info.role == 'Teacher') {
        var message = {
            event: 'end-class',
            room: roomName
        }
        sendMessage(message);
    } else {
        var message = {
            event: 'disconnected',
            room: roomName,
            name: userName,
            role: user_info.role
        }
        sendMessage(message);
    }
});

/****************************************************************************
 *** Block Student (Video) | (Mic) | (Chat)
*****************************************************************************/
$(document).ready(function () {
    $(document).on('click', '.student-table .student-checkbox-btn label', function () {
        let status;
        let message = {};
        let name = $(this).data('name');
        let user = $(this).data('id');
        let type = $(this).data('value');

        // [Un-Checked]
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            status = true; // Allowed
        }
        // [Checked]
        else {
            $(this).addClass('active');
            status = false; // Blocked
        }

        // [Check Events]
        if (type == 'chat-ban') {
            if (user_info.role != null && user_info.role == 'Teacher') {
                message = {
                    event: 'dashboard-activities',
                    type: type,
                    status: status, // If check then [Block] otherwise [Unblock],
                    userId: user,
                    room: roomName,
                    name: name,
                    role: user_info.role
                };
                sendMessage(message);
            } else {
                $(this).removeClass('active');
                web_alert('Only teacher can perform this action');
                return false;
            }
        }
        else if (type == 'microphone-ban') {
            if (user_info.id == user) {
                $(this).removeClass('active');
                web_alert('You cannot apply this option for yourself');
                return false;
            } else {
                if (!status) {
                    $("video#" + user).prop('muted', true);
                    web_alert('user muted successfully');
                } else {
                    $("video#" + user).prop('muted', false);
                    web_alert('user un-muted successfully');
                }
            }
        }
        else if (type == 'camera-ban') {
            if (!status) {
                $(".user-video-" + user).hide();
                web_alert('user hidden successfully');
            } else {
                $(".user-video-" + user).show();
                web_alert('user show successfully');
            }
        } else {
            web_alert('Event not detected!');
        }

    });
});

/****************************************************************************
 *** [Remove User]
*****************************************************************************/
$(document).on('click', '.kick-user', function () {
    if(user_info.role=='Teacher'){
        if (confirm('Are you sure you want to remove this user from class?')) {
            let user = $(this).data('id');
            console.log(user);
            let message = {
                event: 'dashboard-activities',
                type: 'remove-user',
                userId: user,
                room: roomName
            };
            sendMessage(message);
            web_alert('<i class="fas fa-spinner fa-spin"></i> Removing User');
        }
    }else{
        web_alert('Only teacher can perform this action');
    }
});

/****************************************************************************
 *** [Mute user(SELF) Microphone/Camera]
*****************************************************************************/
$(document).on('change', '.custom-footer-checkbox input[type="checkbox"]', function () {
    console.clear();
    console.log(this.value);
    let actions = { event: 'mic-cam-screen', type: this.value, status: true, room: roomName, name: userName };
    if ($(this).prop('checked')) {
        // Hide Video
        if (this.value == 'camera')
            constraints.video = false;
        // Mite Microphone
        if (this.value == 'microphone')
            constraints.audio = false;
        // Screen Share
        if (this.value == 'screen') {
            stop_camera_and_start_screen_sharing();
            actions.status = false;
            sendMessage(actions);
            return false;
        }
        // Set status
        actions.status = false;
        sendMessage(actions);
    } else {
        // Show Video
        if (this.value == 'camera') {
            constraints.video = { frameRate: { min: 1, ideal: 15, max: 30 } };
        }
        // UnMute Microphone
        if (this.value == 'microphone')
            constraints.audio = true;
        // Screen
        if (this.value == 'screen') {
            stop_screen_sharing_and_play_camera();
            actions.status = true;
            sendMessage(actions);
            return false;
        }
        // Set Status & send message
        actions.status = true;
        sendMessage(actions);
    }

    /*  if (user.rtcPeer!=null)
          user.rtcPeer.dispose();
      
      */
});

// [Event] when click on stop screen share 
function on_stop_screen_sharing() {
    $('.custom-footer-checkbox input[type="checkbox"]#footer-screen').prop("checked", false);
    stop_screen_sharing_and_play_camera();
}

// Stop [Screen Share] & Play [Camera]
function stop_screen_sharing_and_play_camera() {
    try {
        if (user_info.id != null && roomName != undefined) {
            getMediaStream(function (cameraStream) {
                let tracks = cameraStream.getVideoTracks();
                $.each(participants, function (key, value) {
                    // If perticipent ID/Key is equal to SELF ID
                    if (key == user_info.id) {
                        let video = document.getElementById(user_info.id);
                        // Set share screen stream
                        video.srcObject = cameraStream;
                        // Get User Peer Connection
                        let pc = value.rtcPeer.peerConnection;
                        // Get Sender List
                        let sender = pc.getSenders();
                        // Stop Video Track [Camera Video] - purpose is to stop camera & turn off camera light
                        let video_cam = sender[1].track;
                        video_cam.stop();
                        // Replace [Camera track] with [Screen track}
                        sender[1].replaceTrack(tracks[0]);
                        is_screen_shared = true;
                    }
                });
            });
        } else {
            web_alert('Meeting not started yet');
        }
    } catch (error) {
        web_alert(error.message);
    }
}

// Stop [Camera] & Play [Stop Screen]
function stop_camera_and_start_screen_sharing() {
    try {
        if (user_info.id != null && roomName != undefined) {
            getScreenStream(function (screenStream) {
                let tracks = screenStream.getVideoTracks();
                $.each(participants, function (key, value) {
                    // If perticipent ID/Key is equal to SELF ID
                    if (key == user_info.id) {
                        let video = document.getElementById(user_info.id);
                        // Set share screen stream
                        video.srcObject = screenStream;
                        // Get User Peer Connection
                        let pc = value.rtcPeer.peerConnection;
                        // Get Sender List
                        let sender = pc.getSenders();
                        // Stop Video Track [Camera Video] - purpose is to stop camera & turn off camera light
                        let video_cam = sender[1].track;
                        video_cam.stop();
                        // Add event listener to stop screen sharing
                        tracks[0].addEventListener('ended', on_stop_screen_sharing);
                        // Replace [Camera track] with [Screen track}
                        sender[1].replaceTrack(tracks[0]);
                    }
                });
            });
        } else {
            web_alert('Meeting not started yet');
        }
    } catch (error) {
        web_alert(error.message);
    }
}

/****************************************************************************
 *** [Medals] 
*****************************************************************************/
$(document).on('click', '.individual-class .send-medal', function () {
    let user = $(this).data('id');
    let medal = $(this).data('medal');
    send_recv_medal(user, medal);

    let message = {
        event: 'dashboard-activities',
        type: 'send-recv-medal',
        medal: medal,
        userId: user,
        room: roomName
    };
    sendMessage(message);
});

function get_video_position(video_id) {
    var leftPos = $("video#" + video_id)[0].getBoundingClientRect().left + $(window)['scrollLeft']();
    //var rightPos = $("video")[0].getBoundingClientRect().right + $(window)['scrollLeft']();
    var topPos = $("video#" + video_id)[0].getBoundingClientRect().top + $(window)['scrollTop']();
    //var bottomPos = $("video")[0].getBoundingClientRect().bottom + $(window)['scrollTop']();
    return { left: leftPos, top: topPos };
}

function send_recv_medal(user, medal){
    let pos = get_video_position(user);
    $('.medals .' + medal).css('z-index', '1000000');
    $('.medals .' + medal).css('opacity', '1');
    $('.medals .' + medal).css('display', 'block');
    $('.medals .' + medal).animate({ 
        top: pos.top + ($("video#" + user).height() / 2) + "px", 
        left: pos.left + ($("video#" + user).width() / 2) + "px" ,
        width: 60+"px",
        height:60+"px"
    }, 1500);
    //$('.medals .' + medal).css("transform", "scale(3)");

    setTimeout(function () {
        reset_medal(medal);
    }, 2000);
}

function reset_medal(medal) {
    $('.medals .' + medal).css('z-index', '1');
    $('.medals .' + medal).css('display', 'none');
    $('.medals .' + medal).animate({
        top: 50+"%",
        left: 50 + "%",
        width: 300 + "px",
        height: 300 + "px"
    }, 0);
}



/****************************************************************************
 *** Raise Hand - [Complete]
*****************************************************************************/
$(document).on('click', '.weaving-had a', function () {
    if (userName == undefined || roomName == undefined) {
        web_alert('You must join meeting first');
        return false;
    }

    let status = false;
    if ($(this).hasClass('active')) {
        status = true;
    }

    message = {
        event: 'dashboard-activities',
        type: 'raise-hand',
        room: roomName,
        permission: status,
        name: userName
    };
    sendMessage(message);
});

































let timer_count_seconds=0;
let timer_count_min=0;
let meeting_timer =0;

let meeting_clock = () => setInterval(function () {
    timer_count_seconds++;
    if (timer_count_seconds==60){
        timer_count_min++;
        timer_count_seconds=0;
    }
    if (timer_count_min<10)
        meeting_timer = "0" + timer_count_min;
    else
        meeting_timer = timer_count_min;

    meeting_timer+=" : ";

    if (timer_count_seconds < 10)
        meeting_timer += "0" + timer_count_seconds;
    else
        meeting_timer += timer_count_seconds;
    $('.class-timer .meeting-time-counter').val(meeting_timer);
}, 1000);



/*
(function () {
    window.getScreenId = function (callback) {
        if (!!navigator.mozGetUserMedia) {
            callback(null, 'firefox', {
                audio: true,
                video: {
                    mozMediaSource: 'window',
                    mediaSource: 'window'
                },
                optional: []
            });
            return;
        }
        postMessage();
        window.addEventListener('message', onIFrameCallback);

        function onIFrameCallback(event) {
            if (!event.data) return;

            if (event.data.chromeMediaSourceId) {
                if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                    callback('permission-denied');
                } else callback(null, event.data.chromeMediaSourceId, getScreenConstraints(null, event.data.chromeMediaSourceId));
            }

            if (event.data.chromeExtensionStatus) {
                callback(event.data.chromeExtensionStatus, null, getScreenConstraints(event.data.chromeExtensionStatus));
            }

            // this event listener is no more needed
            window.removeEventListener('message', onIFrameCallback);
        }
    };

    function getScreenConstraints(error, sourceId) {
        var screen_constraints = {
            audio: true,
            video: {
                mandatory: {
                    chromeMediaSource: error ? 'screen' : 'desktop',
                    maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                    maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
                },
                optional: []
            }
        };

        if (sourceId) {
            screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
        }

        return screen_constraints;
    }

    function postMessage() {
        if (!iframe) {
            loadIFrame(postMessage);
            return;
        }

        if (!iframe.isLoaded) {
            setTimeout(postMessage, 100);
            return;
        }

        iframe.contentWindow.postMessage({
            captureSourceId: true
        }, '*');
    }

    function loadIFrame(loadCallback) {
        if (iframe) {
            loadCallback();
            return;
        }

        iframe = document.createElement('iframe');
        iframe.onload = function () {
            iframe.isLoaded = true;

            loadCallback();
        };
        iframe.src = 'http://localhost:3030'; // https://wwww.yourdomain.com/getScreenId.html
        iframe.style.display = 'none';
        (document.body || document.documentElement).appendChild(iframe);
    }

    var iframe;

    // this function is used in v3.0

    window.getScreenConstraints = function (sendSource, callback) {
        loadIFrame(function () {
            getScreenId(function (error, sourceId, screen_constraints) {
                callback(error, screen_constraints);
            });
        });
    };

})();
*/

var alert_timer;
function web_alert ( message )  {
    clearTimeout(alert_timer);
    html = `<div class="alert alert-success alert-dismissible">
                <button type="button" class="close" data-dismiss="alert">&times;</button>
               `+ message +`
            </div>`;
    
    $('.web-alert').html(html);
    alert_timer = setTimeout(() => {
        $('.web-alert').html('');
    }, 3000);
}






function getScreenStream(callback) {
    if (navigator.getDisplayMedia) {
        navigator.getDisplayMedia({
            video: true
        }).then(screenStream => {
            callback(screenStream);
        });
    } else if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia({
            video: true
        }).then(screenStream => {
            callback(screenStream);
        });
    } else {
        getScreenId(function (error, sourceId, screen_constraints) {
            navigator.mediaDevices.getUserMedia(screen_constraints).then(function (screenStream) {
                callback(screenStream);
            });
        });
    }
}

function getMediaStream(callback){
    //I don't usually like to overwrite publicly accessible variables, but that's just me
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    var cameraStream;

    getUserMedia.call(navigator, {
        video: true
    }, function (stream) {
            callback(stream);
    });
}

// requires
const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var kurento = require('kurento-client');
var minimist = require('minimist');
var bodyParser = require('body-parser');
var cors = require('cors');
const shortid = require('shortid');


app.use(bodyParser.json({ limit: '5mb' }));
// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


var class_rooms_list = [];


// Genrate Rooms
app.post('/room', function (req, res) {
    // Validate Request
    if (req.body.role === undefined || req.body.role===''){
        res.status(400).send({ response: false, message: 'Invalid parameters sent in request', data: {}});
        return false;
    }
    else if (req.body.role === 0) {
        res.status(401).send({ response: false, message: 'Students are not allowed to create room', data: {}});
        return false;
    }

    let role = req.body.role;

    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let created_date = date + '-' + month + '-' + year;

    genrate_room(role ,function(err, room_id){
        try {
            if (err){
                res.status(400).send({ response: false, message: err, data: {} });

            }else{
                // Send Response
                let room_info = {
                    room_id: room_id,
                    status: false,
                    role: role,
                    t_pass: shortid.generate(),
                    s_pass: shortid.generate(),
                    created_date: created_date
                }
                class_rooms_list[room_id] = room_info;
                res.status(200).send({ response: true, message: 'Room created successully', data: room_info });
            }
        } catch (error) {
            res.status(400).send({ response: false, message: error.message, data: {} });
        }
    });
});


function genrate_room(role, callback){
    shortid.seed(1000);
    try {
        let room_id = shortid.generate();
        // Check if the genrated ID exist in room
        for (i in class_rooms_list) {
            if (i == room_id) {
                genrate_room(role, callback);
            }
        }
        callback(null, room_id);
    } catch (error) {
        callback(error.message);
    }
}






// variables
var kurentoClient = null;
var iceCandidateQueues = {};

// constants
var argv = minimist(process.argv.slice(2), {
    default: {
        as_uri: 'http://localhost:3000/',
        ws_uri: 'ws://alletutor.com:8888/kurento'
    }
});

// express routing
app.use(express.static('public'));

// signaling
io.on('connection', function (socket) {
    console.log('a user connected: ' + socket.id);

    socket.on('message', function (message) {
        console.log('Message received: ', message.event);

        switch (message.event) {
            case 'joinRoom':
                joinRoom(socket, message.userName, message.roomName, message.chat, err => {
                    if (err) {
                        console.log(err);
                    }
                });
                break;

            case 'receiveVideoFrom':
                receiveVideoFrom(socket, message.userid, message.roomName, message.sdpOffer, err => {
                    if (err) {
                        console.log(err);
                    }
                });
                break;

            case 'candidate':
                addIceCandidate(socket, message.userid, message.roomName, message.candidate, err => {
                    if (err) {
                        console.log(err);
                    }
                });
                break;
            
            case 'chat':
                // Get user information
                let user = io.sockets.adapter.rooms[message.room].participants[socket.id];
                // If user not blocked
                if(user.chat){
                    // Send Message in room
                    socket.in(message.room).emit('message', {
                        event: 'chat',
                        name: message.name,
                        text: message.text,
                        status: true
                    });
                }else{
                    // Send message to user and tell [Your chat options is blocked]
                    socket.emit('message',{
                        event: 'chat',
                        status: false 
                    });
                }
                break;
            
            case 'mic-cam-screen':
                console.log(message.room);
               /* let user_sc = io.sockets.adapter.rooms[message.room].participants[socket.id];
                console.log(user_sc.outgoingMedia.release());*/
               // console.log();
                // Send Message in room
                socket.in(message.room).emit('message', {
                    event: 'mic-cam-screen',
                    type: message.type,
                    status: message.status,
                    userId: socket.id,
                    name : message.name
                });
                // Send Message to User
                socket.emit('message', {
                    event: 'mic-cam-screen',
                    type: message.type,
                    status: message.status,
                    userId: socket.id,
                    name: message.name
                });
                break

            case 'dashboard-activities':
                console.log('=== dashboard activity ===');
                console.log("Event: "+message.type);
                try {
                    let dashboard_user = io.sockets.adapter.rooms[message.room].participants[socket.id];
                    //##########################################################
                    // Ban Chat for everyone
                    //##########################################################
                    if (message.type == 'chat-ban-all' && dashboard_user.role == 'Teacher') {
                        set_chat_permissions_for_all(socket, message.room, message.permission);
                    }
                    //##########################################################
                    // Ban Chat For Specific User
                    //##########################################################
                    else if (message.type == 'chat-ban' && dashboard_user.role == 'Teacher') {
                        set_chat_permissions_for_user(socket, message.room, message.userId, message.status, message.name)
                    }
                    //##########################################################
                    // User Raise Hand
                    //##########################################################
                    else if (message.type == 'raise-hand') {
                        socket.in(message.room).emit('message', {
                            event: 'dashboard-activities',
                            type: 'raise-hand',
                            name: message.name,
                            userId: socket.id,
                            permission: message.permission
                        });
                        socket.emit('message', {
                            event: 'dashboard-activities',
                            type: 'raise-hand',
                            name: message.name,
                            userId: socket.id,
                            permission: message.permission
                        });
                    }
                    //##########################################################
                    // Medals
                    //##########################################################
                    else if(message.type == 'send-recv-medal'){
                        socket.in(message.room).to(message.userId).emit('message', {
                            event: 'dashboard-activities',
                            type: 'send-recv-medal',
                            text: 'Received medal from ' + dashboard_user.name,
                            medal: message.medal,
                            user: message.userId
                        });
                    }
                    //##########################################################
                    // Remove User
                    //##########################################################
                    else if (message.type == 'remove-user') {
                        // Send Message in room
                        try {
                            socket.in(message.room).to(message.userId).emit('message', {
                                event: 'class-end',
                                userid: message.userId,
                                name: message.name,
                                role: message.role
                            });
                            console.log("Status: Success");
                        } catch (error) {
                            socket.emit('message', {
                                event: 'error',
                                error: error.message
                            });
                            console.log("Status: Error");
                            console.log("Message: "+error.message);
                        }
                    }
                    //##########################################################
                    // Un-Authorized Access by student
                    //##########################################################
                    else {
                        console.log("Result : Invalid Access");
                        // Send to Sender
                        socket.emit('message', {
                            event: 'dashboard-activities',
                            type: 'chat-ban',
                            text: 'Only teacher can perform this action'
                        });
                    }
                } catch (error) {
                    socket.emit('message', {
                        event: 'error',
                        error: error.message
                    });
                }
                break;
            
            case 'end-class':
                // Send Message in room
                socket.in(message.room).emit('message', {
                    event: 'class-end',
                    userid: socket.id,
                    name: message.name,
                    role: message.role
                });
                // Send Message to user
                socket.emit('message', {
                    event: 'class-end',
                    userid: socket.id,
                    name: message.name,
                    role: message.role
                });
                // Destro Connection
                if(io.sockets.adapter.rooms[message.room]){
                    delete io.sockets.adapter.rooms[message.room];
                }
                break;

            case 'disconnected':
                // Send Message in room
                socket.in(message.room).emit('message', {
                    event: 'disconnected',
                    userid: socket.id,
                    name: message.name,
                    role: message.role
                });
                // Send Message in room
                socket.emit('message', {
                    event: 'class-left',
                    userid: socket.id,
                    name: message.name,
                    role: message.role
                });
                // Remove user
                remove_user_from_server_list(socket, message.room);
                break;
        }
    });

    socket.on('disconnecting', function (reason) {
        console.log(reason);
        console.log('Socket disconnecting: ' + socket.id);
        try {
            var id = socket.id;
            Object.keys(socket.rooms).forEach(function (key) {
                if (key != id) {
                    let room = socket.rooms[key];
                    let user = io.sockets.adapter.rooms[room].participants[id];
                    console.log('Room Left : ' + room);
                    // Send Message in room
                    socket.in(room).emit('message', {
                        event: 'disconnected',
                        userid: socket.id,
                        name: user.name,
                        role: user.role
                    });
                    // Delete participant
                    remove_user_from_server_list(socket, room);
                }
            });
        } catch (error) {
            console.log('');
        }
        
    });


    socket.on('disconnect', () => {
        console.log('Socket disconnected: ' + socket.id);
    })
});

// Remove user from server list
function remove_user_from_server_list(socket, room){
    // remove from list
    if (io.sockets.adapter.rooms[room] && io.sockets.adapter.rooms[room].participants[socket.id])
        delete io.sockets.adapter.rooms[room].participants[socket.id];
    // clear from queue
    if (iceCandidateQueues[socket.id]) {
        delete iceCandidateQueues[socket.id];
    }
    // Remove from socker
    socket.leave(room);
}

// Block-UnBlock [User] Chat
function set_chat_permissions_for_user(socket, room, userId, permission, name){
    try {
        let user = io.sockets.adapter.rooms[room].participants[userId];
        user.chat = permission;

        let status = (permission) ? "Un Blocked" : "Blocked";
        // Send to targer
        socket.in(room).to(userId).emit('message', {
            event: 'dashboard-activities',
            type: 'chat-ban',
            text: user.name + ' chat has been ' + status + ' by Teacher'
        });
        // Send to Sender
        socket.emit('message', {
            event: 'dashboard-activities',
            type: 'chat-ban',
            text: user.name + ' chat ' + status + ' successfully'
        });
    } catch (error) {
        socket.emit('message', {
            event: 'error',
            error: error.message
        });
        console.log("Result : " + error.message);
    }
}

// Block [All Users] chat
function set_chat_permissions_for_all(socket, room, permission){
    try {
        let users = io.sockets.adapter.rooms[room].participants;
        for (let i in users) {
            users[i].chat = permission;
        }

        let status = (permission) ? "un-banned" : "banned";

        socket.in(room).emit('message', {
            event: 'dashboard-activities',
            type: 'chat-ban-all',
            text: 'Chat ' + status + ' for everyone in room'
        });
        socket.emit('message', {
            event: 'dashboard-activities',
            type: 'chat-ban-all',
            text: 'Chat ' + status + ' for everyone in room'
        });
        console.log("Result : Success");
    } catch (error) {
        socket.emit('message', {
            event: 'error',
            error: error.message
        });
        console.log("Result : " + error.message);
    }
}

// signaling functions
function joinRoom(socket, username, roomname, chatPermission, callback) {
    // roomType ? is new or already exist
    getRoom(socket, roomname, (err, myRoom, roomType) => {
        if (err) {
            return callback(err);
        }

        myRoom.pipeline.create('WebRtcEndpoint', (err, outgoingMedia) => {
            if (err) {
                return callback(err);
            }
            // is admin or user
            let role = (roomType=='new') ? 'Teacher' : 'Student';

            // User Data
            var user = {
                id: socket.id,
                name: username,
                chat: chatPermission,
                role: role,
                outgoingMedia: outgoingMedia,
                incomingMedia: {}
            }

            let iceCandidateQueue = iceCandidateQueues[user.id];
            if (iceCandidateQueue) {
                while (iceCandidateQueue.length) {
                    let ice = iceCandidateQueue.shift();
                    console.error(`user: ${user.name} collect candidate for outgoing media`);
                    user.outgoingMedia.addIceCandidate(ice.candidate);
                }
            }

            user.outgoingMedia.on('OnIceCandidate', event => {
                let candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
                socket.emit('message', {
                    event: 'candidate',
                    userid: user.id,
                    candidate: candidate
                });
            });

            socket.to(roomname).emit('message', {
                event: 'newParticipantArrived', 
                userid: user.id,
                role : role,
                username: user.name
            });

            let existingUsers = [];
            for (let i in myRoom.participants) {
                if (myRoom.participants[i].id != user.id) {
                    existingUsers.push({
                        id: myRoom.participants[i].id,
                        name: myRoom.participants[i].name,
                        role: myRoom.participants[i].role,
                        chat: myRoom.participants[i].chat,
                    });
                }
            }

            socket.emit('message', {
                event: 'existingParticipants', 
                existingUsers: existingUsers,
                userid: user.id,
                role : role,
            });

            myRoom.participants[user.id] = user;
        });
    });
}

function receiveVideoFrom(socket, userid, roomname, sdpOffer, callback) {
    getEndpointForUser(socket, roomname, userid, (err, endpoint) => {
        if (err) {
            return callback(err);
        }

        endpoint.processOffer(sdpOffer, (err, sdpAnswer) => {
            if (err) {
                return callback(err);
            }

            socket.emit('message', {
                event: 'receiveVideoAnswer',
                senderid: userid,
                sdpAnswer: sdpAnswer
            });

            endpoint.gatherCandidates(err => {
                if (err) {
                    return callback(err);
                }
            });
        });
    })
}

function addIceCandidate(socket, senderid, roomname, iceCandidate, callback) {
    let user = io.sockets.adapter.rooms[roomname].participants[socket.id];
    if (user != null) {
        let candidate = kurento.register.complexTypes.IceCandidate(iceCandidate);
        if (senderid == user.id) {
            if (user.outgoingMedia) {
                user.outgoingMedia.addIceCandidate(candidate);
            } else {
                iceCandidateQueues[user.id].push({candidate: candidate});
            }
        } else {
            if (user.incomingMedia[senderid]) {
                user.incomingMedia[senderid].addIceCandidate(candidate);
            } else {
                if (!iceCandidateQueues[senderid]) {
                    iceCandidateQueues[senderid] = [];
                }
                iceCandidateQueues[senderid].push({candidate: candidate});
            }   
        }
        callback(null);
    } else {
        callback(new Error("addIceCandidate failed"));
    }
}

// useful functions
function getRoom(socket, roomname, callback) {
    var myRoom = io.sockets.adapter.rooms[roomname] || { length: 0 };
    var numClients = myRoom.length;
    var roomType = null; // is new or already exist

    console.log(roomname, ' has ', numClients, ' clients');

    if (numClients == 0) {
        socket.join(roomname, () => {
            myRoom = io.sockets.adapter.rooms[roomname];
            getKurentoClient((error, kurento) => {
                kurento.create('MediaPipeline', (err, pipeline) => {
                    if (error) {
                        return callback(err);
                    }
                    myRoom.pipeline = pipeline;
                    myRoom.participants = {};
                    roomType = 'new';
                    callback(null, myRoom, roomType);
                });
            });
        });
    } else {
        socket.join(roomname);
        roomType='exist';
        callback(null, myRoom, roomType);
    }
}

function getEndpointForUser(socket, roomname, senderid, callback) {
    var myRoom = io.sockets.adapter.rooms[roomname];
    var asker = myRoom.participants[socket.id];
    var sender = myRoom.participants[senderid];

    if (asker.id === sender.id) {
        return callback(null, asker.outgoingMedia);
    }

    if (asker.incomingMedia[sender.id]) {
        sender.outgoingMedia.connect(asker.incomingMedia[sender.id], err => {
            if (err) {
                return callback(err);
            }
            callback(null, asker.incomingMedia[sender.id]);
        });
    } else {
        myRoom.pipeline.create('WebRtcEndpoint', (err, incoming) => {
            if (err) {
                return callback(err);
            }

            asker.incomingMedia[sender.id] = incoming;

            let iceCandidateQueue = iceCandidateQueues[sender.id];
            if (iceCandidateQueue) {
                while (iceCandidateQueue.length) {
                    let ice = iceCandidateQueue.shift();
                    console.error(`user: ${sender.name} collect candidate for outgoing media`);
                    incoming.addIceCandidate(ice.candidate);
                }
            }

            incoming.on('OnIceCandidate', event => {
                let candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
                socket.emit('message', {
                    event: 'candidate',
                    userid: sender.id,
                    candidate: candidate
                });
            });

            sender.outgoingMedia.connect(incoming, err => {
                if (err) {
                    return callback(err);
                }
                callback(null, incoming);
            });
        });
    }
}

function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(argv.ws_uri, function (error, _kurentoClient) {
        if (error) {
            console.log("Could not find media server at address " + argv.ws_uri);
            return callback("Could not find media server at address" + argv.ws_uri
                + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

// listen
http.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
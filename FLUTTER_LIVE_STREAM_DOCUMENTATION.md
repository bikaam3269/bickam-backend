# Flutter Live Stream API Documentation

## Overview
This documentation covers the complete Live Stream API integration for Flutter, including both Vendor and User flows.

## Base URL
```
https://your-api-domain.com/api/v1/live-streams
```

## Authentication
All authenticated endpoints require a Bearer token in the header:
```dart
headers: {
  'Authorization': 'Bearer $token',
  'Content-Type': 'application/json',
}
```

---

## Models

### LiveStream Model
```dart
class LiveStream {
  final int id;
  final int vendorId;
  final String title;
  final String? description;
  final String channelName;
  final String? agoraToken;
  final String status; // 'scheduled', 'live', 'ended', 'cancelled'
  final DateTime? scheduledAt;
  final DateTime? startedAt;
  final DateTime? endedAt;
  final int viewerCount;
  final int likesCount;
  final bool userLiked;
  final Vendor? vendor;
  final DateTime createdAt;
  final DateTime updatedAt;

  LiveStream({
    required this.id,
    required this.vendorId,
    required this.title,
    this.description,
    required this.channelName,
    this.agoraToken,
    required this.status,
    this.scheduledAt,
    this.startedAt,
    this.endedAt,
    required this.viewerCount,
    required this.likesCount,
    required this.userLiked,
    this.vendor,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LiveStream.fromJson(Map<String, dynamic> json) {
    return LiveStream(
      id: json['id'],
      vendorId: json['vendorId'],
      title: json['title'],
      description: json['description'],
      channelName: json['channelName'],
      agoraToken: json['agoraToken'],
      status: json['status'],
      scheduledAt: json['scheduledAt'] != null 
          ? DateTime.parse(json['scheduledAt']) 
          : null,
      startedAt: json['startedAt'] != null 
          ? DateTime.parse(json['startedAt']) 
          : null,
      endedAt: json['endedAt'] != null 
          ? DateTime.parse(json['endedAt']) 
          : null,
      viewerCount: json['viewerCount'] ?? 0,
      likesCount: json['likesCount'] ?? 0,
      userLiked: json['userLiked'] ?? false,
      vendor: json['vendor'] != null 
          ? Vendor.fromJson(json['vendor']) 
          : null,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}

class Vendor {
  final int id;
  final String name;
  final String? email;
  final String type;
  final String? logoImage;

  Vendor({
    required this.id,
    required this.name,
    this.email,
    required this.type,
    this.logoImage,
  });

  factory Vendor.fromJson(Map<String, dynamic> json) {
    return Vendor(
      id: json['id'],
      name: json['name'],
      email: json['email'],
      type: json['type'],
      logoImage: json['logoImage'],
    );
  }
}
```

### LiveStreamMessage Model
```dart
class LiveStreamMessage {
  final int id;
  final int liveStreamId;
  final int userId;
  final String message;
  final User? user;
  final DateTime createdAt;

  LiveStreamMessage({
    required this.id,
    required this.liveStreamId,
    required this.userId,
    required this.message,
    this.user,
    required this.createdAt,
  });

  factory LiveStreamMessage.fromJson(Map<String, dynamic> json) {
    return LiveStreamMessage(
      id: json['id'],
      liveStreamId: json['liveStreamId'],
      userId: json['userId'],
      message: json['message'],
      user: json['user'] != null ? User.fromJson(json['user']) : null,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}

class User {
  final int id;
  final String name;
  final String type;

  User({
    required this.id,
    required this.name,
    required this.type,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      type: json['type'],
    );
  }
}
```

### TokenResponse Model
```dart
class TokenResponse {
  final String token;
  final String channelName;
  final int uid;
  final String role;

  TokenResponse({
    required this.token,
    required this.channelName,
    required this.uid,
    required this.role,
  });

  factory TokenResponse.fromJson(Map<String, dynamic> json) {
    return TokenResponse(
      token: json['data']['token'],
      channelName: json['data']['channelName'],
      uid: json['data']['uid'],
      role: json['data']['role'],
    );
  }
}
```

---

## API Service Class

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class LiveStreamService {
  final String baseUrl;
  final String? token;

  LiveStreamService({
    required this.baseUrl,
    this.token,
  });

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (token != null) 'Authorization': 'Bearer $token',
  };

  // ==================== VENDOR FLOW ====================

  /// Create a new live stream (Vendor only)
  Future<LiveStream> createLiveStream({
    required String title,
    String? description,
    DateTime? scheduledAt,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/live-streams'),
      headers: _headers,
      body: jsonEncode({
        'title': title,
        if (description != null) 'description': description,
        if (scheduledAt != null) 'scheduledAt': scheduledAt.toIso8601String(),
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return LiveStream.fromJson(data['data']);
    } else {
      throw Exception('Failed to create live stream: ${response.body}');
    }
  }

  /// Start a live stream (Vendor only)
  Future<LiveStream> startLiveStream(int liveStreamId) async {
    final response = await http.put(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/start'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return LiveStream.fromJson(data['data']);
    } else {
      throw Exception('Failed to start live stream: ${response.body}');
    }
  }

  /// End a live stream (Vendor only)
  Future<LiveStream> endLiveStream(int liveStreamId) async {
    final response = await http.put(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/end'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return LiveStream.fromJson(data['data']);
    } else {
      throw Exception('Failed to end live stream: ${response.body}');
    }
  }

  /// Get vendor's live streams
  Future<List<LiveStream>> getVendorLiveStreams(int vendorId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/live-streams/vendor/$vendorId'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['data'] as List)
          .map((item) => LiveStream.fromJson(item))
          .toList();
    } else {
      throw Exception('Failed to get vendor live streams: ${response.body}');
    }
  }

  // ==================== USER FLOW ====================

  /// Get all active live streams
  Future<List<LiveStream>> getActiveLiveStreams() async {
    final response = await http.get(
      Uri.parse('$baseUrl/live-streams'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['data'] as List)
          .map((item) => LiveStream.fromJson(item))
          .toList();
    } else {
      throw Exception('Failed to get active live streams: ${response.body}');
    }
  }

  /// Get a specific live stream by ID
  Future<LiveStream> getLiveStream(int id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/live-streams/$id'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return LiveStream.fromJson(data['data']);
    } else {
      throw Exception('Failed to get live stream: ${response.body}');
    }
  }

  /// Join a live stream
  Future<void> joinLiveStream(int liveStreamId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/join'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to join live stream: ${response.body}');
    }
  }

  /// Leave a live stream
  Future<void> leaveLiveStream(int liveStreamId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/leave'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to leave live stream: ${response.body}');
    }
  }

  /// Get Agora token for joining live stream
  Future<TokenResponse> getLiveStreamToken(
    int liveStreamId, {
    String role = 'subscriber', // 'publisher' or 'subscriber'
  }) async {
    final response = await http.get(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/token?role=$role'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return TokenResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to get token: ${response.body}');
    }
  }

  // ==================== MESSAGES ====================

  /// Send a message in live stream
  Future<LiveStreamMessage> sendMessage(
    int liveStreamId,
    String message,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/messages'),
      headers: _headers,
      body: jsonEncode({'message': message}),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return LiveStreamMessage.fromJson(data['data']);
    } else {
      throw Exception('Failed to send message: ${response.body}');
    }
  }

  /// Get messages for a live stream
  Future<List<LiveStreamMessage>> getMessages(
    int liveStreamId, {
    int limit = 50,
    int offset = 0,
  }) async {
    final response = await http.get(
      Uri.parse(
        '$baseUrl/live-streams/$liveStreamId/messages?limit=$limit&offset=$offset',
      ),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['data'] as List)
          .map((item) => LiveStreamMessage.fromJson(item))
          .toList();
    } else {
      throw Exception('Failed to get messages: ${response.body}');
    }
  }

  /// Delete a message
  Future<void> deleteMessage(int liveStreamId, int messageId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/messages/$messageId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to delete message: ${response.body}');
    }
  }

  // ==================== LIKES ====================

  /// Toggle like on live stream
  Future<Map<String, dynamic>> toggleLike(int liveStreamId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/like'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to toggle like: ${response.body}');
    }
  }

  /// Get likes count for a live stream
  Future<int> getLikesCount(int liveStreamId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/live-streams/$liveStreamId/likes'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data']['likesCount'];
    } else {
      throw Exception('Failed to get likes count: ${response.body}');
    }
  }
}
```

---

## Vendor Flow (Complete Example)

### 1. Create Live Stream
```dart
// Create a live stream immediately
final liveStreamService = LiveStreamService(
  baseUrl: 'https://your-api-domain.com/api/v1',
  token: userToken,
);

try {
  final liveStream = await liveStreamService.createLiveStream(
    title: 'My Live Stream',
    description: 'Welcome to my live stream!',
  );
  
  print('Live stream created: ${liveStream.id}');
  print('Status: ${liveStream.status}'); // Should be 'live'
} catch (e) {
  print('Error: $e');
}

// Or create a scheduled live stream
try {
  final scheduledTime = DateTime.now().add(Duration(hours: 2));
  final liveStream = await liveStreamService.createLiveStream(
    title: 'Scheduled Live Stream',
    description: 'Join me in 2 hours!',
    scheduledAt: scheduledTime,
  );
  
  print('Scheduled live stream created: ${liveStream.id}');
  print('Status: ${liveStream.status}'); // Should be 'scheduled'
} catch (e) {
  print('Error: $e');
}
```

### 2. Start Live Stream (if scheduled)
```dart
try {
  final liveStream = await liveStreamService.startLiveStream(liveStreamId);
  print('Live stream started: ${liveStream.status}'); // Should be 'live'
} catch (e) {
  print('Error: $e');
}
```

### 3. Get Agora Token (Publisher)
```dart
try {
  final tokenResponse = await liveStreamService.getLiveStreamToken(
    liveStreamId,
    role: 'publisher', // Vendor is publisher
  );
  
  print('Token: ${tokenResponse.token}');
  print('Channel: ${tokenResponse.channelName}');
  
  // Use token with Agora SDK
  await agoraEngine.joinChannel(
    tokenResponse.token,
    tokenResponse.channelName,
    tokenResponse.uid,
    ChannelMediaOptions(
      clientRoleType: ClientRoleType.clientRoleBroadcaster,
    ),
  );
} catch (e) {
  print('Error: $e');
}
```

### 4. End Live Stream
```dart
try {
  final liveStream = await liveStreamService.endLiveStream(liveStreamId);
  print('Live stream ended: ${liveStream.status}'); // Should be 'ended'
} catch (e) {
  print('Error: $e');
}
```

### Complete Vendor Flow Widget
```dart
import 'package:flutter/material.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';

class VendorLiveStreamScreen extends StatefulWidget {
  @override
  _VendorLiveStreamScreenState createState() => _VendorLiveStreamScreenState();
}

class _VendorLiveStreamScreenState extends State<VendorLiveStreamScreen> {
  final liveStreamService = LiveStreamService(
    baseUrl: 'https://your-api-domain.com/api/v1',
    token: userToken,
  );
  
  LiveStream? currentLiveStream;
  RtcEngine? agoraEngine;
  bool isStreaming = false;

  @override
  void initState() {
    super.initState();
    _initializeAgora();
  }

  Future<void> _initializeAgora() async {
    agoraEngine = createAgoraRtcEngine();
    await agoraEngine!.initialize(const RtcEngineContext(
      appId: 'YOUR_AGORA_APP_ID',
    ));
    
    await agoraEngine!.enableVideo();
    await agoraEngine!.startPreview();
  }

  Future<void> _createAndStartLiveStream() async {
    try {
      // Create live stream
      final liveStream = await liveStreamService.createLiveStream(
        title: 'My Live Stream',
        description: 'Welcome!',
      );
      
      setState(() {
        currentLiveStream = liveStream;
      });

      // Get publisher token
      final tokenResponse = await liveStreamService.getLiveStreamToken(
        liveStream.id,
        role: 'publisher',
      );

      // Join Agora channel
      await agoraEngine!.joinChannel(
        token: tokenResponse.token,
        channelId: tokenResponse.channelName,
        uid: tokenResponse.uid,
        options: const ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleBroadcaster,
          channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
        ),
      );

      setState(() {
        isStreaming = true;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  Future<void> _endLiveStream() async {
    try {
      await agoraEngine!.leaveChannel();
      await liveStreamService.endLiveStream(currentLiveStream!.id);
      
      setState(() {
        isStreaming = false;
        currentLiveStream = null;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Live Stream')),
      body: Column(
        children: [
          // Agora video view
          Expanded(
            child: isStreaming
                ? AgoraVideoView(
                    controller: VideoViewController(
                      rtcEngine: agoraEngine!,
                      canvas: const VideoCanvas(uid: 0),
                    ),
                  )
                : Center(child: Text('Not streaming')),
          ),
          
          // Controls
          Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton(
                  onPressed: isStreaming ? null : _createAndStartLiveStream,
                  child: Text('Start Stream'),
                ),
                ElevatedButton(
                  onPressed: isStreaming ? _endLiveStream : null,
                  child: Text('End Stream'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    agoraEngine?.leaveChannel();
    agoraEngine?.release();
    super.dispose();
  }
}
```

---

## User Flow (Complete Example)

### 1. Get Active Live Streams
```dart
final liveStreamService = LiveStreamService(
  baseUrl: 'https://your-api-domain.com/api/v1',
  token: userToken, // Optional, but recommended for userLiked status
);

try {
  final liveStreams = await liveStreamService.getActiveLiveStreams();
  
  for (var stream in liveStreams) {
    print('${stream.title} - ${stream.viewerCount} viewers');
    print('Likes: ${stream.likesCount}');
  }
} catch (e) {
  print('Error: $e');
}
```

### 2. Get Specific Live Stream
```dart
try {
  final liveStream = await liveStreamService.getLiveStream(liveStreamId);
  print('Title: ${liveStream.title}');
  print('Vendor: ${liveStream.vendor?.name}');
  print('Viewers: ${liveStream.viewerCount}');
} catch (e) {
  print('Error: $e');
}
```

### 3. Join Live Stream
```dart
try {
  await liveStreamService.joinLiveStream(liveStreamId);
  print('Joined live stream');
} catch (e) {
  print('Error: $e');
}
```

### 4. Get Agora Token (Subscriber)
```dart
try {
  final tokenResponse = await liveStreamService.getLiveStreamToken(
    liveStreamId,
    role: 'subscriber', // User is subscriber
  );
  
  // Use token with Agora SDK
  await agoraEngine.joinChannel(
    tokenResponse.token,
    tokenResponse.channelName,
    tokenResponse.uid,
    ChannelMediaOptions(
      clientRoleType: ClientRoleType.clientRoleAudience,
    ),
  );
} catch (e) {
  print('Error: $e');
}
```

### 5. Send Message
```dart
try {
  final message = await liveStreamService.sendMessage(
    liveStreamId,
    'Hello everyone!',
  );
  print('Message sent: ${message.message}');
} catch (e) {
  print('Error: $e');
}
```

### 6. Get Messages
```dart
try {
  final messages = await liveStreamService.getMessages(
    liveStreamId,
    limit: 50,
    offset: 0,
  );
  
  for (var msg in messages) {
    print('${msg.user?.name}: ${msg.message}');
  }
} catch (e) {
  print('Error: $e');
}
```

### 7. Toggle Like
```dart
try {
  final result = await liveStreamService.toggleLike(liveStreamId);
  print('Liked: ${result['liked']}');
  print('Likes count: ${result['likesCount']}');
} catch (e) {
  print('Error: $e');
}
```

### 8. Leave Live Stream
```dart
try {
  await liveStreamService.leaveLiveStream(liveStreamId);
  print('Left live stream');
} catch (e) {
  print('Error: $e');
}
```

### Complete User Flow Widget
```dart
import 'package:flutter/material.dart';
import 'package:agora_rtc_engine/agora_rtc_engine.dart';

class UserLiveStreamScreen extends StatefulWidget {
  final int liveStreamId;

  UserLiveStreamScreen({required this.liveStreamId});

  @override
  _UserLiveStreamScreenState createState() => _UserLiveStreamScreenState();
}

class _UserLiveStreamScreenState extends State<UserLiveStreamScreen> {
  final liveStreamService = LiveStreamService(
    baseUrl: 'https://your-api-domain.com/api/v1',
    token: userToken,
  );
  
  LiveStream? liveStream;
  RtcEngine? agoraEngine;
  List<LiveStreamMessage> messages = [];
  final TextEditingController messageController = TextEditingController();
  bool isJoined = false;
  int likesCount = 0;
  bool userLiked = false;

  @override
  void initState() {
    super.initState();
    _loadLiveStream();
    _initializeAgora();
    _startPolling();
  }

  Future<void> _loadLiveStream() async {
    try {
      final stream = await liveStreamService.getLiveStream(widget.liveStreamId);
      setState(() {
        liveStream = stream;
        likesCount = stream.likesCount;
        userLiked = stream.userLiked;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading stream: $e')),
      );
    }
  }

  Future<void> _initializeAgora() async {
    agoraEngine = createAgoraRtcEngine();
    await agoraEngine!.initialize(const RtcEngineContext(
      appId: 'YOUR_AGORA_APP_ID',
    ));
    
    agoraEngine!.registerEventHandler(
      RtcEngineEventHandler(
        onUserJoined: (uid, elapsed) {
          print('User joined: $uid');
        },
        onUserOffline: (uid, reason) {
          print('User offline: $uid');
        },
        onJoinChannelSuccess: (channel, uid, elapsed) {
          print('Joined channel: $channel');
          setState(() {
            isJoined = true;
          });
        },
      ),
    );
  }

  Future<void> _joinLiveStream() async {
    try {
      // Join via API
      await liveStreamService.joinLiveStream(widget.liveStreamId);
      
      // Get token
      final tokenResponse = await liveStreamService.getLiveStreamToken(
        widget.liveStreamId,
        role: 'subscriber',
      );

      // Join Agora channel
      await agoraEngine!.joinChannel(
        token: tokenResponse.token,
        channelId: tokenResponse.channelName,
        uid: tokenResponse.uid,
        options: const ChannelMediaOptions(
          clientRoleType: ClientRoleType.clientRoleAudience,
          channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
        ),
      );

      // Load messages
      await _loadMessages();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error joining: $e')),
      );
    }
  }

  Future<void> _loadMessages() async {
    try {
      final msgs = await liveStreamService.getMessages(widget.liveStreamId);
      setState(() {
        messages = msgs.reversed.toList(); // Reverse to show newest at bottom
      });
    } catch (e) {
      print('Error loading messages: $e');
    }
  }

  Future<void> _sendMessage() async {
    if (messageController.text.trim().isEmpty) return;

    try {
      await liveStreamService.sendMessage(
        widget.liveStreamId,
        messageController.text.trim(),
      );
      messageController.clear();
      await _loadMessages();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error sending message: $e')),
      );
    }
  }

  Future<void> _toggleLike() async {
    try {
      final result = await liveStreamService.toggleLike(widget.liveStreamId);
      setState(() {
        userLiked = result['liked'];
        likesCount = result['likesCount'];
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error toggling like: $e')),
      );
    }
  }

  Future<void> _leaveLiveStream() async {
    try {
      await agoraEngine!.leaveChannel();
      await liveStreamService.leaveLiveStream(widget.liveStreamId);
      setState(() {
        isJoined = false;
      });
    } catch (e) {
      print('Error leaving: $e');
    }
  }

  void _startPolling() {
    // Poll for new messages every 2 seconds
    Future.delayed(Duration(seconds: 2), () {
      if (isJoined) {
        _loadMessages();
        _loadLiveStream(); // Update viewer count and likes
      }
      _startPolling();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (liveStream == null) {
      return Scaffold(
        appBar: AppBar(title: Text('Loading...')),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(liveStream!.title),
        actions: [
          IconButton(
            icon: Icon(userLiked ? Icons.favorite : Icons.favorite_border),
            color: userLiked ? Colors.red : null,
            onPressed: _toggleLike,
          ),
          Text('$likesCount'),
          SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Video view
          Expanded(
            flex: 2,
            child: isJoined
                ? AgoraVideoView(
                    controller: VideoViewController.remote(
                      rtcEngine: agoraEngine!,
                      canvas: VideoCanvas(uid: liveStream!.vendorId),
                      connection: RtcConnection(channelId: liveStream!.channelName),
                    ),
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Live Stream'),
                        SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _joinLiveStream,
                          child: Text('Join Stream'),
                        ),
                      ],
                    ),
                  ),
          ),
          
          // Stream info
          Container(
            padding: EdgeInsets.all(8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Text('👁️ ${liveStream!.viewerCount}'),
                Text('❤️ $likesCount'),
                Text('📺 ${liveStream!.status}'),
              ],
            ),
          ),
          
          // Messages
          Expanded(
            flex: 1,
            child: Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    itemCount: messages.length,
                    itemBuilder: (context, index) {
                      final msg = messages[index];
                      return ListTile(
                        title: Text(
                          msg.user?.name ?? 'Unknown',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(msg.message),
                        trailing: Text(
                          '${msg.createdAt.hour}:${msg.createdAt.minute.toString().padLeft(2, '0')}',
                          style: TextStyle(fontSize: 12),
                        ),
                      );
                    },
                  ),
                ),
                
                // Message input
                Container(
                  padding: EdgeInsets.all(8),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: messageController,
                          decoration: InputDecoration(
                            hintText: 'Type a message...',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.send),
                        onPressed: _sendMessage,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _leaveLiveStream();
    agoraEngine?.release();
    messageController.dispose();
    super.dispose();
  }
}
```

---

## Error Handling

```dart
class LiveStreamException implements Exception {
  final String message;
  final int? statusCode;

  LiveStreamException(this.message, [this.statusCode]);

  @override
  String toString() => 'LiveStreamException: $message (Status: $statusCode)';
}

// Usage in service
Future<LiveStream> createLiveStream({
  required String title,
  String? description,
  DateTime? scheduledAt,
}) async {
  final response = await http.post(
    Uri.parse('$baseUrl/live-streams'),
    headers: _headers,
    body: jsonEncode({
      'title': title,
      if (description != null) 'description': description,
      if (scheduledAt != null) 'scheduledAt': scheduledAt.toIso8601String(),
    }),
  );

  final data = jsonDecode(response.body);

  if (response.statusCode == 201) {
    return LiveStream.fromJson(data['data']);
  } else {
    throw LiveStreamException(
      data['message'] ?? 'Failed to create live stream',
      response.statusCode,
    );
  }
}

// Usage in widget
try {
  final liveStream = await liveStreamService.createLiveStream(
    title: 'My Stream',
  );
} on LiveStreamException catch (e) {
  if (e.statusCode == 400) {
    // Bad request - show validation error
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(e.message)),
    );
  } else if (e.statusCode == 403) {
    // Forbidden - user is not a vendor
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Only vendors can create live streams')),
    );
  } else if (e.statusCode == 401) {
    // Unauthorized - redirect to login
    Navigator.pushReplacementNamed(context, '/login');
  } else {
    // Other errors
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('An error occurred: ${e.message}')),
    );
  }
} catch (e) {
  // Unexpected errors
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text('Unexpected error: $e')),
  );
}
```

---

## Required Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  http: ^1.1.0
  agora_rtc_engine: ^6.3.0
  flutter:
    sdk: flutter
```

---

## API Endpoints Summary

### Vendor Endpoints (Require Vendor/Admin Role)
- `POST /live-streams` - Create live stream
- `PUT /live-streams/:id/start` - Start live stream
- `PUT /live-streams/:id/end` - End live stream
- `GET /live-streams/vendor/:vendorId` - Get vendor's live streams
- `GET /live-streams/:id/token?role=publisher` - Get publisher token

### User Endpoints
- `GET /live-streams` - Get active live streams
- `GET /live-streams/:id` - Get specific live stream
- `POST /live-streams/:id/join` - Join live stream
- `POST /live-streams/:id/leave` - Leave live stream
- `GET /live-streams/:id/token?role=subscriber` - Get subscriber token
- `POST /live-streams/:id/messages` - Send message
- `GET /live-streams/:id/messages` - Get messages
- `DELETE /live-streams/:id/messages/:messageId` - Delete message
- `POST /live-streams/:id/like` - Toggle like
- `GET /live-streams/:id/likes` - Get likes count

---

## Notes

1. **Authentication**: Most endpoints require authentication. Use `optionalAuthenticate` for public endpoints.
2. **Role Validation**: Only vendors can be publishers. Users are always subscribers.
3. **Status Flow**: `scheduled` → `live` → `ended`
4. **Real-time Updates**: Consider using WebSockets or polling for real-time message and viewer count updates.
5. **Agora Integration**: Make sure to initialize Agora SDK with your App ID before using tokens.

---

## Testing Checklist

### Vendor Flow
- [ ] Create live stream (immediate)
- [ ] Create scheduled live stream
- [ ] Start scheduled live stream
- [ ] Get publisher token
- [ ] Join Agora channel as publisher
- [ ] End live stream
- [ ] Get vendor's live streams list

### User Flow
- [ ] Get active live streams list
- [ ] Get specific live stream details
- [ ] Join live stream
- [ ] Get subscriber token
- [ ] Join Agora channel as subscriber
- [ ] Send message
- [ ] Get messages
- [ ] Toggle like
- [ ] Get likes count
- [ ] Leave live stream

---

## Support

For issues or questions, please contact the development team.


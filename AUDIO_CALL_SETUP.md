# Audio call infrastructure

The application now loads ICE configuration from `chat_api.php?action=call_config`.
STUN works without extra configuration, but reliable calls across mobile carriers and
restricted Wi-Fi networks require a TURN server.

## Recommended coturn configuration

Run coturn on a host with a public IP and configure a shared secret:

```ini
fingerprint
use-auth-secret
static-auth-secret=REPLACE_WITH_A_LONG_RANDOM_SECRET
realm=worship.pmstudio.am
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535
no-multicast-peers
no-loopback-peers
```

Open UDP/TCP `3478`, TCP/TLS `5349`, and the UDP relay range
`49152-65535`. A valid TLS certificate is recommended for `turns:` URLs.

Configure the PHP runtime with:

```text
WORSHIP_TURN_URLS=turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp,turns:turn.example.com:5349?transport=tcp
WORSHIP_TURN_SECRET=THE_SAME_SHARED_SECRET
```

The API generates one-hour, user-scoped TURN credentials. Do not put the shared
secret in frontend JavaScript. Static credentials are supported only as a fallback
through `WORSHIP_TURN_USERNAME` and `WORSHIP_TURN_CREDENTIAL`.

Optional custom STUN servers can be set with a comma-separated
`WORSHIP_STUN_URLS` value.

## PWA limitation

An installed PWA can receive an incoming-call push, but iOS and Android may suspend
WebRTC while the app is closed or backgrounded. The media connection starts after
the user opens the app. Native CallKit/ConnectionService behavior requires a native
wrapper and platform-specific VoIP integration.

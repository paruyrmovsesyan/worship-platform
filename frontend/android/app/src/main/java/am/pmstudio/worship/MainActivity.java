package am.pmstudio.worship;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.media.AudioDeviceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewRenderProcess;
import android.webkit.WebViewRenderProcessClient;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private AudioFocusRequest callAudioFocusRequest;
    private boolean callAudioActive = false;
    private boolean callUsesSpeaker = false;
    private boolean isBackgroundAudioAllowed = false;
    private int lastSafeTopDp = 0;
    private int lastSafeBottomDp = 0;
    private final Handler callAudioHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void attachBaseContext(Context newBase) {
        Configuration config = new Configuration(newBase.getResources().getConfiguration());
        if (config.fontScale != 1.0f) {
            config.fontScale = 1.0f;
            Context context = newBase.createConfigurationContext(config);
            super.attachBaseContext(context);
            return;
        }
        super.attachBaseContext(newBase);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            settings.setTextZoom(100);
            settings.setMediaPlaybackRequiresUserGesture(false);
            webView.addJavascriptInterface(new NativeAudioBridge(), "NativeAudio");
            webView.addJavascriptInterface(new NativeRuntimeBridge(), "NativeRuntime");
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

            View decorView = getWindow().getDecorView();
            ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
                Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
                );
                Insets nav = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
                float density = Math.max(1f, getResources().getDisplayMetrics().density);
                lastSafeTopDp = Math.round(bars.top / density);
                lastSafeBottomDp = Math.round(nav.bottom / density);
                injectSafeAreaInsets();
                return windowInsets;
            });
            ViewCompat.requestApplyInsets(decorView);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                webView.setWebViewRenderProcessClient(new WebViewRenderProcessClient() {
                    private long lastRecoveryAt = 0L;

                    @Override
                    public void onRenderProcessUnresponsive(
                        @NonNull WebView view,
                        @Nullable WebViewRenderProcess renderer
                    ) {
                        long now = System.currentTimeMillis();
                        if (now - lastRecoveryAt < 60_000L) return;
                        lastRecoveryAt = now;

                        view.post(() -> {
                            if (renderer != null && renderer.terminate()) {
                                recreate();
                            } else {
                                view.reload();
                            }
                        });
                    }

                    @Override
                    public void onRenderProcessResponsive(
                        @NonNull WebView view,
                        @Nullable WebViewRenderProcess renderer
                    ) {
                        // No action needed once the renderer responds again.
                    }
                });
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().getSettings().setTextZoom(100);
            injectSafeAreaInsets();
        }
    }

    private void injectSafeAreaInsets() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        final String js = "document.documentElement.style.setProperty('--native-safe-top','"
            + lastSafeTopDp + "px');"
            + "document.documentElement.style.setProperty('--native-safe-bottom','"
            + lastSafeBottomDp + "px');";
        WebView webView = getBridge().getWebView();
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private final class NativeRuntimeBridge {
        @JavascriptInterface
        public boolean hasFirebase() {
            try {
                Class<?> firebaseAppClass = Class.forName("com.google.firebase.FirebaseApp");
                java.lang.reflect.Method getAppsMethod = firebaseAppClass.getMethod("getApps", Context.class);
                Object apps = getAppsMethod.invoke(null, getApplicationContext());
                if (apps instanceof java.util.List) {
                    return !((java.util.List<?>) apps).isEmpty();
                }
            } catch (Throwable ignored) {
                return false;
            }
            return false;
        }

        @JavascriptInterface
        public String getChannelStatusJson() {
            org.json.JSONObject result = new org.json.JSONObject();
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (nm != null) {
                        for (android.app.NotificationChannel ch : nm.getNotificationChannels()) {
                            boolean enabled = ch.getImportance() != NotificationManager.IMPORTANCE_NONE;
                            result.put(ch.getId(), enabled);
                        }
                    }
                }
            } catch (Throwable ignored) {}
            return result.toString();
        }

        @JavascriptInterface
        public void openChannelSettings(String channelId) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent();
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && channelId != null && !channelId.isEmpty()) {
                        intent.setAction(android.provider.Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
                        intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName());
                        intent.putExtra(android.provider.Settings.EXTRA_CHANNEL_ID, channelId);
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        intent.setAction(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                        intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, getPackageName());
                    } else {
                        intent.setAction(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(android.net.Uri.parse("package:" + getPackageName()));
                    }
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Throwable e) {
                    e.printStackTrace();
                }
            });
        }
    }

    private final class NativeAudioBridge {
        @JavascriptInterface
        public void setCallAudioMode(String command) {
            runOnUiThread(() -> updateCallAudioMode(command));
        }

        @JavascriptInterface
        public void setBackgroundAudioActive(boolean active) {
            isBackgroundAudioAllowed = active;
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (isBackgroundAudioAllowed || callAudioActive) {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().onResume();
            }
        }
    }

    private void updateCallAudioMode(String command) {
        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return;

        if ("stop".equals(command)) {
            callAudioActive = false;
            callUsesSpeaker = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            } else {
                audioManager.setSpeakerphoneOn(false);
            }
            abandonCallAudioFocus(audioManager);
            callAudioHandler.removeCallbacksAndMessages(null);
            audioManager.setMode(AudioManager.MODE_NORMAL);
            return;
        }

        callAudioActive = true;
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        requestCallAudioFocus(audioManager);
        if ("speaker".equals(command)) callUsesSpeaker = true;
        if ("earpiece".equals(command)) callUsesSpeaker = false;
        applyCallAudioRoute(audioManager);
        scheduleCallAudioRouteEnforcement(audioManager);
    }

    private void applyCallAudioRoute(AudioManager audioManager) {
        if (!callAudioActive) return;
        boolean useSpeaker = callUsesSpeaker;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AudioDeviceInfo currentDevice = audioManager.getCommunicationDevice();
            if (!useSpeaker && currentDevice != null && isBluetoothAudioDevice(currentDevice)) return;
            int targetType = useSpeaker
                ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
            for (AudioDeviceInfo device : audioManager.getAvailableCommunicationDevices()) {
                if (device.getType() == targetType) {
                    if (audioManager.setCommunicationDevice(device)) return;
                    break;
                }
            }
            if (!useSpeaker) audioManager.clearCommunicationDevice();
        }
        audioManager.setSpeakerphoneOn(useSpeaker);
    }

    private void scheduleCallAudioRouteEnforcement(AudioManager audioManager) {
        callAudioHandler.removeCallbacksAndMessages(null);
        long[] delays = {150L, 600L, 1200L};
        for (long delay : delays) {
            callAudioHandler.postDelayed(() -> applyCallAudioRoute(audioManager), delay);
        }
    }

    private void requestCallAudioFocus(AudioManager audioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (callAudioFocusRequest == null) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build();
                callAudioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(attributes)
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener(focus -> {
                        if (focus == AudioManager.AUDIOFOCUS_GAIN && callAudioActive) {
                            runOnUiThread(() -> {
                                AudioManager manager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                                if (manager != null) applyCallAudioRoute(manager);
                            });
                        }
                    })
                    .build();
            }
            audioManager.requestAudioFocus(callAudioFocusRequest);
        } else {
            audioManager.requestAudioFocus(
                focus -> { },
                AudioManager.STREAM_VOICE_CALL,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            );
        }
    }

    private void abandonCallAudioFocus(AudioManager audioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && callAudioFocusRequest != null) {
            audioManager.abandonAudioFocusRequest(callAudioFocusRequest);
        }
    }

    private boolean isBluetoothAudioDevice(AudioDeviceInfo device) {
        int type = device.getType();
        return type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            || type == AudioDeviceInfo.TYPE_BLE_HEADSET
            || type == AudioDeviceInfo.TYPE_BLE_SPEAKER;
    }
}

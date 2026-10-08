package am.pmstudio.worship;

import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewRenderProcess;
import android.webkit.WebViewRenderProcessClient;
import android.view.WindowManager;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private AudioFocusRequest callAudioFocusRequest;
    private boolean callAudioActive = false;
    private boolean callUsesSpeaker = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        getBridge().getWebView().addJavascriptInterface(new NativeAudioBridge(), "NativeAudio");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            WebView webView = getBridge().getWebView();
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
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
        } else {
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }

    private final class NativeAudioBridge {
        @JavascriptInterface
        public void setCallAudioMode(String command) {
            runOnUiThread(() -> updateCallAudioMode(command));
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
            audioManager.setMode(AudioManager.MODE_NORMAL);
            return;
        }

        callAudioActive = true;
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        requestCallAudioFocus(audioManager);
        if ("speaker".equals(command)) callUsesSpeaker = true;
        if ("earpiece".equals(command)) callUsesSpeaker = false;
        boolean useSpeaker = callUsesSpeaker;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AudioDeviceInfo currentDevice = audioManager.getCommunicationDevice();
            if (!useSpeaker && currentDevice != null && isBluetoothAudioDevice(currentDevice)) return;
            int targetType = useSpeaker
                ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
            for (AudioDeviceInfo device : audioManager.getAvailableCommunicationDevices()) {
                if (device.getType() == targetType) {
                    audioManager.setCommunicationDevice(device);
                    return;
                }
            }
        } else {
            audioManager.setSpeakerphoneOn(useSpeaker);
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
                            runOnUiThread(() -> updateCallAudioMode(callUsesSpeaker ? "speaker" : "earpiece"));
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

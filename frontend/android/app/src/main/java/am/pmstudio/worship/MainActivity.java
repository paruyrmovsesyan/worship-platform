package am.pmstudio.worship;

import android.content.Context;
import android.media.AudioDeviceInfo;
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice();
            } else {
                audioManager.setSpeakerphoneOn(false);
            }
            audioManager.setMode(AudioManager.MODE_NORMAL);
            return;
        }

        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        if ("start".equals(command)) return;
        boolean useSpeaker = "speaker".equals(command);
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

    private boolean isBluetoothAudioDevice(AudioDeviceInfo device) {
        int type = device.getType();
        return type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
            || type == AudioDeviceInfo.TYPE_BLE_HEADSET
            || type == AudioDeviceInfo.TYPE_BLE_SPEAKER;
    }
}

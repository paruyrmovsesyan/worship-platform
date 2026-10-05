package am.pmstudio.worship;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
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
}

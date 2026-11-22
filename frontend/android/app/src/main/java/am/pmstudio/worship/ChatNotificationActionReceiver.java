package am.pmstudio.worship;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class ChatNotificationActionReceiver extends BroadcastReceiver {

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final String API_URL = "https://worship.pmstudio.am/chat_push_action_api.php";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        String chatId = intent.getStringExtra("chat_id");
        String userId = intent.getStringExtra("user_id");
        String sig = intent.getStringExtra("sig");
        String ts = intent.getStringExtra("ts");
        int notificationId = intent.getIntExtra("notification_id", 0);
        String senderTitle = intent.getStringExtra("sender_title");

        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (WorshipFirebaseMessagingService.ACTION_MARK_READ.equals(action)) {
            // Dismiss notification immediately from status bar
            if (notificationManager != null && notificationId != 0) {
                notificationManager.cancel(notificationId);
            }

            // Post mark_read to server in background thread
            executor.execute(() -> {
                sendActionRequest("mark_read", chatId, userId, sig, ts, null);
            });
            return;
        }

        if (WorshipFirebaseMessagingService.ACTION_REPLY.equals(action)) {
            Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
            CharSequence replyText = null;
            if (remoteInput != null) {
                replyText = remoteInput.getCharSequence(WorshipFirebaseMessagingService.KEY_TEXT_REPLY);
            }

            if (replyText != null && replyText.length() > 0) {
                String replyString = replyText.toString().trim();

                // Update notification in-place to show "Replied: <text>" feedback
                if (notificationManager != null && notificationId != 0) {
                    NotificationCompat.Builder repliedBuilder =
                        new NotificationCompat.Builder(context, "worship-chat")
                            .setSmallIcon(R.drawable.ic_stat_notification)
                            .setColor(Color.parseColor("#9D72FF"))
                            .setContentTitle(senderTitle != null ? senderTitle : "Worship Platform")
                            .setContentText("Ուղարկված է՝ " + replyString)
                            .setTimeoutAfter(3000)
                            .setAutoCancel(true);
                    notificationManager.notify(notificationId, repliedBuilder.build());
                }

                // Send reply to chat in background thread
                executor.execute(() -> {
                    sendActionRequest("reply", chatId, userId, sig, ts, replyString);
                });
            }
        }
    }

    private void sendActionRequest(
        String action,
        String chatId,
        String userId,
        String sig,
        String ts,
        String message
    ) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(API_URL);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setDoOutput(true);

            JSONObject body = new JSONObject();
            body.put("action", action);
            body.put("chat_id", Integer.parseInt(chatId));
            body.put("user_id", Integer.parseInt(userId));
            body.put("sig", sig);
            if (ts != null) body.put("ts", Long.parseLong(ts));
            if (message != null) body.put("message", message);

            byte[] out = body.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(out);
            }

            int code = conn.getResponseCode();
            // Connection success
        } catch (Throwable e) {
            e.printStackTrace();
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
